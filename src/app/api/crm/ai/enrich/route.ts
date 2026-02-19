import { NextRequest, NextResponse } from "next/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "update", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const { contact_id } = body as { contact_id: string };

    if (!contact_id) {
      return NextResponse.json({ success: false, error: "contact_id required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Fetch the contact
    const { data: contact, error: fetchErr } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone, title, source, metadata, company_id, companies(name, website, industry)")
      .eq("id", contact_id)
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .single();

    if (fetchErr || !contact) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    const name = `${contact.first_name} ${contact.last_name || ""}`.trim();
    const email = contact.email || "";
    const domain = email.includes("@") ? email.split("@")[1] : "";
    const company = contact.companies as unknown as { name?: string; website?: string; industry?: string } | null;

    const prompt = `You are a CRM data enrichment assistant. Given the following contact information, provide enriched data.

Contact:
- Name: ${name}
- Email: ${email}
- Domain: ${domain}
- Current Job Title: ${contact.title || "unknown"}
- Company: ${company?.name || "unknown"}
- Company Website: ${company?.website || "unknown"}
- Company Industry: ${company?.industry || "unknown"}

Based on the name, email domain, and any available information, suggest realistic enrichments. If the email domain is a generic provider (gmail, yahoo, hotmail, outlook), note that.

Respond ONLY with valid JSON (no markdown, no comments), in this exact format:
{
  "suggested_title": "string or null if unknown",
  "suggested_company": "string or null if unknown",
  "suggested_industry": "string or null if unknown",
  "suggested_linkedin_url": "string or null",
  "suggested_location": "string or null",
  "confidence": "high" | "medium" | "low",
  "notes": "brief note about data quality"
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_completion_tokens: 512,
      stream: false,
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    // Parse JSON from the response (handle possible markdown wrapping)
    let enriched;
    try {
      const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      enriched = JSON.parse(jsonStr);
    } catch {
      logger.warn("AiEnrich", "Failed to parse AI response", raw);
      return NextResponse.json({
        success: false,
        error: "AI returned invalid response",
      }, { status: 502 });
    }

    // Auto-apply high-confidence enrichments to empty fields
    const updates: Record<string, unknown> = {};
    const currentMeta = (contact.metadata as Record<string, unknown>) || {};
    const newMeta = { ...currentMeta };
    let applied = 0;

    if (enriched.suggested_title && !contact.title) {
      updates.title = enriched.suggested_title;
      applied++;
    }
    if (enriched.suggested_linkedin_url) {
      newMeta.linkedin_url = enriched.suggested_linkedin_url;
      applied++;
    }
    if (enriched.suggested_location) {
      newMeta.location = enriched.suggested_location;
      applied++;
    }

    if (applied > 0) {
      updates.metadata = newMeta;
      const { data: updated, error: updateErr } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", contact_id)
        .eq("team_id", context.teamId)
        .select("*, companies(id, name)")
        .single();

      if (updateErr) {
        logger.error("AiEnrich", "Update error", updateErr);
      }

      return NextResponse.json({
        success: true,
        data: {
          enrichment: enriched,
          applied,
          contact: updated || contact,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        enrichment: enriched,
        applied: 0,
        contact,
      },
    });
  } catch (err) {
    logger.error("AiEnrich", "POST error", err);
    return NextResponse.json({ success: false, error: "Enrichment failed" }, { status: 500 });
  }
}
