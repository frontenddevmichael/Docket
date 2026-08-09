import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'

export interface RoleInfo {
  role: string | null
  workspaceId: string | null
  isManager: boolean
  isAdmin: boolean
}

export function useRole(): RoleInfo {
  const { user } = useAuth()
  const { data } = useQuery({
    queryKey: ['my-role'],
    queryFn: async () => {
      const res = await apiGet<{ members: { user_id: string; role: string }[]; workspace_id: string }>(
        '/api/workspace/members',
      )
      const me = res.members.find((m) => m.user_id === user?.id)
      return { role: me?.role ?? null, workspaceId: res.workspace_id }
    },
    enabled: !!user,
    staleTime: 60_000,
  })

  const role = data?.role ?? null
  return {
    role,
    workspaceId: data?.workspaceId ?? null,
    isManager: role === 'owner' || role === 'admin' || role === 'manager',
    isAdmin: role === 'owner' || role === 'admin',
  }
}