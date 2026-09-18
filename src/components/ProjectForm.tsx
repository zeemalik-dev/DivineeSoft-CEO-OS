"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCreateProjectMutation,
  useUpdateProjectMutation,
} from "@/redux/api/projectsApi";

type EmployeeOption = {
  id: string;
  name: string;
  title?: string | null;
};

type ProjectData = {
  id?: string;
  name: string;
  description?: string | null;
  platforms: string[];
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "BLOCKED" | "COMPLETED" | "ARCHIVED";
  healthNote?: string | null;
  startedAt?: string | null;
  dueDate?: string | null;
  leadId?: string | null;
  managerId?: string | null;
  members?: { employeeId: string }[];
};

type ProjectFormProps = {
  initialData?: ProjectData;
  employees: EmployeeOption[];
  isEdit?: boolean;
};

const POPULAR_PLATFORMS = ["Web", "Mobile", "iOS", "Android", "Backend", "API", "Cloud", "AI", "DevOps"];

export function ProjectForm({ initialData, employees, isEdit = false }: ProjectFormProps) {
  const router = useRouter();
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [platforms, setPlatforms] = useState<string[]>(initialData?.platforms ?? ["Web"]);
  const [customPlatform, setCustomPlatform] = useState("");
  const [status, setStatus] = useState<ProjectData["status"]>(initialData?.status ?? "ACTIVE");
  const [healthNote, setHealthNote] = useState(initialData?.healthNote ?? "");
  const [leadId, setLeadId] = useState(initialData?.leadId ?? "");
  const [managerId, setManagerId] = useState(initialData?.managerId ?? "");
  const [startedAt, setStartedAt] = useState(
    initialData?.startedAt
      ? new Date(initialData.startedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : ""
  );
  const [memberIds, setMemberIds] = useState<string[]>(
    initialData?.members ? initialData.members.map((m) => m.employeeId) : []
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(platform: string) {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  function addCustomPlatform() {
    const trimmed = customPlatform.trim();
    if (trimmed && !platforms.includes(trimmed)) {
      setPlatforms((prev) => [...prev, trimmed]);
      setCustomPlatform("");
    }
  }

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      platforms,
      status,
      healthNote: healthNote.trim() || undefined,
      leadId: leadId || null,
      managerId: managerId || null,
      startedAt: startedAt ? new Date(`${startedAt}T00:00:00`).toISOString() : undefined,
      dueDate: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
      memberIds,
    };

    try {
      if (isEdit && initialData?.id) {
        await updateProject({ id: initialData.id, ...payload }).unwrap();
        router.push(`/projects/${initialData.id}`);
      } else {
        const result = await createProject(payload).unwrap();
        const newId = result?.project?.id;
        router.push(newId ? `/projects/${newId}` : "/projects");
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.data?.error ?? "Failed to save project. Please check the fields and try again.");
    }
  }

  const filteredEmployees = employees.filter((emp) =>
    !memberSearch ||
    emp.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (emp.title && emp.title.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="rounded-lg border border-rule bg-surface p-2 text-muted hover:text-ink hover:border-muted transition-colors"
            title="Back to Projects"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <p className="eyebrow">{isEdit ? "Update Initiative" : "New Initiative"}</p>
            <h1 className="page-title text-2xl">
              {isEdit ? `Edit “${initialData?.name}”` : "Create Project"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="btn btn-secondary text-xs px-4 py-2"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isCreating || isUpdating || name.trim().length < 2}
            className="btn btn-primary text-xs px-5 py-2 cursor-pointer disabled:opacity-50"
          >
            {isCreating || isUpdating
              ? "Saving..."
              : isEdit
              ? "Save Changes"
              : "Create Project"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-blocked/40 bg-blocked/10 p-4 text-sm text-blocked flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: General Info */}
        <section className="rounded-xl border border-rule bg-surface p-6 space-y-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-base font-semibold text-ink">1. Project Overview</h2>
            <p className="text-xs text-muted">Primary name, identifier, and target scope.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Project Name <span className="text-blocked">*</span>
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                className="field w-full text-base font-medium"
                placeholder="e.g. Enterprise HR & Operations Platform"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Description & Objectives
              </label>
              <textarea
                className="field w-full min-h-[90px] resize-y text-sm"
                placeholder="Describe key outcomes, business motivation, and high-level milestones..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Platforms & Tech Stack */}
        <section className="rounded-xl border border-rule bg-surface p-6 space-y-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-base font-semibold text-ink">2. Target Platforms & Stack</h2>
            <p className="text-xs text-muted">Select platforms targeted by this initiative.</p>
          </div>

          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {POPULAR_PLATFORMS.map((plat) => {
                const selected = platforms.includes(plat);
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => togglePlatform(plat)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                      selected
                        ? "border-accent bg-accent text-white shadow-xs"
                        : "border-rule bg-sunk hover:border-muted text-muted"
                    }`}
                  >
                    {selected ? `✓ ${plat}` : `+ ${plat}`}
                  </button>
                );
              })}
            </div>

            <div className="flex max-w-md gap-2">
              <input
                type="text"
                className="field flex-1 text-xs py-1.5"
                placeholder="Add custom platform (e.g. Chrome Extension, CLI)..."
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomPlatform();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustomPlatform}
                className="btn btn-secondary text-xs px-3 py-1.5"
              >
                Add Platform
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Status & Timeline */}
        <section className="rounded-xl border border-rule bg-surface p-6 space-y-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-base font-semibold text-ink">3. Timeline & Lifecycle Status</h2>
            <p className="text-xs text-muted">Set project phase, schedule, and any active health alerts.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Project Status</label>
              <select
                className="field w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectData["status"])}
              >
                <option value="PLANNING">Planning (Architecture / Scoping)</option>
                <option value="ACTIVE">Active (In Active Execution)</option>
                <option value="ON_HOLD">On Hold (Paused)</option>
                <option value="BLOCKED">Blocked (Impediments Pending)</option>
                <option value="COMPLETED">Completed (Shipped)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Health / Blocker Note
              </label>
              <input
                type="text"
                className="field w-full"
                placeholder="e.g. Waiting on third-party security review"
                value={healthNote}
                onChange={(e) => setHealthNote(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Start Date</label>
              <input
                type="date"
                className="field w-full"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Target Completion Date</label>
              <input
                type="date"
                className="field w-full"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Leadership & Team Assignment */}
        <section className="rounded-xl border border-rule bg-surface p-6 space-y-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-base font-semibold text-ink">4. Leadership & Assigned Team</h2>
            <p className="text-xs text-muted">
              Assign project leadership and staff the team roster.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Project Lead <span className="text-muted">(Technical / Product Owner)</span>
              </label>
              <select
                className="field w-full"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
              >
                <option value="">Choose Project Lead...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.title ? `— ${emp.title}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Project Manager <span className="text-muted">(Delivery Manager)</span>
              </label>
              <select
                className="field w-full"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
              >
                <option value="">Choose Project Manager...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.title ? `— ${emp.title}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-ink">
                Assigned Team Members ({memberIds.length} assigned)
              </label>
              <input
                type="text"
                placeholder="Filter team..."
                className="field text-xs py-1 px-2.5 max-w-[200px]"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-rule p-2 divide-y divide-rule/40 bg-paper">
              {filteredEmployees.length === 0 ? (
                <p className="p-3 text-xs text-muted text-center">No matching employees found.</p>
              ) : (
                filteredEmployees.map((emp) => {
                  const selected = memberIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        selected ? "bg-accent/10 text-ink" : "hover:bg-sunk text-muted hover:text-ink"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMember(emp.id)}
                          className="rounded border-rule accent-accent h-4 w-4"
                        />
                        <div>
                          <p className="text-xs font-medium text-ink">{emp.name}</p>
                          {emp.title && <p className="text-[11px] text-muted">{emp.title}</p>}
                        </div>
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-rule/60">
                        {selected ? "Assigned" : "Click to assign"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
          <Link
            href="/projects"
            className="btn btn-secondary text-xs px-5 py-2.5"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isCreating || isUpdating || name.trim().length < 2}
            className="btn btn-primary text-xs px-6 py-2.5 cursor-pointer disabled:opacity-50 font-medium"
          >
            {isCreating || isUpdating
              ? "Saving..."
              : isEdit
              ? "Update Project"
              : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
