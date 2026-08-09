import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete } from '@/lib/api'

async function deleteSession(id: string) {
  await apiDelete(`/api/sessions/${id}`)
}

export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-with-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
