import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TestCase } from '@/types/database'

async function fetchTestCases(sessionId: string): Promise<TestCase[]> {
  const { data, error } = await supabase
    .from('test_cases')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export function useTestCases(sessionId: string) {
  return useQuery({
    queryKey: ['test-cases', sessionId],
    queryFn: () => fetchTestCases(sessionId),
    enabled: !!sessionId,
  })
}

export function useUpdateTestCase(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestCase> & { id: string }) => {
      const { error } = await supabase
        .from('test_cases')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', sessionId] })
    },
  })
}

export function useDeleteTestCase(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Set feedback to 'deleted' before removing the row
      const { error: feedbackError } = await supabase
        .from('test_cases')
        .update({ feedback: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (feedbackError) throw feedbackError

      const { error } = await supabase
        .from('test_cases')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', sessionId] })
    },
  })
}

export function useReorderTestCases(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reordered: { id: string; sort_order: number }[]) => {
      const { error } = await (supabase.rpc as any)('batch_reorder_test_cases', {
        p_updates: reordered,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', sessionId] })
    },
  })
}

export function useAddTestCase(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (testCase: {
      session_id: string
      workspace_id: string
      title: string
      steps: string[]
      expected_result: string
      created_by: string
      sort_order: number
    }) => {
      const { error, data } = await supabase
        .from('test_cases')
        .insert({
          ...testCase,
          steps: JSON.stringify(testCase.steps),
          status: 'not_run',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', sessionId] })
    },
  })
}

export function useDuplicateTestCase(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (testCase: TestCase) => {
      const { error, data } = await supabase
        .from('test_cases')
        .insert({
          session_id: testCase.session_id,
          workspace_id: testCase.workspace_id,
          title: `${testCase.title} (copy)`,
          preconditions: testCase.preconditions,
          steps: testCase.steps,
          expected_result: testCase.expected_result,
          source_ref: testCase.source_ref,
          sort_order: testCase.sort_order + 1,
          status: 'not_run',
          created_by: testCase.created_by,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', sessionId] })
    },
  })
}
