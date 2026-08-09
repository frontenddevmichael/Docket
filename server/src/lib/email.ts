import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY

let resend: Resend | null = null
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY)
}

const FROM_EMAIL = process.env.EMAIL_FROM ?? 'Docket <noreply@your-domain.com>'
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5175'

export function sendWorkspaceInvitation(params: {
  to: string
  inviterName: string
  workspaceName: string
  role: string
}): void {
  if (!resend) {
    console.log(`[email] Resend not configured. Would send workspace invitation to ${params.to} from ${params.inviterName} for workspace "${params.workspaceName}" as ${params.role}`)
    return
  }

  const roleLabel = params.role.charAt(0).toUpperCase() + params.role.slice(1)

  resend.emails.send({
    from: FROM_EMAIL,
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
          <a href="${CLIENT_ORIGIN}/invitations"
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
  if (!resend) {
    console.log(`[email] Resend not configured. Would send project assignment to ${params.to} for "${params.projectName}"`)
    return
  }

  resend.emails.send({
    from: FROM_EMAIL,
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
  if (!resend) {
    console.log(`[email] Resend not configured. Would send rejection notice to ${params.to} for "${params.projectName}": ${params.reason}`)
    return
  }

  resend.emails.send({
    from: FROM_EMAIL,
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
