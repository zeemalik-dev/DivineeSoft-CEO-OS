"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeleteProjectMutation } from "@/redux/api/projectsApi";

type Props = {
  projectId: string;
  projectName: string;
  canManage: boolean;
  canDelete: boolean;
};

export function ProjectDetailActions({
  projectId,
  projectName,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  async function handleDelete() {
    try {
      await deleteProject(projectId).unwrap();
      setDeleteModalOpen(false);
      router.push("/projects");
      router.refresh();
    } catch (err: any) {
      alert(err?.data?.error ?? "Failed to delete project.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/tasks?projectId=${projectId}`}
          className="btn btn-secondary text-xs px-3.5 py-2"
        >
          View Tasks
        </Link>

        {canManage && (
          <Link
            href={`/projects/${projectId}/edit`}
            className="btn btn-primary text-xs px-4 py-2"
          >
            Edit Project
          </Link>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="btn text-xs px-3 py-2 text-blocked hover:bg-blocked/10 border border-blocked/30 transition-colors cursor-pointer"
          >
            Delete
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
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
              Are you sure you want to delete <strong className="text-ink">“{projectName}”</strong>?
            </p>

            <div className="rounded-lg bg-rule/30 p-3 text-xs text-muted">
              ℹ️ Tasks belonging to this project will <strong className="text-ink">not</strong> be deleted; they will simply be unlinked and remain available on the task board.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="btn btn-secondary text-xs px-4 py-2"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn bg-blocked text-white text-xs px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
