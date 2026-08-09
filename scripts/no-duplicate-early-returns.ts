/**
 * no-duplicate-early-returns.ts
 *
 * Scans all .tsx files under client/src/ for React early-return blocks
 * (if (condition) { return (...) }) that appear with an identical
 * condition text more than once in the same file.
 *
 * Catches the classic str_replace / botched-merge bug where an entire
 * if-block gets duplicated, creating dead code that TypeScript can't
 * flag because each block is syntactically valid on its own.
 *
 * Usage:   npx tsx scripts/no-duplicate-early-returns.ts
 * Exit:    0 if clean, 1 if duplicates found.
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

/** Walk a directory recursively, returning all .tsx file paths. */
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
 * Uses a depth counter so it handles arbitrary nesting of parens.
 * Returns null if the line doesn't start an `if (...) {` block.
 */
function extractCondition(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('if ')) return null

  // Find the opening `(`
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

  // Verify the `)` is followed by `{` (possibly with whitespace)
  const afterParen = trimmed.slice(condEnd + 1).trim()
  if (!afterParen.startsWith('{')) return null

  return condition
}

/**
 * Starting from a given line index, skip blank lines and comment-only lines,
 * including multi-line `/* *\/` block comments.
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

// ---- Per-file check -------------------------------------------------

interface FileError {
  file: string
  line: number
  duplicateOf: number
  condition: string
}

function checkFile(filePath: string): FileError[] {
  const errors: FileError[] = []
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return errors // skip unreadable files
  }

  const lines = content.split('\n')
  // condition text → first line (1-based) where it appeared
  const seen = new Map<string, number>()

  for (let i = 0; i < lines.length; i++) {
    const condition = extractCondition(lines[i])
    if (!condition) continue

    // Skip blank/comment lines between `{` and `return (`
    const nextLineIdx = skipBlanksAndComments(lines, i + 1)
    if (nextLineIdx === -1) continue

    const nextLine = lines[nextLineIdx].trim()
    if (!nextLine.startsWith('return (')) continue

    // Confirm it's JSX — look for a `<` character soon after `return (`
    let hasJSX = false
    for (let j = nextLineIdx; j < Math.min(nextLineIdx + 6, lines.length); j++) {
      if (lines[j].includes('<')) {
        hasJSX = true
        break
      }
    }
    if (!hasJSX) continue

    // Found an early-return with JSX. Check for duplicates.
    const lineNum = i + 1 // 1-based
    const existing = seen.get(condition)
    if (existing !== undefined) {
      errors.push({
        file: filePath,
        line: lineNum,
        duplicateOf: existing,
        condition,
      })
    } else {
      seen.set(condition, lineNum)
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
  for (const e of allErrors) {
    console.error(
      `${rel(e.file)}:${e.line} — duplicate early-return condition "${e.condition}" (first seen at line ${e.duplicateOf})`
    )
  }
  console.error(
    `\n✗ Found ${allErrors.length} duplicate early-return block(s) across ${files.length} files.`
  )
  process.exit(1)
} else {
  console.log(`✓ No duplicate early-return blocks found across ${files.length} files.`)
}
