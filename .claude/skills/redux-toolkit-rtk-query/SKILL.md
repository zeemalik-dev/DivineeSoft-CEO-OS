---
name: redux-rtk
description: Redux Toolkit and RTK Query patterns. Use when editing slice files, API definitions, store configuration, selectors, or any file importing from @reduxjs/toolkit.
---

## Quick Reference

### RTK Query Setup
```typescript
// store/api/baseApi.ts — ONE base API per backend
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['User', 'Post', 'Comment'], // ALL tag types here
  endpoints: () => ({}), // Injected from feature files
});

// store/api/usersApi.ts — inject endpoints per feature
export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], { role?: string }>({
      query: (params) => ({ url: 'users', params }),
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'User' as const, id })), 'User']
          : ['User'],
    }),
  }),
});
export const { useGetUsersQuery } = usersApi;
```

### Slice Pattern
```typescript
// store/slices/uiSlice.ts
interface UiState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarCollapsed: false, theme: 'system' } as UiState,
  reducers: {
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setTheme: (state, action: PayloadAction<UiState['theme']>) => { state.theme = action.payload; },
  },
});
```

### Selector Pattern
```typescript
// store/selectors/userSelectors.ts
import { createSelector } from '@reduxjs/toolkit';

const selectUsersState = (state: RootState) => state.users;

export const selectActiveUsers = createSelector(
  selectUsersState,
  (users) => users.ids.filter(id => users.entities[id]?.status === 'active')
);
```

### Typed Hooks
```typescript
// store/hooks.ts — USE THESE, not raw useDispatch/useSelector
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

### Server-Side Performance

```typescript
// server-parallel-fetching: independent fetches in RSC must run in parallel
// BAD: parent fetches sequentially, children wait
async function Page() {
  const user = await getUser();          // 200ms
  const posts = await getPosts();        // 300ms  — total: 500ms
  return <Dashboard user={user} posts={posts} />;
}
// GOOD: sibling components fetch independently, React streams both
async function Page() {
  return (
    <>
      <Suspense fallback={<UserSkeleton />}>
        <UserSection />   {/* fetches getUser() internally */}
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <PostsSection />  {/* fetches getPosts() internally */}
      </Suspense>
    </>
  );  // total: max(200, 300) = 300ms
}

// server-serialization: minimize Server → Client data transfer
// BAD: passes entire object with unused fields
<ClientComponent user={fullUserObject} />
// GOOD: select only needed fields
<ClientComponent userName={user.name} userAvatar={user.avatar} />

// server-cache-react: React.cache() for per-request deduplication in RSC
import { cache } from 'react';
const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
// Multiple components call getUser(id) — only ONE query runs per request

// server-cache-lru: cross-request cache for expensive computations
import { LRUCache } from 'lru-cache';
const cache = new LRUCache<string, ComputedResult>({
  max: 500,
  ttl: 1000 * 60 * 5,  // 5 minutes
});

export async function getExpensiveData(key: string) {
  const cached = cache.get(key);
  if (cached) return cached;
  const result = await computeExpensiveData(key);
  cache.set(key, result);
  return result;
}
```

### Client Data Deduplication

```typescript
// client-swr-dedup: when NOT using RTK Query, use SWR for deduplication
// SWR automatically deduplicates identical requests across components
import useSWR from 'swr';
const fetcher = (url: string) => fetch(url).then(r => r.json());

function UserName({ id }: { id: string }) {
  const { data } = useSWR(`/api/users/${id}`, fetcher);
  return <span>{data?.name}</span>;
}
// If 5 components call useSWR('/api/users/1'), only 1 request fires

// NOTE: If RTK Query is in the project, use RTK Query instead (Iron Law 15)
```

For detailed patterns, see `references/` directory.
