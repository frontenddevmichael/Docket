import { supabaseAdmin } from './supabase-admin.js'

export async function logActivity(
  sessionId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin.from('activity_log').insert({
      session_id: sessionId,
      user_id: userId,
      action,
      details: details ?? null,
    })
  } catch (err) {
    console.warn(`[activity-log] failed to log action=${action} session=${sessionId.slice(0, 8)}:`, err)
  }
}
