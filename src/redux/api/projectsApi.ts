import { baseApi } from "@/redux/baseApi";

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder: any) => ({
    getProjects: builder.query({
      query: () => "/projects",
      providesTags: (result: any) =>
        result?.projects
          ? [
              ...result.projects.map(({ id }: any) => ({ type: "Project", id })),
              { type: "Project", id: "LIST" },
            ]
          : [{ type: "Project", id: "LIST" }],
    }),
    getProjectById: builder.query({
      query: (id: string) => `/projects/${id}`,
      providesTags: (_result: any, _error: any, id: string) => [{ type: "Project", id }],
    }),
    createProject: builder.mutation({
      query: (body: any) => ({
        url: "/projects",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Project", id: "LIST" }],
    }),
    updateProject: builder.mutation({
      query: ({ id, ...body }: any) => ({
        url: `/projects/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result: any, _error: any, { id }: any) => [
        { type: "Project", id },
        { type: "Project", id: "LIST" },
      ],
    }),
    deleteProject: builder.mutation({
      query: (id: string) => ({
        url: `/projects/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Project", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectsApi as any;
