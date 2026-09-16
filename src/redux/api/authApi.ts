import { baseApi } from "@/redux/baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder: any) => ({
    login: builder.mutation({
      query: (credentials: any) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),
    getMe: builder.query({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useLogoutMutation, useGetMeQuery } = authApi as any;

