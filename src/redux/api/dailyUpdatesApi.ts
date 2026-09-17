import { baseApi } from "@/redux/baseApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DailyUpdate = {
  id: string;
  didToday: string;
  planNext: string | null;
  blockers: string | null;
  forDate: string;
};

export type SaveDailyUpdateBody = {
  didToday: string;
  planNext?: string;
  blockers?: string;
};

// ─── API ──────────────────────────────────────────────────────────────────────

export const dailyUpdatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get today's update for the current user
    getTodayUpdate: builder.query<{ update: DailyUpdate | null }, void>({
      query: () => "/daily-updates",
      transformResponse: (response: { updates: DailyUpdate[] }) => ({
        // The API returns all updates ordered by date desc — first is today's
        update: response.updates[0] ?? null,
      }),
      providesTags: ["DailyUpdate"],
    }),

    // Save / upsert today's update
    saveDailyUpdate: builder.mutation<{ update: DailyUpdate }, SaveDailyUpdateBody>({
      query: (body) => ({
        url: "/daily-updates",
        method: "POST",
        body,
      }),
      invalidatesTags: ["DailyUpdate"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetTodayUpdateQuery, useSaveDailyUpdateMutation } = dailyUpdatesApi;
