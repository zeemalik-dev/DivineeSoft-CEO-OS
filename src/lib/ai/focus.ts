import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { heuristicFocus, type ceoBriefingData } from "@/server/reports";

type Briefing = Awaited<ReturnType<typeof ceoBriefingData>>;

/**
 * The "what should I focus on" section of the briefing. Falls back to the
 * deterministic list whenever the API key is missing or the call fails, so the
 * 9am email never depends on the model being up.
 */
export async function ceoFocus(data: Briefing): Promise<string[]> {
  if (!env.anthropicKey) return heuristicFocus(data);

  const summary = {
    counters: data.overview,
    team: data.team.map((t) => ({
      name: t.name,
      task: t.currentTask,
      open: t.openTasks,
      overdue: t.overdueTasks,
      blocker: t.blocker,
    })),
    projects: data.projects.map((p) => ({
      name: p.name,
      health: p.health,
      progress: p.progress,
      overdue: p.overdueTasks,
      blocked: p.blockedTasks,
    })),
    risks: data.risks,
    openProblems: data.problems.map((p) => ({ title: p.title, severity: p.severity })),
  };

  try {
    const anthropic = new Anthropic({ apiKey: env.anthropicKey });
    const response = await anthropic.messages.create({
      model: env.anthropicModel,
      max_tokens: 700,
      system:
        `You advise the CEO of ${env.companyName}, a small software company. Given today's operational data, ` +
        "return the 3–5 things the CEO personally should do today, hardest-hitting first. " +
        "Each line: one sentence, name the person or project, say the action. No preamble, no headings, no numbering. " +
        "Do not invent facts that are not in the data. Return one item per line.",
      messages: [{ role: "user", content: JSON.stringify(summary) }],
    });
    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
      .filter((l) => l.length > 10);
    return lines.length ? lines.slice(0, 5) : heuristicFocus(data);
  } catch (error) {
    console.error("[ai:focus] falling back to heuristics", error);
    return heuristicFocus(data);
  }
}
