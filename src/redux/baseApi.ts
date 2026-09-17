import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl,
  }),
  tagTypes: ["Auth", "User", "Task", "Employee", "Project", "Notification", "Dashboard", "DailyUpdate"],
  endpoints: () => ({}),
});
