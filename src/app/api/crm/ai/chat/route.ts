import { NextRequest, NextResponse } from "next/server";
import { getAccountId } from "@/lib/crm/helpers";
import { CRM_SYSTEM_PROMPT, CRM_TOOLS } from "@/lib/crm/ai-prompts";
import { executeCrmToolCall } from "@/lib/crm/ai-executor";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

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

    // Call Groq with CRM tools
    const completion = await groq.chat.completions.create({
      messages,
      model: "moonshotai/kimi-k2-instruct",
      temperature: 0.3,
      max_completion_tokens: 2048,
      tools: CRM_TOOLS,
      stream: false,
    });

    const choice = completion.choices[0];
    const toolCalls = choice?.message?.tool_calls;

    // If there are tool calls, execute them
    if (toolCalls && toolCalls.length > 0) {
      const toolResults: { name: string; result: string; data?: unknown }[] = [];

      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments);
        const result = await executeCrmToolCall(accountId, tc.function.name, args);
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
        model: "moonshotai/kimi-k2-instruct",
        temperature: 0.3,
        max_completion_tokens: 1024,
        stream: false,
      });

      const finalContent = finalCompletion.choices[0]?.message?.content || "";

      return NextResponse.json({
        success: true,
        data: {
          response: finalContent,
          toolResults,
        },
      });
    }

    // No tool calls, return direct response
    return NextResponse.json({
      success: true,
      data: {
        response: choice?.message?.content || "",
        toolResults: [],
      },
    });
  } catch (err) {
    console.error("[CRM AI Chat] Error:", err);
    return NextResponse.json({ success: false, error: "AI chat failed" }, { status: 500 });
  }
}
