/**
 * no-duplicate-if-blocks.ts
 *
 * Scans all .tsx files under client/src/ for problematic `if (condition) { return ... }`
 * patterns:
 *
 * 1. **Duplicate blocks** — the same condition + same return type appears twice
 *    (classic str_replace / botched-merge bug).
 * 2. **Mirror blocks** — the same condition appears twice but with DIFFERENT
 *    return types (e.g. one returns JSX, another returns null). This catches the
 *    pattern where a loading spinner and an empty-state both check `if (!data)`
 *    in different parts of the same component — likely a copy-paste bug where
 *    the developer forgot to update the second condition.
 *
 * Usage:   npx tsx scripts/no-duplicate-if-blocks.ts
 * Exit:    0 if clean, 1 if issues found.
 */

import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = join(fileURLToPath(import.meta.url), '..')
const ROOT = join(SCRIPT_DIR, '..')
const SRC = join(ROOT, 'client', 'src')
const EXT = '.tsx'

// ---- Helpers -------------------------------------------------------

function findFiles(dir: string): string[] {
  const results: string[] = []
  let entries: { name: string; isDirectory(): boolean }[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory() && !e.name.startsWith('.')) {
      results.push(...findFiles(full))
    } else if (e.isFile() && e.name.endsWith(EXT)) {
      results.push(full)
    }
  }
  return results
}

/**
 * Extract the condition text from `if (condition) {`.
 * Uses a depth counter for arbitrarily nested parens.
 * Returns null if the line doesn't start an `if (...) {` block.
 */
function extractCondition(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('if ')) return null

  const parenStart = trimmed.indexOf('(')
  if (parenStart === -1) return null

  let depth = 0
  let condStart = -1
  let condEnd = -1

  for (let i = parenStart; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (ch === '(') {
      if (depth === 0) condStart = i + 1
      depth++
    } else if (ch === ')') {
      depth--
      if (depth === 0) {
        condEnd = i
        break
      }
    }
  }
  if (condStart === -1 || condEnd === -1) return null

  const condition = trimmed.slice(condStart, condEnd).trim()
  if (!condition) return null

  const afterParen = trimmed.slice(condEnd + 1).trim()
  if (!afterParen.startsWith('{')) return null

  return condition
}

/**
 * Skip blank lines and comment-only lines from a starting index.
 * Returns the index of the next meaningful line, or -1.
 */
function skipBlanksAndComments(lines: string[], start: number): number {
  let inBlockComment = false
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].trim()

    // Handle multi-line /* */ block comments
    if (inBlockComment) {
      if (t.includes('*/')) inBlockComment = false
      continue
    }
    if (t.startsWith('/*') && !t.includes('*/')) {
      inBlockComment = true
      continue
    }
    if (t.startsWith('/*') && t.includes('*/')) continue

    if (t === '' || t.startsWith('//') || t.startsWith('*')) continue
    return i
  }
  return -1
}

/**
 * Check whether a line looks like a return statement.
 * Matches `return`, `return null`, `return ...`, `return;`, etc.
 */
function isReturnStatement(line: string): boolean {
  return /^return\b/.test(line.trim())
}

/**
 * Classify the return value on a line into a category string.
 * Scans a few lines ahead for `return (...)` multi-line expressions.
 *
 * Categories:
 *   'null'       — `return null` or `return null;`
 *   'jsx'        — `return <...>` or `return (<...>)` (JSX element)
 *   'component'  — `return <Component ...>` or `return Component` (component reference)
 *   'value'      — strings, numbers, variables, function calls, ternary, etc.
 *   'void'       — bare `return;`
 */
function classifyReturn(lines: string[], returnLineIdx: number): string {
  // Collect the full return expression starting from the return line
  let expr = ''
  for (let j = returnLineIdx; j < Math.min(returnLineIdx + 8, lines.length); j++) {
    expr += lines[j] + '\n'
    // Stop when we hit a semicolon or closing paren that ends the statement
    const trimmed = lines[j].trim()
    if (trimmed.endsWith(';') || trimmed.endsWith(')') && !trimmed.includes('(')) break
    // Also stop if this is the last line of a JSX self-closing tag
    if (/\/>\s*;?$/.test(trimmed)) break
    // Stop on closing paren that balances an opening paren on the return line
    if (trimmed.endsWith(')') && returnLineIdx < j) break
  }

  const combined = expr.trim()

  // Strip leading `return` keyword
  const value = combined.replace(/^return\s*/, '').trim()

  if (!value || value === ';') return 'void'
  if (/^null\s*;?$/.test(value)) return 'null'
  // JSX: starts with `<` or `(<`
  if (/^\(?</.test(value)) return 'jsx'
  // Component reference: starts with an uppercase letter
  if (/^[A-Z]/.test(value)) return 'component'
  // Everything else
  return 'value'
}

// ---- Per-file check -------------------------------------------------

interface SeenBlock {
  line: number
  returnType: string
}

interface FileError {
  file: string
  line: number
  related: number
  condition: string
  kind: 'duplicate' | 'mirror'
}

function checkFile(filePath: string): FileError[] {
  const errors: FileError[] = []
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return errors
  }

  const lines = content.split('\n')
  const seen = new Map<string, SeenBlock>()

  for (let i = 0; i < lines.length; i++) {
    const condition = extractCondition(lines[i])
    if (!condition) continue

    const returnLineIdx = skipBlanksAndComments(lines, i + 1)
    if (returnLineIdx === -1) continue

    const returnLine = lines[returnLineIdx]
    if (!isReturnStatement(returnLine)) continue

    const returnType = classifyReturn(lines, returnLineIdx)
    const lineNum = i + 1
    const existing = seen.get(condition)

    if (existing !== undefined) {
      // Same condition seen before — is it the same return type or different?
      const kind = existing.returnType === returnType ? 'duplicate' : 'mirror'
      // For strict duplicates, only flag if the return types are identical.
      // For mirrors, always flag since different return types suggest a missed
      // condition update.
      if (kind === 'mirror' || (kind === 'duplicate' && existing.returnType === returnType)) {
        errors.push({
          file: filePath,
          line: lineNum,
          related: existing.line,
          condition,
          kind,
        })
      }
    } else {
      seen.set(condition, { line: lineNum, returnType })
    }
  }

  return errors
}

// ---- Main -----------------------------------------------------------

const files = findFiles(SRC)
let allErrors: FileError[] = []

for (const file of files) {
  allErrors.push(...checkFile(file))
}

if (allErrors.length > 0) {
  const rel = (p: string) => relative(ROOT, p)
  const dupes = allErrors.filter(e => e.kind === 'duplicate')
  const mirrors = allErrors.filter(e => e.kind === 'mirror')

  for (const e of allErrors) {
    if (e.kind === 'duplicate') {
      console.error(
        `${rel(e.file)}:${e.line} — DUPLICATE if-block "${e.condition}" ` +
        `(identical block at line ${e.related})`
      )
    } else {
      console.error(
        `${rel(e.file)}:${e.line} — MIRROR if-block "${e.condition}" ` +
        `(different return type than block at line ${e.related})`
      )
    }
  }

  const parts: string[] = []
  if (dupes.length > 0) parts.push(`${dupes.length} duplicate`)
  if (mirrors.length > 0) parts.push(`${mirrors.length} mirror`)
  console.error(`\n✗ Found ${parts.join(' + ')} if-block issue(s) across ${files.length} files.`)
  process.exit(1)
} else {
  console.log(`✓ No duplicate or mirror if+return blocks found across ${files.length} files.`)
}
