#!/usr/bin/env node
// scripts/seed-phase139-contribution-fixtures.mjs
//
// Phase 139-06 (Wave 5, F-03) — reproducible, idempotent, API-driven seed script that closes
// 139-RESEARCH.md's "no live independent+different data" gap: it produces one real
// independent-but-identical AND one real independent-and-different release_crew_snapshots row
// against the live database, via the REAL PUT
// /api/v1/admin/release-versions/:versionId/contributions/effective endpoint
// (admin_content_fansub_releases_contributions_handlers.go:66,
// ReplaceEffectiveContributionsForVersion) — never a direct SQL write. Follows
// scripts/seed-member-profile-fixtures.mjs's exact conventions: shebang, Node 18+ global fetch,
// zero npm dependencies, env-var-configurable API/KC base URLs, the same kcToken auth helper,
// idempotent check-existence-then-create(-or-replace) semantics.
//
// Why this script exists (F-03, 139-RESEARCH.md): as of 2026-08-24 the live team4s_v2 database
// has 13 release_crew_snapshots rows, ALL snapshot_mode='inherited', ZERO 'independent' — meaning
// the override-detection UI (UADM-03's "Nur Abweichungen" filter) has nothing real to click
// through during live UAT (139-10). ReplaceInTx (the write path this script drives) always sets
// snapshot_mode='independent' on ANY save, regardless of whether the submitted crew set actually
// differs from the project standard — so this script deliberately produces BOTH the
// independent-but-identical case (D04/D05 must NOT flag it) and the independent-and-different case
// (D04/D05 MUST flag it), the exact pair 139-RESEARCH.md's F-03 section calls out as untested
// against real data.
//
// Discovery (read-only, no new endpoint): prefers the seed-member-profile-fixtures.mjs reference
// group 'seed129-group-a' if it exists in this environment, otherwise scans every real fansub
// group's attached anime (GET /api/v1/admin/fansubs/:id/anime) for the first anime that already
// has BOTH a project-standard anime_contributions row (release_version_id IS NULL, via
// GET /api/v1/admin/fansubs/:id/anime/:animeId/contributions) AND at least 2 release versions
// (GET /api/v1/admin/fansubs/:id/anime/:animeId/release-versions) — exactly the precondition
// the target write endpoint needs.
//
// Env (all optional; defaults target the live Linux VM's actual current platform_admin account —
// this environment does not have the sheppert/csubs-leader accounts seed-member-profile-fixtures.mjs
// defaults to, so this script's default admin differs from that sibling script's on purpose):
//   SEED_API_BASE       default http://192.168.235.196:18092
//   SEED_KC_BASE        default http://192.168.235.196:18081
//   SEED_ADMIN_USER     default admin@team4s.de   (platform_admin)
//   SEED_ADMIN_PW       default 123

const API = (process.env.SEED_API_BASE || 'http://192.168.235.196:18092').replace(/\/+$/, '')
const KC = (process.env.SEED_KC_BASE || 'http://192.168.235.196:18081').replace(/\/+$/, '')
const ADMIN_USER = process.env.SEED_ADMIN_USER || 'admin@team4s.de'
const ADMIN_PW = process.env.SEED_ADMIN_PW || '123'

const KC_CLIENT = 'team4s-frontend'
const REALM = 'team4s'

// Preferred discovery target (139-RESEARCH.md: "preferring the sheppert/csubs-leader fixture
// data seed-member-profile-fixtures.mjs already establishes if a suitable pair exists there").
const PREFERRED_GROUP_SLUG = 'seed129-group-a'

// Assignable anime_contribution role codes (role_definitions.contexts @> '{anime_contribution}'
// AND assignable=true, confirmed live 2026-08-24) — used to construct a genuinely DIFFERENT crew
// payload for the independent-and-different case (F-03 case 2).
const ASSIGNABLE_ROLE_CODES = [
  'translator', 'editor', 'encoder', 'typesetter', 'designer',
  'project_lead', 'quality_checker', 'raw_provider', 'timer', 'karaoke_fx',
]

