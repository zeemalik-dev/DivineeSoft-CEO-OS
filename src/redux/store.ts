import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/redux/baseApi";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});
