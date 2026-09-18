"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Progress, Status } from "@/components/ui";
import {
  useGetProjectsQuery,
  useDeleteProjectMutation,
} from "@/redux/api/projectsApi";

type EmployeeOption = {
  id: string;
  name: string;
  title?: string | null;
};

type ProjectItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  platforms: string[];
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "BLOCKED" | "COMPLETED" | "ARCHIVED";
  healthNote?: string | null;
  startedAt?: string | null;
  dueDate?: string | null;
  leadId?: string | null;
  lead?: { id: string; name: string; title?: string | null } | null;
  managerId?: string | null;
  manager?: { id: string; name: string; title?: string | null } | null;
  members: { id: string; employeeId: string; name: string; roleOnProject: string }[];
  totalTasks: number;
  openTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  progress: number;
  health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "BLOCKED" | "DONE";
};

type ProjectClientProps = {
  initialProjects: ProjectItem[];
  employees: EmployeeOption[];
  canManage: boolean;
  canDelete: boolean;
  userRole?: string;
};

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PLANNING", label: "Planning" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export function ProjectClient({
  initialProjects,
  canManage,
  canDelete,
  userRole,
}: ProjectClientProps) {
  const router = useRouter();
  const { data: queryData, isLoading: queryLoading } = useGetProjectsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  const projects: ProjectItem[] = queryData?.projects ?? initialProjects;

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [showPermissionNotice, setShowPermissionNotice] = useState(false);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id).unwrap();
      setDeleteTarget(null);
      router.refresh();
    } catch (err: any) {
      alert(err?.data?.error ?? "Failed to delete project.");
    }
  }

  // Filter & Search Logic
  const filteredProjects = projects.filter((project) => {
    const matchesStatus =
      statusFilter === "ALL" || project.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (project.lead && project.lead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      project.platforms.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;
  const atRiskCount = projects.filter((p) => ["AT_RISK", "DELAYED", "BLOCKED"].includes(p.health)).length;
  const completedCount = projects.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h1 className="page-title">Project Command Center</h1>
          <p className="mt-1 text-sm text-muted">
            Track execution, project health, deadlines, and ownership across all company initiatives.
          </p>
        </div>

        {canManage ? (
          <Link
            id="new-project-btn"
            href="/projects/new"
            className="btn btn-primary cursor-pointer flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </Link>
        ) : (
          <button
            id="new-project-btn"
            type="button"
            onClick={() => setShowPermissionNotice(true)}
            className="btn btn-primary cursor-pointer flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </button>
        )}
      </header>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="metric-card">
          <span>Total Tracked</span>
          <strong>{projects.length}</strong>
        </div>
        <div className="metric-card">
          <span>Active Initiatives</span>
          <strong className="text-ontrack">{activeCount}</strong>
        </div>
        <div className="metric-card">
          <span>At Risk / Blocked</span>
          <strong className={atRiskCount > 0 ? "text-blocked" : "text-muted"}>
            {atRiskCount}
          </strong>
        </div>
        <div className="metric-card">
          <span>Completed</span>
          <strong>{completedCount}</strong>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`filter-chip ${statusFilter === tab.value ? "filter-chip-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative min-w-[240px] max-w-xs flex-1">
          <input
            type="text"
            className="field w-full py-1.5 pl-8 pr-3 text-xs"
            placeholder="Search projects, platforms, leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Project Table / List */}
      <section className="panel">
        <header className="panel-head flex items-center justify-between">
          <h2>
            Projects ({filteredProjects.length})
          </h2>
          {queryLoading && <span className="text-xs text-muted animate-pulse">Refreshing...</span>}
        </header>

        {filteredProjects.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted">
            <p className="text-sm">No projects match the selected filter.</p>
            {canManage && (
              <Link
                href="/projects/new"
                className="btn btn-secondary mt-3 inline-flex text-xs"
              >
                Create a project
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group px-[18px] py-4 transition-colors hover:bg-sunk"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left Column: Title, Description, Platforms */}
                  <div className="space-y-1.5 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-semibold text-base text-ink hover:underline hover:text-accent transition-colors"
                      >
                        {project.name}
                      </Link>
                      <span className="text-xs px-2 py-0.5 rounded border border-rule text-muted">
                        {project.status.replace(/_/g, " ")}
                      </span>
                      <Status value={project.health} />
                    </div>

                    {project.description && (
                      <p className="text-xs text-muted line-clamp-2 max-w-2xl">
                        {project.description}
                      </p>
                    )}

                    {project.platforms && project.platforms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {project.platforms.map((plat) => (
                          <span
                            key={plat}
                            className="inline-block rounded bg-rule/50 px-1.5 py-0.5 text-[10px] font-medium text-ink"
                          >
                            {plat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Progress, Stats, Dates */}
                  <div className="flex flex-wrap items-center gap-6 text-xs text-muted">
                    {/* Progress Bar */}
                    <div className="w-28 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>Progress</span>
                        <span className="font-medium text-ink">{project.progress}%</span>
                      </div>
                      <Progress
                        value={project.progress}
                        tone={
                          project.health === "ON_TRACK" || project.health === "DONE"
                            ? "ontrack"
                            : project.health === "BLOCKED"
                            ? "blocked"
                            : "risk"
                        }
                      />
                    </div>

                    {/* Task Counts */}
                    <div className="space-y-0.5 min-w-[85px]">
                      <span className="text-ink font-medium">{project.openTasks} open</span>
                      <span className="block text-[11px]">
                        {project.totalTasks} total tasks
                      </span>
                    </div>

                    {/* Ownership */}
                    <div className="space-y-0.5 min-w-[100px]">
                      <span className="text-[11px] block">Lead:</span>
                      <span className="text-ink font-medium truncate block max-w-[120px]">
                        {project.lead?.name ?? "Unassigned"}
                      </span>
                    </div>

                    {/* Deadline */}
                    <div className="space-y-0.5 min-w-[90px]">
                      <span className="text-[11px] block">Due date:</span>
                      <span
                        className={`font-medium block ${
                          project.overdueTasks > 0 ? "text-blocked" : "text-ink"
                        }`}
                      >
                        {project.dueDate
                          ? new Date(project.dueDate).toLocaleDateString([], {
                              day: "numeric",
                              month: "short",
                            })
                          : "No deadline"}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 pt-2 lg:pt-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="btn btn-secondary text-xs py-1 px-2.5"
                    >
                      Overview
                    </Link>

                    <Link
                      href={`/tasks?projectId=${project.id}`}
                      className="btn btn-secondary text-xs py-1 px-2.5"
                    >
                      Tasks
                    </Link>

                    {canManage ? (
                      <Link
                        href={`/projects/${project.id}/edit`}
                        className="btn btn-secondary text-xs py-1 px-2.5"
                      >
                        Edit
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPermissionNotice(true)}
                        className="btn btn-secondary text-xs py-1 px-2.5 opacity-60"
                      >
                        Edit
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(project)}
                        className="btn text-xs py-1 px-2.5 text-blocked hover:bg-blocked/10 transition-colors"
                        title="Delete Project (CEO Only)"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PERMISSION NOTICE MODAL */}
      {showPermissionNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-rule bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-risk">
              <div className="rounded-full bg-risk/10 p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-ink">Permission Required</h3>
            </div>

            <p className="text-sm text-muted">
              Only users with the <strong className="text-ink">CEO</strong> or <strong className="text-ink">Manager</strong> role can create or edit projects.
            </p>

            <div className="rounded-lg bg-sunk p-3 text-xs text-muted space-y-1">
              <p>Your current role: <span className="font-semibold text-ink">{userRole ?? "EMPLOYEE"}</span></p>
              <p>To create or edit projects, please sign in with a Manager or CEO account.</p>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPermissionNotice(false)}
                className="btn btn-primary text-xs px-4 py-2"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-rule bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-blocked">
              <div className="rounded-full bg-blocked/10 p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-ink">Delete Project</h3>
            </div>

            <p className="text-sm text-muted">
              Are you sure you want to permanently delete{" "}
              <strong className="text-ink">“{deleteTarget.name}”</strong>?
            </p>

            <div className="rounded-lg bg-rule/30 p-3 text-xs text-muted">
              ℹ️ Associated tasks will <strong className="text-ink">not</strong> be deleted; they will be unlinked and remain in your task register.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn btn-secondary text-xs px-4 py-2"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="btn bg-blocked text-white text-xs px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
