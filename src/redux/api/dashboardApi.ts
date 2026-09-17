import { baseApi } from "@/redux/baseApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompanyOverview = {
  totalEmployees: number;
  activeEmployees: number;
  employeesWithoutActiveTask: number;
  activeProjects: number;
  projectsAtRisk: number;
  tasksInProgress: number;
  completedToday: number;
  overdue: number;
  blocked: number;
  upcomingDeadlines: number;
  pendingApproval: number;
  awaitingReview: number;
};

export type TeamRow = {
  employeeId: string;
  name: string;
  email: string;
  title: string;
  currentProject: string | null;
  currentTask: string | null;
  taskStatus: string;
  progress: number;
  lastUpdateAt: string | null;
  blocker: string | null;
  openTasks: number;
  overdueTasks: number;
};

export type ProjectRow = {
  id: string;
  name: string;
  status: string;
  progress: number;
  openTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  lead: string | null;
  dueDate: string | null;
  health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "BLOCKED" | "DONE";
};

export type RiskData = {
  blockedTasks: { id: string; title: string; blockerNote: string | null; assignee: { user: { name: string } } | null }[];
  dueSoon: { id: string; title: string; dueDate: string | null; assignee: { user: { name: string } } | null }[];
  openProblems: { id: string; title: string; severity: string }[];
};

export type ActivityEvent = {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
};

export type SuggestedTask = {
  id: string;
  title: string;
  rationale: string | null;
  assignee: string | null;
};

export type DashboardData = {
  overview: CompanyOverview;
  team: TeamRow[];
  projects: ProjectRow[];
  risks: RiskData;
  activity: ActivityEvent[];
  suggested: SuggestedTask[];
  focus: string[];
};

// ─── API ──────────────────────────────────────────────────────────────────────

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardData, void>({
      query: () => "/dashboard",
      providesTags: ["Dashboard"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardQuery } = dashboardApi;
