import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { SessionUser } from "@/lib/auth/session";
import { HttpError } from "@/lib/auth/session";
import { anthropicToolDefs, toolsByName } from "@/lib/ai/tools";
import { fmt } from "@/lib/dates";
import type { Prisma } from "@prisma/client";

const MAX_TURNS = 6;

function client() {
  if (!env.anthropicKey) {
    throw new HttpError(503, "The assistant is not configured. Add ANTHROPIC_API_KEY and restart.");
  }
  return new Anthropic({
    apiKey: env.anthropicKey,
    defaultHeaders: env.anthropicWorkspaceId
      ? { "anthropic-workspace-id": env.anthropicWorkspaceId }
      : undefined,
  });
}

function systemPrompt(user: SessionUser) {
  return `You are the Chief of Staff assistant inside the ${env.companyName} CEO OS.

You are speaking with ${user.name} (${user.role}). Today is ${fmt(new Date(), "EEEE d MMMM yyyy, HH:mm")} in ${env.companyTimezone}.

How you work:
- Answer from tool results, never from memory or assumption. If you have not looked something up, look it up.
- Be brief and concrete. Lead with the answer. Numbers and names beat adjectives.
- "Currently working on" always means the person's latest task activity and status updates. Never imply the system watches anyone's screen, keystrokes or physical presence.
- Never invent development work. Only create a task when you were explicitly asked to create it, and pass the exact scope you were given. Tasks you create are saved as suggestions for the CEO to approve unless auto-assignment has been switched on.
- Before any tool that changes data, say plainly what you are about to change. Changes may come back as awaiting confirmation; if so, tell the user it is queued for their confirmation in the interface rather than claiming it is done.
- When you lack a task or project id, look it up first with a read tool.
- If a request is outside your tools, say so and suggest what the user can do in the interface.`;
}

type Block = Anthropic.Messages.ContentBlockParam;

export type AssistantResult = {
  conversationId: string;
  reply: string;
  pendingActions: { id: string; tool: string; input: unknown }[];
  usedTools: string[];
};

export async function runAssistant(params: {
  user: SessionUser;
  conversationId?: string | null;
  message: string;
}): Promise<AssistantResult> {
  const anthropic = client();

  const conversation = params.conversationId
    ? await prisma.aiConversation.findFirst({ where: { id: params.conversationId, userId: params.user.id } })
    : null;

  const convo =
    conversation ??
    (await prisma.aiConversation.create({
      data: { userId: params.user.id, title: params.message.slice(0, 60) },
    }));

  const history = await prisma.aiMessage.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  const messages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content as unknown as Block[],
  }));

  messages.push({ role: "user", content: [{ type: "text", text: params.message }] });
  await prisma.aiMessage.create({
    data: {
      conversationId: convo.id,
      role: "user",
      content: [{ type: "text", text: params.message }] as unknown as Prisma.InputJsonValue,
    },
  });

  const pendingActions: AssistantResult["pendingActions"] = [];
  const usedTools: string[] = [];
  let reply = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response: Anthropic.Messages.Message;
    try {
      response = await anthropic.messages.create({
        model: env.anthropicModel,
        max_tokens: 2000,
        system: systemPrompt(params.user),
        tools: anthropicToolDefs(params.user.role),
        messages,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("workspace")) {
        throw new HttpError(503, "This Anthropic API key requires ANTHROPIC_WORKSPACE_ID in .env.");
      }
      if (message.toLowerCase().includes("credit balance")) {
        throw new HttpError(402, "Anthropic credits are exhausted. Add credits in Plans & Billing, then try again.");
      }
      throw new HttpError(503, "The assistant provider is temporarily unavailable.");
    }

    const content = response.content as Block[];
    messages.push({ role: "assistant", content });
    await prisma.aiMessage.create({
      data: {
        conversationId: convo.id,
        role: "assistant",
        content: content as unknown as Prisma.InputJsonValue,
      },
    });

    reply = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results: Block[] = [];
    for (const call of toolUses) {
      usedTools.push(call.name);
      const outcome = await executeTool({
        user: params.user,
        conversationId: convo.id,
        name: call.name,
        input: call.input,
      });
      if (outcome.kind === "pending") {
        pendingActions.push({ id: outcome.actionId, tool: call.name, input: call.input });
      }
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        is_error: outcome.kind === "error",
        content: [{ type: "text", text: JSON.stringify(outcome.payload).slice(0, 12000) }],
      });
    }

    messages.push({ role: "user", content: results });
    await prisma.aiMessage.create({
      data: {
        conversationId: convo.id,
        role: "user",
        content: results as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.aiConversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });
  return { conversationId: convo.id, reply, pendingActions, usedTools };
}

type Outcome =
  | { kind: "ok"; payload: unknown }
  | { kind: "pending"; actionId: string; payload: unknown }
  | { kind: "error"; payload: unknown };

/** Single choke point: role check, confirmation gate, execution, logging. */
export async function executeTool(params: {
  user: SessionUser;
  conversationId: string | null;
  name: string;
  input: unknown;
  preConfirmed?: boolean;
}): Promise<Outcome> {
  const tool = toolsByName.get(params.name);
  const base = {
    conversationId: params.conversationId,
    actorUserId: params.user.id,
    tool: params.name,
    input: (params.input ?? {}) as Prisma.InputJsonValue,
  };

  if (!tool) {
    await prisma.aiAction.create({ data: { ...base, status: "FAILED", error: "Unknown tool" } });
    return { kind: "error", payload: { error: `No such tool: ${params.name}` } };
  }

  if (!tool.roles.includes(params.user.role)) {
    await prisma.aiAction.create({ data: { ...base, status: "DENIED", error: "Role not permitted" } });
    return { kind: "error", payload: { error: "You are not authorised to use that tool." } };
  }

  if (tool.mutating && !params.preConfirmed) {
    const action = await prisma.aiAction.create({ data: { ...base, status: "AWAITING_CONFIRMATION" } });
    return {
      kind: "pending",
      actionId: action.id,
      payload: {
        status: "awaiting_confirmation",
        actionId: action.id,
        note: "Queued. The user must confirm this change in the interface before it takes effect.",
      },
    };
  }

  try {
    const parsed = tool.schema.parse(params.input ?? {});
    const output = await tool.run({ user: params.user, conversationId: params.conversationId }, parsed);
    await prisma.aiAction.create({
      data: { ...base, status: "EXECUTED", output: (output ?? {}) as Prisma.InputJsonValue },
    });
    return { kind: "ok", payload: output };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.aiAction.create({ data: { ...base, status: "FAILED", error: message } });
    return { kind: "error", payload: { error: message } };
  }
}

/** Runs a queued mutating action after the user pressed confirm. */
export async function confirmAction(user: SessionUser, actionId: string) {
  const action = await prisma.aiAction.findFirst({ where: { id: actionId, actorUserId: user.id } });
  if (!action) throw new HttpError(404, "That pending action is gone.");
  if (action.status !== "AWAITING_CONFIRMATION") throw new HttpError(409, "That action was already handled.");

  const outcome = await executeTool({
    user,
    conversationId: action.conversationId,
    name: action.tool,
    input: action.input,
    preConfirmed: true,
  });

  await prisma.aiAction.update({
    where: { id: action.id },
    data: {
      status: outcome.kind === "ok" ? "CONFIRMED" : "FAILED",
      output: (outcome.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
  return outcome;
}

export async function rejectAction(user: SessionUser, actionId: string) {
  await prisma.aiAction.updateMany({
    where: { id: actionId, actorUserId: user.id, status: "AWAITING_CONFIRMATION" },
    data: { status: "REJECTED" },
  });
}
