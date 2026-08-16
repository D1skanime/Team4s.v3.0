#!/usr/bin/env node
// scripts/verify-protected-assets.mjs
//
// Phase 134-05 (Wave 4) — sha256-based snapshot/verify guard for the three
// tracked badge asset directories (history-event-badges,
// history-event-badges-transparent, member-achievement-badges). Exists to
// prove PMQA-06: these canonical, checked-in assets remain bit-identical
// across scripts/reset-member-profile-fixture.sh's shared-DB reset+reseed
// cycle (CONTEXT.md D-06 — D-06 exists specifically because D-05 needs proof
// its reset never touches tracked media).
//
// Node 18+, no external npm dependencies (matches the seed/evidence scripts'
// zero-dependency convention).
//
// Usage:
//   node scripts/verify-protected-assets.mjs --mode snapshot --out <file>
//   node scripts/verify-protected-assets.mjs --mode verify --against <snapshot-file>

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const TARGET_DIRS = [
  'frontend/public/history-event-badges',
  'frontend/public/history-event-badges-transparent',
  'frontend/public/member-achievement-badges',
]

function fail(message) {
  throw new Error(`verify-protected-assets: ${message}`)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

// parseArgs mirrors frontend/scripts/collect-member-profile-evidence.mjs's
// minimal "--key value" pair parsing.
function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    assert(key?.startsWith('--') && value && !value.startsWith('--'), `${key ?? '<missing>'} requires a value`)
    assert(!(key.slice(2) in parsed), `duplicate option ${key}`)
    parsed[key.slice(2)] = value
  }
  return parsed
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

// walkDir recursively collects every regular file under absDir into `out`,
// as { path (relative to repo root, POSIX-separated), sha256, bytes }.
// Symlinks/other special entries are deliberately ignored — the tracked
// badge directories contain only regular image files.
function walkDir(absDir, relBase, out) {
  const entries = readdirSync(absDir, { withFileTypes: true })
  for (const entry of entries) {
    const absPath = path.join(absDir, entry.name)
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      walkDir(absPath, relPath, out)
    } else if (entry.isFile()) {
      const bytes = readFileSync(absPath)
      out.push({ path: relPath, sha256: sha256(bytes), bytes: bytes.length })
    }
  }
}

function snapshotTargets() {
  const files = []
  for (const relDir of TARGET_DIRS) {
    const absDir = path.join(REPO_ROOT, relDir)
    const stat = statSync(absDir, { throwIfNoEntry: false })
    if (!stat || !stat.isDirectory()) {
      // A missing protected directory is itself an integrity failure — never
      // treated as "zero files, pass".
      fail(`protected directory missing: ${relDir}`)
    }
    walkDir(absDir, relDir, files)
  }
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return files
}

function runSnapshot(args) {
  const outPath = args.out
  assert(outPath, '--out <file> is required for --mode snapshot')
  const files = snapshotTargets()
  const snapshot = { captured_at: new Date().toISOString(), file_count: files.length, files }
  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`)
  console.log(`protected assets snapshot written: ${outPath} (${files.length} files)`)
}

function runVerify(args) {
  const againstPath = args.against
  assert(againstPath, '--against <snapshot-file> is required for --mode verify')
  const snapshot = JSON.parse(readFileSync(againstPath, 'utf8'))
  assert(
    Array.isArray(snapshot.files) && Number.isInteger(snapshot.file_count),
    `${againstPath} is not a valid protected-assets snapshot (missing files[]/file_count)`,
  )

  const current = snapshotTargets()
  const currentByPath = new Map(current.map((f) => [f.path, f]))
  const snapshotByPath = new Map(snapshot.files.map((f) => [f.path, f]))

  const mismatches = []
  const removed = []
  const added = []

  for (const [relPath, expected] of snapshotByPath) {
    const actual = currentByPath.get(relPath)
    if (!actual) {
      removed.push(relPath)
      continue
    }
    if (actual.sha256 !== expected.sha256) {
      mismatches.push(`${relPath} (expected sha256=${expected.sha256}, got sha256=${actual.sha256})`)
    }
  }
  for (const relPath of currentByPath.keys()) {
    if (!snapshotByPath.has(relPath)) added.push(relPath)
  }

  // Never a generic "assets changed" message — always name the specific
  // path(s)/hash(es) that differ.
  if (mismatches.length > 0) {
    fail(`hash mismatch on ${mismatches.length} file(s): ${mismatches.join('; ')}`)
  }
  if (removed.length > 0) {
    fail(`${removed.length} file(s) present in snapshot but missing now: ${removed.join(', ')}`)
  }
  if (added.length > 0) {
    fail(`${added.length} file(s) present now but absent from snapshot: ${added.join(', ')}`)
  }
  if (current.length !== snapshot.file_count) {
    fail(`file_count mismatch: snapshot recorded ${snapshot.file_count}, current tree has ${current.length}`)
  }

  console.log(`protected assets verified bit-identical: ${current.length} files`)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.mode === 'snapshot') {
    runSnapshot(args)
  } else if (args.mode === 'verify') {
    runVerify(args)
  } else {
    fail(`--mode must be "snapshot" or "verify" (got ${args.mode ?? '<missing>'})`)
  }
}

main()
