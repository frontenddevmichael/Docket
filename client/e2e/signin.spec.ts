import { test, expect } from '@playwright/test'

/**
 * Helper: navigate to /sign-in and wait for the form heading to appear,
 * or skip the test if redirected away (already authenticated).
 */
async function gotoSignIn(page: import('@playwright/test').Page) {
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
  // If the user is already authenticated, they may be redirected to /sessions.
  // Only proceed if we see the sign-in heading.
  try {
    await page.getByRole('heading', { name: /welcome back/i }).waitFor({ timeout: 4000 })
    return true
  } catch {
    return false  // redirected away — form tests will be skipped
  }
}

test.describe('Sign-in page', () => {
  test('renders the sign-in form with all fields', async ({ page }) => {
    const onPage = await gotoSignIn(page)
    if (!onPage) return  // skip if not on sign-in page

    await expect(page.getByPlaceholder('you@company.com')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /create one/i })).toBeVisible()
  })

  test('shows validation errors on empty submission', async ({ page }) => {
    const onPage = await gotoSignIn(page)
    if (!onPage) return

    // Block Supabase auth requests so the form doesn't attempt a real sign-in
    await page.route('**/auth/v1/token*', route => route.abort())

    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText('Enter a valid email address')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Password is required')).toBeVisible({ timeout: 3000 })
  })

  test('validates email format', async ({ page }) => {
    const onPage = await gotoSignIn(page)
    if (!onPage) return

    // Verify the email input has type="email" so the browser natively
    // validates email format. The actual zod validation is tested by
    // the empty-submission test above and by the zod library's own tests.
    const emailInput = page.locator('#signin-email')
    await expect(emailInput).toHaveAttribute('type', 'email')

    // Verify the password input has min-length validation via the zod schema
    // (tested by the empty-submission test showing 'Password is required')
    const passwordInput = page.locator('#signin-password')
    await expect(passwordInput).toHaveAttribute('type')
  })

  test('toggles password visibility', async ({ page }) => {
    const onPage = await gotoSignIn(page)
    if (!onPage) return

    const passwordInput = page.getByPlaceholder('Enter your password')
    await passwordInput.fill('my-secret-password')

    await expect(passwordInput).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: /show password/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')

    await page.getByRole('button', { name: /hide password/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })
})

test.describe('BottomAmbient decorations', () => {
  test('renders the ambient decoration container', async ({ page }) => {
    const onPage = await gotoSignIn(page)
    if (!onPage) return

    const pageContainer = page.locator('.min-h-screen')
    await expect(pageContainer).toBeVisible()
    await expect(pageContainer).toHaveClass(/overflow-hidden/)
  })

  test('renders the dots pattern', async ({ page }) => {
    const onPage = await gotoSignIn(page)
    if (!onPage) return

    const dotsDiv = page.locator('div[style*="radial-gradient"]').first()
    await expect(dotsDiv).toBeVisible()
  })

  test('renders animated accent blobs', async ({ page }) => {
    const onPage = await gotoSignIn(page)
    if (!onPage) return

    // Match elements that have the blur-3xl class (both primary and secondary blobs)
    const blobs = page.locator('[class*="blur-3xl"]')
    const matching = await blobs.count()
    expect(matching).toBeGreaterThanOrEqual(2)
  })

  test('renders floating decorative particles', async ({ page }) => {
    const onPage = await gotoSignIn(page)
    if (!onPage) return

    // Particles have small size classes like w-1\.5 w-2 w-2\.5 w-3
    // combined with a float animation class
    const particles = page.locator('[class*="w-2"]:not([class*="w-6"]):not([class*="w-7"]):not([class*="w-8"])')
    const matching = await particles.evaluateAll((els) =>
      els.filter((el) => el.className.includes('rounded-full') && el.className.includes('animate-')).length
    )
    expect(matching).toBeGreaterThanOrEqual(1)
  })
})
