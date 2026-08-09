import { supabaseAdmin } from './supabase-admin.js'

export type TrackingEventType =
  | 'session_created'
  | 'generation_started'
  | 'generation_completed'
  | 'test_case_edited'
  | 'test_case_deleted'
  | 'test_case_kept'
  | 'execution_marked'
  | 'report_generated'
  | 'session_completed'

export async function trackEvent(params: {
  userId: string
  workspaceId?: string
  sessionId?: string
  eventType: TrackingEventType
  eventData?: Record<string, unknown>
}) {
  try {
    await supabaseAdmin.from('tracking_events').insert({
      user_id: params.userId,
      workspace_id: params.workspaceId,
      session_id: params.sessionId,
      event_type: params.eventType,
      event_data: params.eventData ?? {},
    })
  } catch (err) {
    // Tracking should never break the main flow
    console.error('Tracking error:', err)
  }
}
