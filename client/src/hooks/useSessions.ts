import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Session } from '@/types/database'

const PAGE_LIMIT = 50

async function fetchSessions(page: number = 0): Promise<Session[]> {
  const from = page * PAGE_LIMIT
  const to = from + PAGE_LIMIT - 1
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return data
}

export function useSessions(page: number = 0) {
  return useQuery({
    queryKey: ['sessions', page],
    queryFn: () => fetchSessions(page),
  })
}

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('sessions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
