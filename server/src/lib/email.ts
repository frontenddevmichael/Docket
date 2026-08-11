import { Resend } from 'resend'

// Env is read lazily (not at module scope) so that .env.local loaded by
// index.ts after imports is visible — see supabase-admin.ts for details.
let _resend: Resend | null | undefined
function getResend(): Resend | null {
  if (_resend !== undefined) return _resend
  const key = process.env.RESEND_API_KEY
  _resend = key ? new Resend(key) : null
  return _resend
}

const fromEmail = (): string => process.env.EMAIL_FROM ?? 'Docket <noreply@your-domain.com>'
const clientOrigin = (): string => process.env.CLIENT_ORIGIN ?? 'http://localhost:5175'

export function sendWorkspaceInvitation(params: {
  to: string
  inviterName: string
  workspaceName: string
  role: string
}): void {
  const resend = getResend()
  if (!resend) {
    console.log(`[email] Resend not configured. Would send workspace invitation to ${params.to} from ${params.inviterName} for workspace "${params.workspaceName}" as ${params.role}`)
    return
  }

  const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1)

  resend.emails.send({
    from: fromEmail(),
    to: params.to,
    subject: `You've been invited to ${params.workspaceName} on Docket`,
    html: `<table cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <tr><td style="padding:32px 24px;background:#1c1c1c;border-radius:8px">
    <h1 style="color:#e8e8e8;font-size:22px;margin:0 0 8px">You're invited!</h1>
    <p style="color:#ababab;font-size:14px;line-height:1.6;margin:0 0 20px">
      <strong style="color:#e8e8e8">${params.inviterName}</strong> has invited you to join
      <strong style="color:#e8e8e8">${params.workspaceName}</strong> as a
      <strong style="color:#e8e8e8">${roleLabel}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#d97706;border-radius:6px;padding:0">
          <a href="${clientOrigin()}/invitations"
             style="display:inline-block;padding:10px 24px;color:#1c1c1c;font-size:13px;font-weight:600;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px">
            View Invitation
          </a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>`,
  }).catch((err) => {
    console.error(`[email] Failed to send invitation to ${params.to}:`, err)
  })
}

export function sendProjectAssigned(params: {
  to: string
  projectName: string
  projectUrl: string
}): void {
  const resend = getResend()
  if (!resend) {
    console.log(`[email] Resend not configured. Would send project assignment to ${params.to} for "${params.projectName}"`)
    return
  }

  resend.emails.send({
    from: fromEmail(),
    to: params.to,
    subject: `Project assigned: ${params.projectName}`,
    html: `<table cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <tr><td style="padding:32px 24px;background:#1c1c1c;border-radius:8px">
    <h1 style="color:#e8e8e8;font-size:22px;margin:0 0 8px">A project has been assigned to you</h1>
    <p style="color:#ababab;font-size:14px;line-height:1.6;margin:0 0 20px">
      <strong style="color:#e8e8e8">${params.projectName}</strong> is waiting for review on Docket.
    </p>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#d97706;border-radius:6px;padding:0">
          <a href="${params.projectUrl}"
             style="display:inline-block;padding:10px 24px;color:#1c1c1c;font-size:13px;font-weight:600;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px">
            View Project
          </a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>`,
  }).catch((err) => {
    console.error(`[email] Failed to send project assignment to ${params.to}:`, err)
  })
}

export function sendProjectRejected(params: {
  to: string
  projectName: string
  reason: string
}): void {
  const resend = getResend()
  if (!resend) {
    console.log(`[email] Resend not configured. Would send rejection notice to ${params.to} for "${params.projectName}": ${params.reason}`)
    return
  }

  resend.emails.send({
    from: fromEmail(),
    to: params.to,
    subject: `Project rejected: ${params.projectName}`,
    html: `<table cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <tr><td style="padding:32px 24px;background:#1c1c1c;border-radius:8px">
    <h1 style="color:#e8e8e8;font-size:22px;margin:0 0 8px">A project request was rejected</h1>
    <p style="color:#ababab;font-size:14px;line-height:1.6;margin:0 0 16px">
      <strong style="color:#e8e8e8">${params.projectName}</strong> was rejected by the assigned tester.
    </p>
    <p style="color:#e8e8e8;font-size:13px;line-height:1.6;margin:0 0 20px;border-left:3px solid #d97706;padding:8px 12px;background:#2a2a2a">
      ${params.reason}
    </p>
  </td></tr>
</table>`,
  }).catch((err) => {
    console.error(`[email] Failed to send rejection notice to ${params.to}:`, err)
  })
}

export function sendIssueDraft(params: {
  to: string
  projectName: string
  defectCount: number
  issues: { severity: string; title: string; ref?: string | null }[]
  noteType: 'developer' | 'tester'
  url: string
}): void {
  const heading = params.noteType === 'developer'
    ? 'Test execution draft — defects assigned to you'
    : 'Test execution draft — fix verification requested'
  const message = params.noteType === 'developer'
    ? 'The tester has saved an execution draft. The following defects are assigned to you and need review:'
    : 'The developer has resolved items in the execution draft. Please verify the following:'

  const resend = getResend()
  if (!resend) {
    console.log(`[email] Resend not configured. Would send draft notice to ${params.to} for "${params.projectName}" (${params.defectCount} items)`)
    return
  }

  const listHtml = params.issues.map((i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #333"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#2a2a2a;color:#d97706;font-size:11px;font-weight:600;text-transform:uppercase">${i.severity}</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #333;color:#e8e8e8;font-size:13px">${i.title}${i.ref ? ` <span style="color:#8a8a8a">(${i.ref})</span>` : ''}</td>
    </tr>`).join('')

  resend.emails.send({
    from: fromEmail(),
    to: params.to,
    subject: `Execution draft: ${params.defectCount} item${params.defectCount === 1 ? '' : 's'} for ${params.projectName}`,
    html: `<table cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <tr><td style="padding:32px 24px;background:#1c1c1c;border-radius:8px">
    <h1 style="color:#e8e8e8;font-size:20px;margin:0 0 8px">${heading}</h1>
    <p style="color:#ababab;font-size:14px;line-height:1.6;margin:0 0 16px">${message}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
      <tr><td style="padding:6px 12px;font-size:11px;color:#8a8a8a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #444">Severity</td>
          <td style="padding:6px 12px;font-size:11px;color:#8a8a8a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #444">Defect</td></tr>
      ${listHtml}
    </table>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#d97706;border-radius:6px;padding:0">
          <a href="${params.url}" style="display:inline-block;padding:10px 24px;color:#1c1c1c;font-size:13px;font-weight:600;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px">
            Open Issue Log
          </a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>`,
  }).catch((err) => {
    console.error(`[email] Failed to send draft notice to ${params.to}:`, err)
  })
}
