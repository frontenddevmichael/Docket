/**
 * Remembers the email used at sign-up so the sign-in screen can prefill it —
 * the flow after email confirmation goes sign-up -> verify -> sign-in, and
 * re-typing the address is friction. Cleared once sign-in succeeds.
 */
const KEY = 'docket:signup-email'

export function getRememberedEmail(): string {
  return localStorage.getItem(KEY) ?? ''
}

export function rememberEmail(email: string) {
  localStorage.setItem(KEY, email)
}

export function clearRememberedEmail() {
  localStorage.removeItem(KEY)
}
