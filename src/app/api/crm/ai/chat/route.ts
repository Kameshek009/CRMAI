import { NextRequest, NextResponse } from "next/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { buildSystemPrompt, CRM_TOOLS } from "@/lib/crm/ai-prompts";
import { executeCrmToolCall } from "@/lib/crm/ai-executor";
import { checkTeamUsageAllowed } from "@/lib/usage/check";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeLLMResponse } from "@/lib/sanitize";
import type { SubscriptionTier } from "@/types";
import { logger } from "@/lib/logger";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Fair token billing ─────────────────────────────────────
// Instead of charging raw Groq tokens (which include huge system prompt
// + tool definitions overhead), we charge virtual tokens based on actions.

const CHAT_BASE_COST = 150; // simple conversation message
const CHAT_LONG_REPLY_COST = 300; // longer AI reply (>200 chars)

const TOOL_COSTS: Record<string, { base: number; perField: number }> = {
  create_contact:      { base: 200, perField: 80 },
  create_company:      { base: 200, perField: 80 },
  create_deal:         { base: 300, perField: 100 },
  create_task:         { base: 200, perField: 60 },
  create_showing:      { base: 200, perField: 60 },
  update_contact:      { base: 200, perField: 60 },
  update_deal:         { base: 200, perField: 60 },
  update_task:         { base: 150, perField: 50 },
  complete_task:       { base: 100, perField: 0 },
  delete_record:       { base: 100, perField: 0 },
  search_crm:          { base: 150, perField: 0 },
  get_pipeline_summary:{ base: 200, perField: 0 },
  get_contact_details: { base: 150, perField: 0 },
  get_deal_details:    { base: 150, perField: 0 },
  list_upcoming_tasks: { base: 150, perField: 0 },
  get_activity_feed:   { base: 150, perField: 0 },
};

function calculateBillableTokens(
  toolCalls: { name: string; args?: Record<string, unknown> }[],
  responseLength: number
): number {
  if (toolCalls.length === 0) {
    // Simple conversation — charge based on response length
    return responseLength > 200 ? CHAT_LONG_REPLY_COST : CHAT_BASE_COST;
  }

  let total = 0;
  for (const tc of toolCalls) {
    const cost = TOOL_COSTS[tc.name] || { base: 200, perField: 0 };
    const fieldCount = tc.args ? Object.keys(tc.args).filter(k => k !== "count").length : 0;
    const count = Math.max(1, Number(tc.args?.count) || 1);
    total += (cost.base + cost.perField * fieldCount) * count;
  }
  return total;
}

// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rlError = await checkRateLimit(request, { limit: 20 });
  if (rlError) return rlError;

  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "ai_chat", "allowed", context.isDirector);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    // Fetch team for quota check
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", context.teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Check team usage limits
    const usageCheck = checkTeamUsageAllowed(
      {
        tier: team.tier as SubscriptionTier,
        token_limit: team.token_limit,
        tokens_used: team.tokens_used,
        weekly_tokens_used: team.weekly_tokens_used,
        week_start_date: team.week_start_date,
        billing_cycle_start: team.billing_cycle_start,
        seat_count: team.seat_count,
      },
      100 // lower minimum check — our billing is now cheaper
    );

    if (!usageCheck.allowed) {
      const dayStart = new Date(team.week_start_date);
      const resetsAt = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000).toISOString();

      return NextResponse.json(
        {
          success: false,
          error: "Token limit exceeded",
          reason: usageCheck.reason,
          resetsAt,
          dailyUsed: usageCheck.weeklyUsed,
          dailyLimit: usageCheck.weeklyLimit,
          monthlyUsed: usageCheck.monthlyUsed,
          monthlyLimit: usageCheck.monthlyLimit,
          upgradeOptions: usageCheck.upgradeOptions,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message, history = [], locale } = body as {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
      locale?: string;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
    }

    if (message.length > 10000) {
      return NextResponse.json({ success: false, error: "Message too long (max 10000 characters)" }, { status: 400 });
    }

    const messages = [
      { role: "system" as const, content: buildSystemPrompt(locale) },
      ...history.slice(-10),
      { role: "user" as const, content: message },
    ];

    let realTokensUsed = 0;
    let responseContent: string = "";
    let toolResults: { name: string; success: boolean; result: string; data?: unknown }[] = [];
    const executedTools: { name: string; args?: Record<string, unknown> }[] = [];

    // Multi-round tool calling loop — LLM may need several rounds
    // (e.g. create contacts first, then create deals in a second round)
    const MAX_TOOL_ROUNDS = 3;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversationMessages: any[] = [...messages];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let completion;
      try {
        completion = await groq.chat.completions.create({
          messages: conversationMessages,
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          max_completion_tokens: round === 0 ? 4096 : 1024,
          tools: CRM_TOOLS,
          stream: false,
        });
      } catch (groqErr) {
        // If tool call failed (LLM generated invalid tool args), retry without tools
        const errBody = groqErr instanceof Error ? groqErr.message : String(groqErr);
        if (errBody.includes("tool_use_failed") || errBody.includes("tool call validation")) {
          logger.warn("CrmAI", "Tool call failed, retrying without tools", errBody);
          completion = await groq.chat.completions.create({
            messages: conversationMessages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_completion_tokens: 1024,
            stream: false,
          });
        } else {
          throw groqErr;
        }
      }

      realTokensUsed += completion.usage?.total_tokens || 0;

      const choice = completion.choices[0];
      const toolCalls = choice?.message?.tool_calls;

      // No tool calls — LLM returned final text response
      if (!toolCalls || toolCalls.length === 0) {
        responseContent = sanitizeLLMResponse(choice?.message?.content || "");
        break;
      }

      // Execute tool calls for this round
      const roundResults: typeof toolResults = [];
      for (const tc of toolCalls) {
        let args;
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          logger.error("CrmAI", "Failed to parse tool arguments", tc.function);
          roundResults.push({ name: tc.function.name, success: false, result: "Error: invalid tool call format" });
          continue;
        }
        executedTools.push({ name: tc.function.name, args });
        try {
          const result = await executeCrmToolCall(context.accountId, context.teamId, tc.function.name, args);
          roundResults.push({ name: tc.function.name, ...result });
        } catch (toolErr) {
          logger.error("CrmAI", `Tool ${tc.function.name} threw`, toolErr);
          roundResults.push({ name: tc.function.name, success: false, result: `Error executing ${tc.function.name}` });
        }
      }

      toolResults.push(...roundResults);

      // Add assistant message + tool results to conversation for next round
      conversationMessages.push({ ...choice.message, content: choice.message.content ?? "" });
      conversationMessages.push(
        ...toolCalls.map((tc, i) => ({
          role: "tool" as const,
          tool_call_id: tc.id,
          content: roundResults[i]?.result ?? "",
        }))
      );
    }

    // Calculate fair billable tokens based on actions performed
    const billableTokens = calculateBillableTokens(executedTools, responseContent.length);

    // Deduct tokens from TEAM atomically (prevents race conditions)
    let finalTokensUsed = team.tokens_used;
    let finalTokenLimit = team.token_limit;

    if (billableTokens > 0) {
      const dayStart = new Date(team.week_start_date);
      const now = new Date();
      const hoursSinceDayStart =
        (now.getTime() - dayStart.getTime()) / (1000 * 60 * 60);

      const newDailyTokensUsed = hoursSinceDayStart >= 24
        ? billableTokens
        : team.weekly_tokens_used + billableTokens;
      const newDayStartDate = hoursSinceDayStart >= 24
        ? now.toISOString()
        : team.week_start_date;

      // Atomic increment via RPC
      const { data: rpcResult, error: rpcErr } = await supabase.rpc("increment_team_tokens", {
        p_team_id: context.teamId,
        p_tokens: billableTokens,
        p_daily_tokens: newDailyTokensUsed,
        p_new_day_start: newDayStartDate,
      });

      if (rpcErr) {
        logger.error("CrmAI", "Failed to increment team tokens", rpcErr);
      } else if (rpcResult && rpcResult[0]) {
        finalTokensUsed = rpcResult[0].new_tokens_used;
        finalTokenLimit = rpcResult[0].token_limit;
      }

      // Record in usage_records (non-critical — don't fail the chat)
      const { error: usageErr } = await supabase.from("usage_records").insert({
        account_id: context.accountId,
        tokens_consumed: billableTokens,
        action_type: "crm_ai_chat",
        metadata: {
          team_id: context.teamId,
          model: "llama-3.3-70b-versatile",
          real_tokens: realTokensUsed,
          billable_tokens: billableTokens,
          has_tool_calls: toolResults.length > 0,
          tool_count: toolResults.length,
          tools_used: executedTools.map((t) => t.name),
        },
      });
      if (usageErr) {
        logger.error("CrmAI", "Failed to record usage", usageErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: responseContent,
        toolResults,
        usage: {
          tokensUsed: billableTokens,
          teamTokensUsed: finalTokensUsed,
          teamTokenLimit: finalTokenLimit,
        },
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error("CrmAI", "Chat error", errMsg);
    return NextResponse.json({ success: false, error: "AI chat failed" }, { status: 500 });
  }
}