function log(...a) { console.log('[seed139]', ...a) }
function warn(...a) { console.warn('[seed139][warn]', ...a) }

// ---- HTTP helpers (mirrors seed-member-profile-fixtures.mjs byte-for-byte) --------------------

async function kcToken(username, password) {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: KC_CLIENT,
    username,
    password,
  })
  const res = await fetch(`${KC}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

// getToken tries the configured (email) username first, then the bare local part as a fallback,
// since Keycloak realms differ on whether login is by email or bare username.
async function getToken(label, username, password) {
  let attempt = await kcToken(username, password)
  if (!attempt.ok && username.includes('@')) {
    const bare = username.split('@')[0]
    warn(`${label}: login as "${username}" failed (${attempt.status}); retrying bare "${bare}"`)
    const alt = await kcToken(bare, password)
    if (alt.ok) attempt = alt
  }
  if (!attempt.ok || !attempt.json.access_token) {
    throw new Error(
      `${label}: Keycloak direct-grant login FAILED for "${username}" (status ${attempt.status}): ${JSON.stringify(attempt.json)}`,
    )
  }
  log(`${label}: token acquired for "${username}"`)
  return attempt.json.access_token
}

async function api(method, path, { token, body, query } = {}) {
  let url = `${API}${path}`
  if (query) {
    const qs = new URLSearchParams(query).toString()
    url += (url.includes('?') ? '&' : '?') + qs
  }
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  let payload
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(url, { method, headers, body: payload })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : undefined } catch { json = text }
  return { status: res.status, ok: res.ok, json }
}

function must(res, ctx, okStatuses = [200, 201]) {
  if (!okStatuses.includes(res.status)) {
    throw new Error(`${ctx}: unexpected status ${res.status}: ${JSON.stringify(res.json)}`)
  }
  return res.json
}

// ---- Comparison helpers -----------------------------------------------------------------------

// rowsToComparableSet reduces a crew rows list ({member_id, role_codes}) to a canonical,
// order-independent Set of "memberId:sortedRoleCodes" strings, so "does this match the desired
// state" never depends on row/array ordering.
function rowsToComparableSet(rows) {
  return new Set(
    (rows || [])
      .filter((r) => r.member_id && Array.isArray(r.role_codes) && r.role_codes.length > 0)
      .map((r) => `${r.member_id}:${[...r.role_codes].sort().join(',')}`),
  )
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

// ---- Discovery ---------------------------------------------------------------------------------

// findSuitablePair scans fansub groups (PREFERRED_GROUP_SLUG first, if present) for the first
// anime with BOTH a real project-standard row (release_version_id IS NULL) AND >=2 release
// versions — read-only discovery via existing admin list endpoints, no new endpoint.
async function findSuitablePair(token) {
  const listRes = await api('GET', '/api/v1/fansubs', { token, query: { per_page: '500' } })
  must(listRes, 'list fansub groups')
  const groups = listRes.json.data || []
  if (groups.length === 0) throw new Error('findSuitablePair: no fansub groups exist in this environment')

  const preferred = groups.find((g) => g.slug === PREFERRED_GROUP_SLUG)
  const orderedGroups = preferred ? [preferred, ...groups.filter((g) => g.id !== preferred.id)] : groups
  if (preferred) log(`preferred fixture group "${PREFERRED_GROUP_SLUG}" found (id=${preferred.id}); trying it first`)
  else log(`preferred fixture group "${PREFERRED_GROUP_SLUG}" not present in this environment; scanning all ${groups.length} group(s)`)

  for (const group of orderedGroups) {
    const animeRes = await api('GET', `/api/v1/admin/fansubs/${group.id}/anime`, { token })
    if (animeRes.status !== 200) {
      warn(`group "${group.slug}" (id=${group.id}): list anime failed (${animeRes.status}); skipping`)
      continue
    }
    const animeList = animeRes.json.data || []
    for (const anime of animeList) {
      const contribRes = await api('GET', `/api/v1/admin/fansubs/${group.id}/anime/${anime.id}/contributions`, { token })
      if (contribRes.status !== 200) continue
      const contributions = contribRes.json.data || []
      const standardRows = contributions.filter((c) => c.release_version_id === null || c.release_version_id === undefined)
      if (standardRows.length === 0) continue

      const versionsRes = await api('GET', `/api/v1/admin/fansubs/${group.id}/anime/${anime.id}/release-versions`, { token })
      if (versionsRes.status !== 200) continue
      const versions = versionsRes.json.data || []
      if (versions.length < 2) continue

      log(`suitable pair found: group "${group.name}" (id=${group.id}), anime "${anime.title}" (id=${anime.id}), ${standardRows.length} project-standard row(s), ${versions.length} release version(s)`)
      return {
        groupId: group.id,
        groupName: group.name,
        animeId: anime.id,
        animeTitle: anime.title,
        standardRows: standardRows.map((r) => ({ member_id: r.member_id, role_codes: r.role_codes })),
        versionIdentical: versions[0].release_version_id,
        versionDifferent: versions[1].release_version_id,
      }
    }
  }
  throw new Error(
    'findSuitablePair: no anime+group pair with a project-standard row AND >=2 release versions was found in ANY fansub group -- ' +
    'run scripts/seed-member-profile-fixtures.mjs first (it establishes such a pair), or create one manually before re-running this script.',
  )
}

// ---- Effective-crew read / idempotent replace ---------------------------------------------------

async function getEffectiveCrew(token, versionId, groupId) {
  const res = await api('GET', `/api/v1/admin/release-versions/${versionId}/contributions/effective`, {
    token,
    query: { fansub_group_id: String(groupId) },
  })
  must(res, `get effective crew version ${versionId}`, [200])
  return { rows: res.json.data || [], snapshotMode: res.json.meta ? res.json.meta.snapshot_mode : undefined }
}

async function replaceEffectiveCrew(token, versionId, groupId, rows) {
  const res = await api('PUT', `/api/v1/admin/release-versions/${versionId}/contributions/effective`, {
    token,
    query: { fansub_group_id: String(groupId) },
    body: { rows },
  })
  must(res, `replace effective crew version ${versionId}`, [200])
  return { rows: res.json.data || [], snapshotMode: res.json.meta ? res.json.meta.snapshot_mode : undefined }
}

// ensureEffectiveCrewMatches is the F-03 idempotency contract: re-reads the CURRENT effective
// crew first; only calls PUT if the current state does not already match the desired target
// (BOTH snapshot_mode='independent' -- the actual F-03 target state, never 'inherited', even when
// the inherited content happens to already equal the project standard by construction -- AND a
// set-equal crew comparison, order-independent) -- "already matches" is treated as success, never
// a duplicate-conflict failure (PUT itself is a pure replace and never errors on duplicates, but
// this avoids a spurious re-write on a clean re-run). A release version that is still 'inherited'
// must ALWAYS be PUT at least once, regardless of whether its inherited content already happens
// to equal the desired crew set, since 'inherited' is never the F-03 target mode.
async function ensureEffectiveCrewMatches(token, label, versionId, groupId, desiredRows) {
  const current = await getEffectiveCrew(token, versionId, groupId)
  const desiredSet = rowsToComparableSet(desiredRows)
  const currentSet = rowsToComparableSet(current.rows)
  if (current.snapshotMode === 'independent' && setsEqual(desiredSet, currentSet)) {
    log(`${label}: release version ${versionId} already matches the desired crew set AND is already 'independent' -- skipping PUT (idempotent)`)
    return current
  }
  const result = await replaceEffectiveCrew(token, versionId, groupId, desiredRows)
  log(`${label}: release version ${versionId} crew replaced (snapshot_mode=${result.snapshotMode})`)
  return result
}

// buildDifferentRows takes the project standard and returns a payload GUARANTEED to differ: it
// adds one assignable role code the first standard member does not already have (or, in the
// pathological case every candidate role is already assigned, drops one existing role instead --
// still a genuine, real set difference).
function buildDifferentRows(standardRows) {
  const rows = standardRows.map((r) => ({ member_id: r.member_id, role_codes: [...r.role_codes] }))
  const first = rows[0]
  const missingRole = ASSIGNABLE_ROLE_CODES.find((code) => !first.role_codes.includes(code))
  if (missingRole) {
    first.role_codes = [...first.role_codes, missingRole]
  } else if (first.role_codes.length > 1) {
    first.role_codes = first.role_codes.slice(1)
  } else {
    throw new Error('buildDifferentRows: could not construct a genuinely different crew payload (all assignable roles already present with only one role held)')
  }
  return rows
}

// ---- Assertions ---------------------------------------------------------------------------------

const results = []
function check(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`)
}

