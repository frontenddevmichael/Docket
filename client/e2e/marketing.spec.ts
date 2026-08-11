import { test, expect } from '@playwright/test'

/**
 * Marketing landing page smoke tests. These force an unauthenticated
 * session (clear storage) so the landing page renders instead of the
 * auth guard redirecting to /sessions.
 */
async function gotoMarketing(page: import('@playwright/test').Page) {
  await page.context().clearCookies()
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /verdict.*stamped/i }).waitFor({ timeout: 6000 })
}

test.describe('Marketing page', () => {
  test('renders hero headline, CTA, and live mockup', async ({ page }) => {
    await gotoMarketing(page)

    await expect(page.getByRole('heading', { name: /verdict.*stamped/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible()
    await expect(page.getByText('Login rejects short password').first()).toBeVisible()
  })

  test('renders pricing tiers and report showcase', async ({ page }) => {
    await gotoMarketing(page)

    await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Enterprise', { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/A report your team can actually read/i).first()).toBeVisible()
  })

  test('logo wall is an infinite marquee that pauses on hover', async ({ page }) => {
    await gotoMarketing(page)

    const track = page.locator('.logo-marquee-track')
    await expect(track).toBeVisible()

    // Two copies of the logo list are rendered for a seamless loop.
    await expect(track.getByText('NORTHWIND', { exact: true })).toHaveCount(2)

    // The marquee keyframe is active in normal motion.
    const animName = await track.evaluate((el) => getComputedStyle(el).animationName)
    expect(animName).toBe('logo-marquee')

    // Hovering the group pauses the animation (hover the stable container,
    // not the moving track).
    await page.locator('.group:has(.logo-marquee-track)').hover()
    const playState = await track.evaluate((el) => getComputedStyle(el).animationPlayState)
    expect(playState).toBe('paused')

    // A static list is exposed to screen readers instead of the moving track.
    await expect(page.locator('ul.sr-only').getByText('NORTHWIND', { exact: true })).toBeVisible()
  })

  test('hero CTA navigates to sign-up', async ({ page }) => {
    await gotoMarketing(page)

    await page.getByRole('link', { name: /get started/i }).first().click()
    await expect(page).toHaveURL(/\/sign-up/)
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
  })
})
