import { useQuery } from '@tanstack/react-query'
import { getTodoistApi } from './todoist'
import { queryKeys } from './query-keys'

export function useTodoistUser() {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: () => getTodoistApi().getUser(),
  })
}
