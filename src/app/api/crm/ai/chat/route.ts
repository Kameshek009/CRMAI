import { NextRequest, NextResponse } from "next/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { CRM_SYSTEM_PROMPT, CRM_TOOLS } from "@/lib/crm/ai-prompts";
import { executeCrmToolCall } from "@/lib/crm/ai-executor";
import { checkTeamUsageAllowed } from "@/lib/usage/check";
import type { SubscriptionTier } from "@/types";
import { logger } from "@/lib/logger";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
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
      500
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
    const { message, history = [] } = body as {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
    }

    if (message.length > 10000) {
      return NextResponse.json({ success: false, error: "Message too long (max 10000 characters)" }, { status: 400 });
    }

    const messages = [
      { role: "system" as const, content: CRM_SYSTEM_PROMPT },
      ...history.slice(-10),
      { role: "user" as const, content: message },
    ];

    let totalTokensUsed = 0;

    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_completion_tokens: 2048,
      tools: CRM_TOOLS,
      stream: false,
    });

    totalTokensUsed += completion.usage?.total_tokens || 0;

    const choice = completion.choices[0];
    const toolCalls = choice?.message?.tool_calls;

    let responseContent: string;
    let toolResults: { name: string; result: string; data?: unknown }[] = [];

    if (toolCalls && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        let args;
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          logger.error("CrmAI", "Failed to parse tool arguments", tc.function);
          toolResults.push({ name: tc.function.name, result: "Error: invalid tool call format" });
          continue;
        }
        const result = await executeCrmToolCall(context.accountId, context.teamId, tc.function.name, args);
        toolResults.push({ name: tc.function.name, ...result });
      }

      const toolMessages = toolCalls.map((tc, i) => ({
        role: "tool" as const,
        tool_call_id: tc.id,
        content: toolResults[i].result,
      }));

      const finalCompletion = await groq.chat.completions.create({
        messages: [
          ...messages,
          choice.message,
          ...toolMessages,
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_completion_tokens: 1024,
        stream: false,
      });

      totalTokensUsed += finalCompletion.usage?.total_tokens || 0;
      responseContent = finalCompletion.choices[0]?.message?.content || "";
      logger.info("CrmAI", `Tool calls: ${toolCalls.length}, results: ${toolResults.length}`, {
        tools: toolResults.map(r => ({ name: r.name, hasData: !!r.data, dataKeys: r.data ? Object.keys(r.data as Record<string, unknown>) : [] })),
      });
    } else {
      responseContent = choice?.message?.content || "";
    }

    // Deduct tokens from TEAM atomically (prevents race conditions)
    let finalTokensUsed = team.tokens_used;
    let finalTokenLimit = team.token_limit;

    if (totalTokensUsed > 0) {
      const dayStart = new Date(team.week_start_date);
      const now = new Date();
      const hoursSinceDayStart =
        (now.getTime() - dayStart.getTime()) / (1000 * 60 * 60);

      const newDailyTokensUsed = hoursSinceDayStart >= 24
        ? totalTokensUsed
        : team.weekly_tokens_used + totalTokensUsed;
      const newDayStartDate = hoursSinceDayStart >= 24
        ? now.toISOString()
        : team.week_start_date;

      // Atomic increment via RPC
      const { data: rpcResult } = await supabase.rpc("increment_team_tokens", {
        p_team_id: context.teamId,
        p_tokens: totalTokensUsed,
        p_daily_tokens: newDailyTokensUsed,
        p_new_day_start: newDayStartDate,
      });

      if (rpcResult && rpcResult[0]) {
        finalTokensUsed = rpcResult[0].new_tokens_used;
        finalTokenLimit = rpcResult[0].token_limit;
      }

      // Record in usage_records
      await supabase.from("usage_records").insert({
        account_id: context.accountId,
        tokens_consumed: totalTokensUsed,
        action_type: "crm_ai_chat",
        metadata: {
          team_id: context.teamId,
          model: "llama-3.3-70b-versatile",
          has_tool_calls: toolResults.length > 0,
          tool_count: toolResults.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        response: responseContent,
        toolResults,
        usage: {
          tokensUsed: totalTokensUsed,
          teamTokensUsed: finalTokensUsed,
          teamTokenLimit: finalTokenLimit,
        },
      },
    });
  } catch (err) {
    logger.error("CrmAI", "Chat error", err);
    return NextResponse.json({ success: false, error: "AI chat failed" }, { status: 500 });
  }
}
