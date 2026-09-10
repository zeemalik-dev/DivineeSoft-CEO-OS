"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string };

type Props = {
  employees: Option[];
  projects: Option[];
  personalOnly?: boolean;
};

export function TaskComposer({ employees, projects, personalOnly = false }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(employees[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          assigneeId: personalOnly ? null : assigneeId || null,
          projectId: projectId || null,
          priority,
          dueDate: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null,
          kind: personalOnly ? "CEO_PERSONAL" : "TEAM",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create task.");
      setTitle("");
      setDueDate("");
      setMessage("Task assigned successfully.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="task-composer" onSubmit={createTask}>
      <div className="task-composer-heading">
        <div>
          <p className="eyebrow">Quick assignment</p>
          <h2>{personalOnly ? "Add a CEO task" : "Assign work to your team"}</h2>
        </div>
        <span className="task-composer-meta">{personalOnly ? "Private" : `${employees.length} people in scope`}</span>
      </div>
      <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to move forward?" aria-label="Task title" required minLength={3} />
      <div className="task-composer-grid">
        {!personalOnly && <select className="field" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} aria-label="Assign to" required><option value="">Choose owner</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>}
        <select className="field" value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Project"><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select className="field" value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Priority"><option value="LOW">Low priority</option><option value="MEDIUM">Medium priority</option><option value="HIGH">High priority</option><option value="CRITICAL">Critical priority</option></select>
        <input className="field" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="Due date" />
      </div>
      <div className="task-composer-footer"><p className={message?.includes("successfully") ? "text-ontrack" : "text-muted"} role={message && !message.includes("successfully") ? "alert" : undefined}>{message ?? "The assignee will see this on their task board."}</p><button className="btn btn-primary" type="submit" disabled={busy || title.trim().length < 3 || (!personalOnly && !assigneeId)}>{busy ? "Assigning" : "Assign task"}</button></div>
    </form>
  );
}
