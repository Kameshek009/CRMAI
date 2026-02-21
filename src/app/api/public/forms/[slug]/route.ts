import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, ctx: RouteContext) {
  try {
    const { slug } = await ctx.params;
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from("web_forms")
      .select("slug, name, description, fields, primary_color, success_message")
      .eq("slug", slug)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("PublicForm", "GET error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

const submissionSchema = z.record(z.string(), z.string().max(5000));

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { slug } = await ctx.params;
    const supabase = createSupabaseAdmin();

    // Get form with team info
    const { data: form, error: formError } = await supabase
      .from("web_forms")
      .select("id, team_id, account_id, fields, is_active, is_deleted, notify_emails")
      .eq("slug", slug)
      .single();

    if (formError || !form || !form.is_active || form.is_deleted) {
      return NextResponse.json({ success: false, error: "Form not found or inactive" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid submission data" }, { status: 400 });
    }

    const formData = parsed.data;

    // Validate required fields
    const fields = (form.fields || []) as Array<{ name: string; required?: boolean }>;
    for (const field of fields) {
      if (field.required && !formData[field.name]?.trim()) {
        return NextResponse.json(
          { success: false, error: `Field "${field.name}" is required` },
          { status: 400 }
        );
      }
    }

    // Create lead from submission
    const leadData: Record<string, unknown> = {
      team_id: form.team_id,
      account_id: form.account_id,
      lead_owner_account_id: form.account_id,
      first_name: formData.first_name || formData.name || "Web Lead",
      last_name: formData.last_name || null,
      email: formData.email || null,
      phone: formData.phone || null,
      organization: formData.organization || formData.company || null,
      job_title: formData.job_title || null,
      website: formData.website || null,
      source: "web_form",
      notes: formData.message || formData.notes || null,
      status: "new",
    };

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert(leadData)
      .select("id")
      .single();

    if (leadError) {
      logger.error("PublicForm", "Failed to create lead", leadError);
      return NextResponse.json({ success: false, error: "Failed to process submission" }, { status: 500 });
    }

    // Save submission
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") || "";
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";

    const { error: subError } = await supabase
      .from("web_form_submissions")
      .insert({
        form_id: form.id,
        team_id: form.team_id,
        data: formData,
        lead_id: lead?.id || null,
        ip_address: ip,
        user_agent: userAgent,
        referrer,
      });

    if (subError) {
      logger.error("PublicForm", "Failed to save submission", subError);
    }

    return NextResponse.json({ success: true, message: "Submission received" });
  } catch (err) {
    logger.error("PublicForm", "POST error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
