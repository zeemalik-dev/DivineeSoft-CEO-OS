import { baseApi } from "@/redux/baseApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  project: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  blockerNote: string | null;
  overdue: boolean;
};

export type PendingTask = {
  id: string;
  title: string;
  rationale: string | null;
  assignee: string | null;
};

export type UpdateTaskBody = {
  status?: string;
  progress?: number;
  comment?: string;
  blockerNote?: string;
};

// ─── API ──────────────────────────────────────────────────────────────────────

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // My tasks board (assigned to current user, approved only)
    getMyTasks: builder.query<{ tasks: BoardTask[] }, { employeeId: string; role: string }>({
      query: ({ employeeId, role }) => {
        if (role === "CEO") {
          // CEO sees both personal and assigned tasks
          return `/tasks?kind=CEO_PERSONAL`;
        }
        return `/tasks?assigneeId=${employeeId}&approvalState=APPROVED`;
      },
      // Transform to add overdue flag (the API doesn't set it)
      transformResponse: (response: { tasks: Array<Omit<BoardTask, "overdue"> & { dueDate: string | null; status: string; project?: { name: string } | null }> }) => ({
        tasks: response.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          project: (t as any).project?.name ?? null,
          status: t.status,
          priority: t.priority,
          progress: t.progress,
          dueDate: t.dueDate,
          blockerNote: t.blockerNote,
          overdue: Boolean(t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED"),
        })),
      }),
      providesTags: ["Task"],
    }),

    // CEO personal tasks (separate list)
    getCeoPersonalTasks: builder.query<{ tasks: BoardTask[] }, void>({
      query: () => `/tasks?kind=CEO_PERSONAL`,
      transformResponse: (response: { tasks: Array<Omit<BoardTask, "overdue"> & { dueDate: string | null; status: string; project?: { name: string } | null }> }) => ({
        tasks: response.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          project: (t as any).project?.name ?? null,
          status: t.status,
          priority: t.priority,
          progress: t.progress,
          dueDate: t.dueDate,
          blockerNote: t.blockerNote,
          overdue: Boolean(t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED"),
        })),
      }),
      providesTags: ["Task"],
    }),

    // Pending approvals for CEO dashboard
    getPendingApprovals: builder.query<{ tasks: PendingTask[] }, void>({
      query: () => `/tasks?approvalState=PENDING_APPROVAL`,
      transformResponse: (response: { tasks: Array<{ id: string; title: string; aiRationale: string | null; assignee: { user: { name: string } } | null }> }) => ({
        tasks: response.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          rationale: t.aiRationale,
          assignee: t.assignee?.user.name ?? null,
        })),
      }),
      providesTags: ["Task"],
    }),

    // Update a task (status, progress, comment, blocker)
    updateTask: builder.mutation<{ task: BoardTask }, { id: string; body: UpdateTaskBody }>({
      query: ({ id, body }) => ({
        url: `/tasks/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Task"],
    }),

    // CEO approve or reject a suggested task
    approveTask: builder.mutation<{ task: unknown }, { id: string; decision: "APPROVE" | "REJECT" }>({
      query: ({ id, decision }) => ({
        url: `/tasks/${id}/approve`,
        method: "POST",
        body: { decision },
      }),
      invalidatesTags: ["Task", "Dashboard"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyTasksQuery,
  useGetCeoPersonalTasksQuery,
  useGetPendingApprovalsQuery,
  useUpdateTaskMutation,
  useApproveTaskMutation,
} = tasksApi;
