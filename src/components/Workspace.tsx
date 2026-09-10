"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { statusLabel } from "@/components/ui";

const IDEA_STATUSES = ["CAPTURED", "EXPLORING", "APPROVED", "PARKED", "DISCARDED", "SHIPPED"];
const PROBLEM_STATUSES = ["OPEN", "INVESTIGATING", "IN_PROGRESS", "RESOLVED"];

function useRefresh() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return () => startTransition(() => router.refresh());
}

export type IdeaItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  priority: string;
  createdAt: string;
};

export function IdeaBoard({ ideas }: { ideas: IdeaItem[] }) {
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  async function add() {
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category: category || undefined }),
    });
    setTitle("");
    setCategory("");
    refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-rule px-[18px] py-3">
        <input
          className="field flex-1 min-w-[180px]"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New idea"
          aria-label="New idea"
        />
        <input
          className="field w-[140px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          aria-label="Category"
        />
        <button className="btn" onClick={add} disabled={title.trim().length < 3}>
          Add
        </button>
      </div>
      <ul className="divide-y divide-rule">
        {ideas.length === 0 && <li className="px-[18px] py-5 text-sm text-muted">No ideas captured yet.</li>}
        {ideas.map((idea) => (
          <li key={idea.id} className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3">
            <div className="min-w-0">
              <p className="text-sm">{idea.title}</p>
              <p className="text-xs text-muted">
                {idea.category ?? "Uncategorised"} · {new Date(idea.createdAt).toLocaleDateString()}
              </p>
            </div>
            <select
              className="field w-auto"
              value={idea.status}
              aria-label={`Status of ${idea.title}`}
              onChange={async (e) => {
                await fetch(`/api/ideas/${idea.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: e.target.value }),
                });
                refresh();
              }}
            >
              {IDEA_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type ProblemItem = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  owner: string | null;
  solutions: { id: string; description: string; isChosen: boolean }[];
};

export function ProblemBoard({ problems }: { problems: ProblemItem[] }) {
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [solutionFor, setSolutionFor] = useState<string | null>(null);
  const [solution, setSolution] = useState("");

  async function add() {
    await fetch("/api/problems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, severity }),
    });
    setTitle("");
    refresh();
  }

  async function addSolution(problemId: string) {
    await fetch("/api/solutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId, description: solution, isChosen: true }),
    });
    setSolution("");
    setSolutionFor(null);
    refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-rule px-[18px] py-3">
        <input
          className="field flex-1 min-w-[180px]"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is going wrong?"
          aria-label="New problem"
        />
        <select className="field w-auto" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => (
            <option key={level} value={level}>
              {level.charAt(0) + level.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <button className="btn" onClick={add} disabled={title.trim().length < 3}>
          Log it
        </button>
      </div>

      <ul className="divide-y divide-rule">
        {problems.length === 0 && <li className="px-[18px] py-5 text-sm text-muted">No open problems recorded.</li>}
        {problems.map((problem) => (
          <li key={problem.id} className="px-[18px] py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">{problem.title}</p>
                <p className="text-xs text-muted">
                  {problem.severity.toLowerCase()} severity
                  {problem.owner ? ` · owned by ${problem.owner}` : " · no owner"}
                </p>
              </div>
              <select
                className="field w-auto"
                value={problem.status}
                aria-label={`Status of ${problem.title}`}
                onChange={async (e) => {
                  await fetch(`/api/problems/${problem.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: e.target.value }),
                  });
                  refresh();
                }}
              >
                {PROBLEM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {problem.solutions.length > 0 && (
              <ul className="mt-2 space-y-1">
                {problem.solutions.map((s) => (
                  <li key={s.id} className="text-xs text-muted">
                    {s.isChosen ? "Chosen: " : "Option: "}
                    {s.description}
                  </li>
                ))}
              </ul>
            )}

            {solutionFor === problem.id ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  className="field flex-1 min-w-[200px]"
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="Proposed solution"
                  aria-label="Proposed solution"
                />
                <button className="btn" onClick={() => addSolution(problem.id)} disabled={solution.trim().length < 3}>
                  Save solution
                </button>
              </div>
            ) : (
              <button className="mt-2 text-xs text-accent underline underline-offset-2" onClick={() => setSolutionFor(problem.id)}>
                Add a solution
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScheduleForm() {
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [type, setType] = useState("MEETING");

  async function add() {
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, startsAt: new Date(startsAt).toISOString(), type }),
    });
    setTitle("");
    setStartsAt("");
    refresh();
  }

  return (
    <div className="flex flex-wrap gap-2 border-b border-rule px-[18px] py-3">
      <input
        className="field flex-1 min-w-[180px]"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Meeting or review"
        aria-label="Event title"
      />
      <input
        className="field w-[210px]"
        type="datetime-local"
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
        aria-label="Starts at"
      />
      <select className="field w-auto" value={type} onChange={(e) => setType(e.target.value)} aria-label="Event type">
        {["MEETING", "PROJECT_REVIEW", "DEADLINE", "FOCUS_BLOCK", "OTHER"].map((option) => (
          <option key={option} value={option}>
            {statusLabel(option)}
          </option>
        ))}
      </select>
      <button className="btn" onClick={add} disabled={!title || !startsAt}>
        Add to schedule
      </button>
    </div>
  );
}
