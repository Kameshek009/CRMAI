import { NextRequest, NextResponse } from "next/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { CRM_SYSTEM_PROMPT, CRM_TOOLS } from "@/lib/crm/ai-prompts";
import { executeCrmToolCall } from "@/lib/crm/ai-executor";
import { checkUsageAllowed } from "@/lib/usage/check";
import { transformAccountRow } from "@/types";
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

    // Fetch account for quota check
    const { data: accountRow, error: accountError } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", context.accountId)
      .single();

    if (accountError || !accountRow) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const account = transformAccountRow(accountRow);

    // Check usage limits before calling AI
    const usageCheck = checkUsageAllowed(account, 500); // estimate ~500 tokens
    if (!usageCheck.allowed) {
      // Calculate when daily limit resets (24h from day start)
      const dayStart = new Date(account.weekStartDate);
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

    if (!message) {
      return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
    }

    // Build messages for Groq
    const messages = [
      { role: "system" as const, content: CRM_SYSTEM_PROMPT },
      ...history.slice(-10),
      { role: "user" as const, content: message },
    ];

    let totalTokensUsed = 0;

    // Call Groq with CRM tools
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

    // If there are tool calls, execute them
    if (toolCalls && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments);
        const result = await executeCrmToolCall(context.accountId, context.teamId, tc.function.name, args);
        toolResults.push({ name: tc.function.name, ...result });
      }

      // Build tool call result messages for second Groq call
      const toolMessages = toolCalls.map((tc, i) => ({
        role: "tool" as const,
        tool_call_id: tc.id,
        content: toolResults[i].result,
      }));

      // Get final response with tool results
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
    } else {
      responseContent = choice?.message?.content || "";
    }

    // Deduct tokens from account
    if (totalTokensUsed > 0) {
      const newTokensUsed = account.tokensUsed + totalTokensUsed;

      // Check if 24h has passed since daily period start — reset daily counter
      const dayStart = new Date(account.weekStartDate);
      const now = new Date();
      const hoursSinceDayStart =
        (now.getTime() - dayStart.getTime()) / (1000 * 60 * 60);

      let newDailyTokensUsed: number;
      let newDayStartDate: string;

      if (hoursSinceDayStart >= 24) {
        // 24h passed — reset daily usage to just this request
        newDailyTokensUsed = totalTokensUsed;
        newDayStartDate = now.toISOString();
      } else {
        // Same day — add to existing daily usage
        newDailyTokensUsed = account.weeklyTokensUsed + totalTokensUsed;
        newDayStartDate = new Date(account.weekStartDate).toISOString();
      }

      // Update account
      await supabase
        .from("accounts")
        .update({
          tokens_used: newTokensUsed,
          weekly_tokens_used: newDailyTokensUsed,
          week_start_date: newDayStartDate,
          updated_at: now.toISOString(),
        })
        .eq("id", context.accountId);

      // Record in usage_records
      await supabase.from("usage_records").insert({
        account_id: context.accountId,
        tokens_consumed: totalTokensUsed,
        action_type: "crm_ai_chat",
        metadata: {
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
          accountTokensUsed: account.tokensUsed + totalTokensUsed,
          accountTokenLimit: account.tokenLimit,
        },
      },
    });
  } catch (err) {
    logger.error("CrmAI", "Chat error", err);
    return NextResponse.json({ success: false, error: "AI chat failed" }, { status: 500 });
  }
}
