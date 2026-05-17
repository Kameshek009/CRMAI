import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeLLMResponse } from "@/lib/sanitize";
import Groq from "groq-sdk";
import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * POST /api/llm/chat
 *
 * Proxy endpoint for LLM chat requests from the desktop app.
 * Routes requests through the dashboard to keep API keys secure.
 *
 * Features:
 * - Bearer token authentication (validates desktop app access token)
 * - User quota enforcement (checks tokens_used vs token_limit)
 * - Usage tracking (increments tokens_used after each request)
 * - Secure API key storage (GROQ_API_KEY only on server)
 *
 * Headers:
 *   Authorization: Bearer {accessToken}
 *
 * Request Body:
 * {
 *   messages: [{ role: "system" | "user" | "assistant", content: string }],
 *   model?: string,
 *   temperature?: number,
 *   max_tokens?: number,
 *   stream?: boolean (ignored, always non-streaming for now)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     content: string,
 *     model: string,
 *     usage: { prompt_tokens, completion_tokens, total_tokens },
 *     account: { tokens_used, token_limit, tokens_remaining }
 *   }
 * }
 */

// Initialize Groq client with server-side API key
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Request validation schema
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(32768).optional(),
  stream: z.boolean().optional(), // Ignored for now
  tools: z.array(z.any()).optional(), // Function calling tools
});

export async function POST(request: NextRequest) {
  const rlError = await checkRateLimit(request, { limit: 30, keyPrefix: "llm" });
  if (rlError) return rlError;

  try {
    // 1. Extract and validate Bearer token
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);

    // Validate access token
    const tokenData = validateAccessToken(accessToken);

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired access token" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { messages, model, temperature, max_tokens, tools } = parsed.data;

    // 3. Get account and team billing data
    const supabase = createSupabaseAdmin();

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, current_team_id")
      .eq("id", tokenData.account_id)
      .single();

    if (accountError || !account) {
      logger.error("LlmChat", "Account not found", accountError?.message);
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Get team billing data
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, tokens_used, token_limit, tier")
      .eq("id", account.current_team_id)
      .single();

    if (teamError || !team) {
      logger.error("LlmChat", "Team not found", teamError?.message);
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Check token quota against team
    if (team.tokens_used >= team.token_limit) {
      return NextResponse.json(
        {
          success: false,
          error: "Token limit exceeded. Please upgrade your plan.",
          tokens_used: team.tokens_used,
          token_limit: team.token_limit,
        },
        { status: 429 }
      );
    }

    // 4. Call Groq API with server-side key
    let completion;
    try {
      const requestBody: {
        messages: typeof messages;
        model: string;
        temperature: number;
        max_completion_tokens: number;
        stream: false;
        tools?: typeof tools;
      } = {
        messages: messages,
        model: model || "moonshotai/kimi-k2-instruct",
        temperature: temperature ?? 0.7,
        max_completion_tokens: max_tokens || 2048,
        stream: false,
      };

      // Add tools if provided (function calling)
      if (tools && Array.isArray(tools) && tools.length > 0) {
        requestBody.tools = tools;
      }

      completion = await groq.chat.completions.create(requestBody);
    } catch (groqError: unknown) {
      const error = groqError as { status?: number; message?: string };
      logger.error("LlmChat", "Groq API error", error.message);

      // Handle Groq-specific errors
      if (error.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: "Rate limited by LLM provider. Please try again in a moment.",
          },
          { status: 429 }
        );
      }

      if (error.status === 401) {
        logger.error("LlmChat", "Invalid Groq API key");
        return NextResponse.json(
          { success: false, error: "LLM service configuration error" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message || "LLM request failed" },
        { status: 500 }
      );
    }

    const choice = completion.choices[0];
    const responseContent = sanitizeLLMResponse(choice?.message?.content || "");
    const toolCalls = choice?.message?.tool_calls;
    const tokensUsed = completion.usage?.total_tokens || 0;

    // 5. Atomically update team's token usage
    let finalTokensUsed = team.tokens_used + tokensUsed;
    let finalTokenLimit = team.token_limit;

    const { data: rpcResult } = await supabase.rpc("increment_team_tokens", {
      p_team_id: team.id,
      p_tokens: tokensUsed,
    });

    if (rpcResult && rpcResult[0]) {
      finalTokensUsed = rpcResult[0].new_tokens_used;
      finalTokenLimit = rpcResult[0].token_limit;
    }

    // 6. Return response
    interface LLMResponse {
      success: boolean;
      data: {
        content: string;
        model: string;
        finish_reason: string | null;
        tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
        usage: {
          prompt_tokens: number | undefined;
          completion_tokens: number | undefined;
          total_tokens: number;
        };
        account: {
          tokens_used: number;
          token_limit: number;
          tokens_remaining: number;
        };
      };
    }

    const response: LLMResponse = {
      success: true,
      data: {
        content: responseContent,
        model: completion.model,
        finish_reason: choice?.finish_reason || null,
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens,
          completion_tokens: completion.usage?.completion_tokens,
          total_tokens: tokensUsed,
        },
        account: {
          tokens_used: finalTokensUsed,
          token_limit: finalTokenLimit,
          tokens_remaining: finalTokenLimit - finalTokensUsed,
        },
      },
    };

    // Include tool_calls if present
    if (toolCalls && toolCalls.length > 0) {
      response.data.tool_calls = toolCalls as LLMResponse["data"]["tool_calls"];
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.error("LlmChat", "Unexpected error", err.message);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