// ---- Main -----------------------------------------------------------------------------------

async function main() {
  console.log(`=== Team4s Phase-139 contribution-fixture seed (API=${API}, KC=${KC}) ===`)

  const token = await getToken('Token (admin)', ADMIN_USER, ADMIN_PW)
  const pair = await findSuitablePair(token)

  const identicalRows = pair.standardRows.map((r) => ({ member_id: r.member_id, role_codes: [...r.role_codes] }))
  const differentRows = buildDifferentRows(pair.standardRows)

  await ensureEffectiveCrewMatches(token, 'independent-but-identical', pair.versionIdentical, pair.groupId, identicalRows)
  await ensureEffectiveCrewMatches(token, 'independent-and-different', pair.versionDifferent, pair.groupId, differentRows)

  console.log('\n=== Verification ===')
  const afterIdentical = await getEffectiveCrew(token, pair.versionIdentical, pair.groupId)
  const afterDifferent = await getEffectiveCrew(token, pair.versionDifferent, pair.groupId)

  check(
    'independent-but-identical: snapshot_mode=independent AND crew set-equal to project standard',
    afterIdentical.snapshotMode === 'independent' && setsEqual(rowsToComparableSet(afterIdentical.rows), rowsToComparableSet(identicalRows)),
    `snapshot_mode=${afterIdentical.snapshotMode}`,
  )
  check(
    'independent-and-different: snapshot_mode=independent AND crew set genuinely differs from project standard',
    afterDifferent.snapshotMode === 'independent' && !setsEqual(rowsToComparableSet(afterDifferent.rows), rowsToComparableSet(pair.standardRows)),
    `snapshot_mode=${afterDifferent.snapshotMode}`,
  )

  console.log('\n=== Target for live UAT (139-10) ===')
  console.log(`  Group:                 "${pair.groupName}" (id=${pair.groupId})`)
  console.log(`  Anime:                 "${pair.animeTitle}" (id=${pair.animeId})`)
  console.log(`  independent-identical: release_version_id=${pair.versionIdentical} (must NOT show under "Nur Abweichungen")`)
  console.log(`  independent-different: release_version_id=${pair.versionDifferent} (MUST show under "Nur Abweichungen")`)

  const failed = results.filter((r) => !r.pass)
  console.log('\n=== SUMMARY ===')
  console.log(`  ${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length > 0) {
    console.log('  FAILED:')
    for (const f of failed) console.log(`   - ${f.name} — ${f.detail}`)
    console.log('\nRESULT: FAIL')
    process.exit(1)
  }
  console.log('\nRESULT: PASS')
}

main().catch((err) => {
  console.error('\n[seed139][FATAL]', err.message)
  process.exit(1)
})
