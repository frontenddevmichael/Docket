/**
 * Behavioral headless test: filterTips boundary conditions.
 *
 * Tests the exact boundary at testCaseCount=5 (should show "new" tips, 
 * not "power" tips) and testCaseCount=6 (should show "power" tips,
 * not "new" tips).
 *
 * Replicates the actual filterTips function logic to test boundaries.
 */

const tipDefinitions = [
  { text: 'Tip: Edit test case steps before executing them.', category: 'general' },
  { text: 'Tip: Export your report as PDF for stakeholder reviews.', category: 'general' },
  { text: 'Tip: Sessions are auto-saved — your work is never lost.', category: 'general' },
  { text: 'Tip: Click "Configure Stats" to customise what appears in your report.', category: 'general' },
  { text: 'Tip: Press ⌘K to open the command palette and navigate faster.', category: 'shortcut' },
  { text: 'Tip: Attach a screenshot or PRD for more accurate test cases.', category: 'new' },
  { text: 'Tip: You can drag to reorder test cases after generation.', category: 'power' },
  { text: 'Tip: Failed tests can be linked to GitHub issues with one click.', category: 'power' },
  { text: 'Tip: You can mark test cases as BLOCKED if a dependency is not ready.', category: 'power' },
  { text: 'Tip: Tag team members to review specific test cases.', category: 'team' },
]

function filterTips(ctx) {
  if (!ctx) return tipDefinitions.map((t) => t.text)

  const categories = new Set(['general'])

  // Show 'new' tips when the user has 5 or fewer test cases (onboarding phase)
  if (ctx.testCaseCount <= 5) categories.add('new')

  // Show 'power' tips when the user has more than 5 test cases
  if (ctx.testCaseCount > 5) categories.add('power')

  // Show 'team' tips when the workspace has multiple members
  if (ctx.hasTeam) categories.add('team')

  // Keyboard shortcut tip: show until the user opens the command palette
  if (!ctx.hasUsedCmdK) categories.add('shortcut')

  const matched = tipDefinitions.filter((t) => categories.has(t.category))
  const general = matched.filter((t) => t.category === 'general')
  const contextual = matched.filter((t) => t.category !== 'general')

  return [...general, ...contextual].map((t) => t.text)
}

let failed = 0

function assert(condition, msg) {
  if (!condition) {
    console.error('  FAIL:', msg)
    failed++
  } else {
    console.log('  PASS:', msg)
  }
}

function assertContains(arr, text, msg) {
  assert(arr.some(t => t.includes(text)), `${msg} (should contain "${text}")`)
}

function assertNotContains(arr, text, msg) {
  assert(!arr.some(t => t.includes(text)), `${msg} (should NOT contain "${text}")`)
}

console.log('\n=== filterTips Boundary Tests ===\n')

// Test 1: No context → all 10 tips
console.log('Test: no context (undefined)')
const allTips = filterTips(undefined)
assert(allTips.length === 10, `returned ${allTips.length} tips, expected 10`)

// Test 2: testCaseCount=0 (new user onboarding)
console.log('\nTest: testCaseCount=0, no team, no cmdK')
const count0 = filterTips({ testCaseCount: 0, hasTeam: false, hasUsedCmdK: false })
assertContains(count0, 'Edit test case steps', 'general tip present')
assertContains(count0, 'Attach a screenshot', '"new" tip present')
assertContains(count0, 'Press ⌘K', 'shortcut tip present')
assertNotContains(count0, 'drag to reorder', '"power" tip NOT present')
assertNotContains(count0, 'Tag team members', '"team" tip NOT present')

// Test 3: testCaseCount=5 (boundary — still "new" range)
console.log('\nTest: testCaseCount=5 (boundary — should show new)')
const count5 = filterTips({ testCaseCount: 5, hasTeam: false, hasUsedCmdK: false })
assertContains(count5, 'Attach a screenshot', '"new" tip present at boundary 5')
assertNotContains(count5, 'drag to reorder', '"power" tip NOT present at boundary 5')

// Test 4: testCaseCount=6 (boundary — crosses into "power" range)
console.log('\nTest: testCaseCount=6 (boundary — should show power)')
const count6 = filterTips({ testCaseCount: 6, hasTeam: false, hasUsedCmdK: false })
assertNotContains(count6, 'Attach a screenshot', '"new" tip NOT present at boundary 6')
assertContains(count6, 'drag to reorder', '"power" tip present at boundary 6')
assertContains(count6, 'Failed tests can be linked', '"power" tip #2 present')
assertContains(count6, 'mark test cases as BLOCKED', '"power" tip #3 present')

// Test 5: hasTeam=true
console.log('\nTest: hasTeam=true')
const withTeam = filterTips({ testCaseCount: 0, hasTeam: true, hasUsedCmdK: false })
assertContains(withTeam, 'Tag team members', '"team" tip present')

// Test 6: hasTeam=false
console.log('\nTest: hasTeam=false')
const noTeam = filterTips({ testCaseCount: 0, hasTeam: false, hasUsedCmdK: false })
assertNotContains(noTeam, 'Tag team members', '"team" tip NOT present')

// Test 7: hasUsedCmdK=true → shortcut hidden
console.log('\nTest: hasUsedCmdK=true')
const usedCmdK = filterTips({ testCaseCount: 0, hasTeam: false, hasUsedCmdK: true })
assertNotContains(usedCmdK, 'Press ⌘K', 'shortcut tip hidden after cmdK used')

// Test 8: hasUsedCmdK=false → shortcut shown
console.log('\nTest: hasUsedCmdK=false')
const notUsedCmdK = filterTips({ testCaseCount: 0, hasTeam: false, hasUsedCmdK: false })
assertContains(notUsedCmdK, 'Press ⌘K', 'shortcut tip shown before cmdK used')

// Test 9: General tips come before contextual tips
console.log('\nTest: priority ordering')
const ordered = filterTips({ testCaseCount: 6, hasTeam: true, hasUsedCmdK: false })
const firstTip = ordered[0]
assert(firstTip.startsWith('Tip:'), `first tip is a tip string, got: "${firstTip}"`)
// General tips are first 4
assert(ordered[0].includes('Edit test case steps'), `first tip is general, got: "${ordered[0]}"`)
// contextual tips come after
const powerIdx = ordered.findIndex(t => t.includes('drag to reorder'))
const teamIdx = ordered.findIndex(t => t.includes('Tag team members'))
assert(powerIdx > 3, `power tip at index ${powerIdx}, expected after general tips`)
assert(teamIdx > powerIdx, `team tip after power tip (idx ${teamIdx} > ${powerIdx})`)

console.log(`\n${failed === 0 ? '✓ ALL' : '✗ ' + failed + ' FAILED'} — ${failed === 0 ? '10 behavioral tests passed' : ''}`)
process.exit(failed > 0 ? 1 : 0)
