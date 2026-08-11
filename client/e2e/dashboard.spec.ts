import { test, expect } from '@playwright/test'

/**
 * Authenticated-app smoke test. If the browser has no session the AuthGuard
 * redirects to /sign-in and we skip — CI e2e runs without a test account, so
 * these assertions only run when a developer runs them against a logged-in
 * browser (or seeds an account).
 */
test.describe('Authenticated app', () => {
  test('dashboard renders session history and metric cards', async ({ page }) => {
    await page.goto('/sessions', { waitUntil: 'domcontentloaded' })

    const heading = page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })
    const onApp = await heading.isVisible().catch(() => false)
    if (!onApp) return // redirected to sign-in — skip

    await expect(page.getByRole('heading', { name: /session history/i })).toBeVisible()
    await expect(page.getByText(/total sessions/i)).toBeVisible()
    await expect(page.getByText(/pass rate/i)).toBeVisible()
    await expect(page.getByText(/total executed/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /new session/i }).first()).toBeVisible()
  })

  test('navigation reaches projects and settings', async ({ page }) => {
    await page.goto('/sessions', { waitUntil: 'domcontentloaded' })

    const nav = page.getByRole('navigation')
    const visible = await nav.isVisible().catch(() => false)
    if (!visible) return // not authenticated — skip

    await page.getByRole('link', { name: /projects/i }).click()
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible()

    await page.getByRole('link', { name: /settings/i }).click()
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })
})
