#!/usr/bin/env node
// scripts/seed-member-profile-fixtures.mjs
//
// Phase 129-01 (Wave 1) — reusable, idempotent, API-driven seed fixture for the
// public member-profile scenario matrix. Populates the two reference profiles
// (`csubs-leader` = member 1, `sheppert` = member 2) plus supporting fansub
// groups, anime, release versions, memberships, roles, contributions and awarded
// release credits — exclusively through the real creation/admin API using a
// Keycloak direct-grant token. Safe to re-run (check-existence-then-create; 409 /
// duplicate treated as success). This same script is the Phase-134 clean-reset
// fixture.
//
// Phase 134-01 (Wave 1, Task 1) — extended in place (not forked, per CONTEXT.md
// D-01) with a member-owned story-image media step (Step 11).
//
// Requires Node 18+ (global fetch, FormData, Blob). No external npm dependencies.
//
// Env (all optional; defaults target the live Linux VM):
//   SEED_API_BASE       default http://192.168.235.196:18092
//   SEED_KC_BASE        default http://192.168.235.196:18081
//   SEED_ADMIN_USER     default csubs-leader@team4s.local   (Token A / member 1 / platform_admin)
//   SEED_ADMIN_PW       default 123
//   SEED_SHEPPERT_USER  default sheppert@team4s.local       (Token B / member 2)
//   SEED_SHEPPERT_PW    default 123

import { readFileSync } from 'node:fs'

// ---- Fixture image (Step 11 media upload) -----------------------------------
const STORY_IMAGE_PATH = new URL('./fixtures/seed134-story.jpg', import.meta.url)

// Substring the seed's public story-image assertion expects inside
// member_story_html. This is /media/profile/ — the actual src pattern the
// backend's TipTap sanitizer allows (backend/internal/services/tiptap_service.go
// newTipTapSanitizerPolicy: ^/media/profile/\d+/story/[a-z0-9-]+/original\.(...)$),
// NOT /media/story-images/ (a separate resolve-by-ID endpoint used only for
// editor-side image preview, never embedded in saved/rendered story HTML).
const STORY_IMAGE_SRC_SUBSTRING = '/media/profile/'

const API = (process.env.SEED_API_BASE || 'http://192.168.235.196:18092').replace(/\/+$/, '')
const KC = (process.env.SEED_KC_BASE || 'http://192.168.235.196:18081').replace(/\/+$/, '')
const ADMIN_USER = process.env.SEED_ADMIN_USER || 'csubs-leader@team4s.local'
const ADMIN_PW = process.env.SEED_ADMIN_PW || '123'
const SHEP_USER = process.env.SEED_SHEPPERT_USER || 'sheppert@team4s.local'
const SHEP_PW = process.env.SEED_SHEPPERT_PW || '123'

const KC_CLIENT = 'team4s-frontend'
const REALM = 'team4s'

const GROUP_A = { slug: 'seed129-group-a', name: 'Seed129 Gruppe A', status: 'active' }      // current membership
const GROUP_B = { slug: 'seed129-group-b', name: 'Seed129 Gruppe B', status: 'dissolved' }   // historical membership
const CONFIRMED_ANIME_COUNT = 10   // >=10 confirmed distinct-anime projects (+ >1 project page)
const DRAFT_ANIME_TITLE = 'Seed129 Anime 11 (Entwurf)' // the unconfirmed / not-public case
const EPISODE_NUMBER = '1'

function log(...a) { console.log('[seed129]', ...a) }
function warn(...a) { console.warn('[seed129][warn]', ...a) }

function animeTitle(i) { return `Seed129 Anime ${String(i).padStart(2, '0')}` }

// ---- HTTP helpers ---------------------------------------------------------

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

// getToken tries the configured (email) username first, then the bare local part
// as a fallback, since Keycloak realms differ on whether login is by email or
// bare username.
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

// ---- Idempotent step helpers ---------------------------------------------

async function ensureGroup(token, spec) {
  const create = await api('POST', '/api/v1/fansubs', {
    token,
    body: { slug: spec.slug, name: spec.name, status: spec.status, group_type: 'group', founded_year: 2015 },
  })
  if (create.status === 201) {
    const id = create.json.data.id
    log(`group "${spec.slug}" created (id=${id})`)
    return id
  }
  if (create.status === 409) {
    const list = await api('GET', '/api/v1/fansubs', { token, query: { q: spec.slug, per_page: '500' } })
    must(list, 'list fansubs')
    const found = (list.json.data || []).find((g) => g.slug === spec.slug)
    if (!found) throw new Error(`group "${spec.slug}" reported 409 but not found in list`)
    log(`group "${spec.slug}" already exists (id=${found.id})`)
    return found.id
  }
  throw new Error(`ensureGroup(${spec.slug}): unexpected status ${create.status}: ${JSON.stringify(create.json)}`)
}

// ensureAnimeAttached uses the group's attached-anime list as the authoritative
// idempotency source (every seed anime is attached to Group A).
async function ensureAnimeAttached(token, title, groupId, attachedMap) {
  const existingId = attachedMap.get(title)
  if (existingId) return existingId

  // Not attached yet — it may exist unattached (partial prior run). Look it up.
  let animeId
  const search = await api('GET', '/api/v1/anime', { token, query: { q: title, per_page: '100' } })
  if (search.status === 200) {
    const hit = (search.json.data || []).find((a) => a.title === title)
    if (hit) animeId = hit.id
  }
  if (!animeId) {
    const create = await api('POST', '/api/v1/admin/anime', {
      token,
      body: { title, type: 'tv', content_type: 'anime', status: 'ongoing' },
    })
    animeId = must(create, `create anime "${title}"`, [201]).data.id
    log(`anime "${title}" created (id=${animeId})`)
  }
  // Attach to group (409 = already attached).
  const attach = await api('POST', `/api/v1/anime/${animeId}/fansubs/${groupId}`, { token, body: {} })
  if (attach.status !== 201 && attach.status !== 409) {
    throw new Error(`attach anime ${animeId} -> group ${groupId}: status ${attach.status}: ${JSON.stringify(attach.json)}`)
  }
  attachedMap.set(title, animeId)
  return animeId
}

async function loadAttachedAnime(token, groupId) {
  const res = await api('GET', `/api/v1/admin/fansubs/${groupId}/anime`, { token })
  must(res, 'list group anime')
  const map = new Map()
  for (const a of res.json.data || []) map.set(a.title, a.id)
  return map
}

async function ensureHistMember(token, groupId, memberId, joinedDate, leftDate) {
  const list = await api('GET', `/api/v1/admin/fansubs/${groupId}/group-members`, { token })
  must(list, 'list group-members')
  const found = (list.json.data || []).find((m) => m.member_id === memberId)
  if (found) {
    log(`hist membership member ${memberId} @ group ${groupId} already exists (id=${found.id})`)
    return found.id
  }
  const create = await api('POST', `/api/v1/admin/fansubs/${groupId}/group-members`, {
    token,
    body: {
      member_id: memberId,
      status: 'confirmed',
      visibility: 'public',
      joined_date: joinedDate,
      left_date: leftDate,
    },
  })
  if (create.status === 409) {
    const relist = await api('GET', `/api/v1/admin/fansubs/${groupId}/group-members`, { token })
    const f = (relist.json.data || []).find((m) => m.member_id === memberId)
    if (f) return f.id
  }
  const id = must(create, `create hist membership member ${memberId} @ group ${groupId}`, [201]).data.id
  log(`hist membership member ${memberId} @ group ${groupId} created (id=${id})`)
  return id
}

// hist_group_member_roles has NO unique constraint, so we MUST list-then-skip.
async function ensureRoles(token, groupId, histMemberId, roleCodes) {
  const list = await api('GET', `/api/v1/admin/fansubs/${groupId}/member-roles`, {
    token,
    query: { member_id: String(histMemberId) },
  })
  must(list, 'list member-roles')
  const have = new Set((list.json.data || []).map((r) => r.role_code))
  for (const code of roleCodes) {
    if (have.has(code)) {
      log(`role "${code}" on hist member ${histMemberId} already exists`)
      continue
    }
    const create = await api('POST', `/api/v1/admin/fansubs/${groupId}/member-roles`, {
      token,
      body: {
        hist_fansub_group_member_id: histMemberId,
        role_code: code,
        status: 'confirmed',
        visibility: 'public',
      },
    })
    must(create, `create role "${code}" on hist member ${histMemberId}`, [201])
    log(`role "${code}" on hist member ${histMemberId} created`)
  }
}

// Contribution create is an upsert keyed by (group, anime, member) — inherently
// idempotent; re-running updates the same row.
async function ensureContribution(token, groupId, animeId, memberId, roleCodes, opts) {
  const body = {
    member_id: memberId,
    role_codes: roleCodes,
    status: opts.status,
    is_public_on_member_profile: opts.isPublic,
    is_public_on_anime_page: opts.isPublic,
  }
  if (opts.startedYear !== undefined) body.started_year = opts.startedYear
  if (opts.endedYear !== undefined) body.ended_year = opts.endedYear
  const res = await api('POST', `/api/v1/admin/fansubs/${groupId}/anime/${animeId}/contributions`, { token, body })
  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`contribution member ${memberId} anime ${animeId}: status ${res.status}: ${JSON.stringify(res.json)}`)
  }
}

async function listReleaseVersions(token, groupId, animeId) {
  const res = await api('GET', `/api/v1/admin/fansubs/${groupId}/anime/${animeId}/release-versions`, { token })
  must(res, 'list release-versions')
  return res.json.data || []
}

async function ensureTwoReleaseVersions(token, groupId, animeId) {
  let versions = await listReleaseVersions(token, groupId, animeId)
  if (versions.length >= 2) {
    log(`anime ${animeId} already has ${versions.length} release version(s) for group ${groupId}`)
    return versions.slice(0, 2).map((v) => v.release_version_id)
  }
  // Need an episode before versions can be created.
  const ep = await api('POST', '/api/v1/admin/episodes', {
    token,
    body: { anime_id: animeId, episode_number: EPISODE_NUMBER, status: 'public' },
  })
  if (ep.status !== 201) {
    // Only expected cause in this namespace is "already exists" (unique index).
    warn(`episode ${EPISODE_NUMBER} for anime ${animeId}: create returned ${ep.status} (assuming it already exists)`)
  } else {
    log(`episode ${EPISODE_NUMBER} for anime ${animeId} created`)
  }
  const need = 2 - versions.length
  for (let i = 0; i < need; i++) {
    const create = await api('POST', `/api/v1/anime/${animeId}/episodes/${EPISODE_NUMBER}/versions`, {
      token,
      body: {
        media_provider: 'direct', // must be one of jellyfin/youtube/vimeo/direct (stream_sources check constraint)
        media_item_id: `seed129-anime${animeId}-ep${EPISODE_NUMBER}-v${versions.length + i + 1}`,
        fansub_group_id: groupId,
        video_quality: '1080p',
        stream_url: `https://seed129.local/anime${animeId}/ep${EPISODE_NUMBER}/v${versions.length + i + 1}`,
      },
    })
    must(create, `create release version #${versions.length + i + 1} for anime ${animeId}`, [201])
    log(`release version #${versions.length + i + 1} for anime ${animeId} created`)
  }
  versions = await listReleaseVersions(token, groupId, animeId)
  if (versions.length < 2) {
    throw new Error(`anime ${animeId} still has <2 release versions after seeding (${versions.length})`)
  }
  return versions.slice(0, 2).map((v) => v.release_version_id)
}

// Effective release crew — INSERTs awarded release_role_credit_lifecycles + points.
// applyDiff skips already-awarded rows, so a repeat PUT is a no-op.
async function ensureEffectiveCrew(token, versionId, groupId, memberId, roleCodes) {
  const res = await api('PUT', `/api/v1/admin/release-versions/${versionId}/contributions/effective`, {
    token,
    query: { fansub_group_id: String(groupId) },
    body: { rows: [{ member_id: memberId, role_codes: roleCodes }] },
  })
  must(res, `replace effective crew version ${versionId}`, [200])
  log(`effective crew set on release version ${versionId} (member ${memberId})`)
}

async function updateOwnProfile(token, label, body) {
  const res = await api('PUT', '/api/v1/me/profile', { token, body })
  must(res, `PUT /me/profile (${label})`, [200])
  log(`profile updated for ${label}: ${JSON.stringify(body)}`)
  return res.json.data
}

async function ensureMemorial(token, memberId) {
  const res = await api('POST', `/api/v1/admin/members/${memberId}/memorial`, { token, body: {} })
  must(res, `set memorial member ${memberId}`, [200])
  log(`memorial set on member ${memberId}`)
}

// findFirstStoryImageID walks a TipTap document (as parsed JSON, mirroring the
// backend's extractStoryImageIDsFromJSON in app_profile_story_image.go) looking
// for the first image node's media_asset_id.
function findFirstStoryImageID(node) {
  if (!node || typeof node !== 'object') return null
  if (node.type === 'image' && node.attrs && typeof node.attrs.media_asset_id === 'number' && node.attrs.media_asset_id > 0) {
    return node.attrs.media_asset_id
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const found = findFirstStoryImageID(child)
      if (found) return found
    }
  }
  return null
}

// ensureStoryImage idempotently gives a member exactly one real, member-owned
// story image referenced from their member_story_json (Phase 134 Task 1, T-134-01).
// Never re-uploads once a media_asset_id is already present — applyStoryImageLifecycle
// (backend) deletes any previously-referenced image dropped from a new PUT, so a
// repeat PUT must always include the SAME already-uploaded id, never a fresh upload.
async function ensureStoryImage(token, label, storyText) {
  const me = must(await api('GET', '/api/v1/me/profile', { token }), `GET /me/profile (${label}, story-image check)`)
  let mediaAssetId = me.data.member_story_json ? findFirstStoryImageID(me.data.member_story_json) : null

  if (mediaAssetId) {
    log(`${label}: story image already present (media_asset_id=${mediaAssetId}) — skipping upload`)
  } else {
    const bytes = readFileSync(STORY_IMAGE_PATH)
    const form = new FormData()
    form.append('image', new Blob([bytes], { type: 'image/jpeg' }), 'seed134-story.jpg')
    const res = await fetch(`${API}/api/v1/me/profile/story-images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // no Content-Type — fetch sets the multipart boundary
      body: form,
    })
    const json = await res.json().catch(() => ({}))
    if (res.status !== 201) {
      throw new Error(`ensureStoryImage(${label}): upload failed with status ${res.status}: ${JSON.stringify(json)}`)
    }
    mediaAssetId = json.data.media_asset_id
    log(`${label}: story image uploaded (media_asset_id=${mediaAssetId})`)
  }

  const doc = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: storyText }] },
      { type: 'image', attrs: { media_asset_id: mediaAssetId, width_percent: 60, alignment: 'center' } },
    ],
  }
  await updateOwnProfile(token, `${label} (story image reference)`, { member_story_json: doc })
  return mediaAssetId
}

// ---- Assertions -----------------------------------------------------------

const results = []
function check(name, source, pass, detail) {
  results.push({ name, source, pass, detail })
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] (${source}) ${name}${detail ? ' — ' + detail : ''}`)
}

async function runAssertions(ctx) {
  const { tokenA, tokenB, memberA, memberB, groupAId, groupBId, histA_admin, versionIds } = ctx
  console.log('\n=== Scenario assertions ===')

  const pubShep = await api('GET', '/api/v1/members/sheppert')
  const pubAdmin = await api('GET', '/api/v1/members/csubs-leader')
  must(pubShep, 'GET public sheppert')
  must(pubAdmin, 'GET public csubs-leader')
  const shep = pubShep.json.data
  const adm = pubAdmin.json.data

  // 1. memorial on one member (public projection)
  check('memorial on one member', 'public', shep.profile_status === 'memorial',
    `sheppert.profile_status=${shep.profile_status}`)

  // 2. two memberships, one current + one historical (canonical hist_fansub_group_members)
  const gmA = await api('GET', `/api/v1/admin/fansubs/${groupAId}/group-members`, { token: tokenA })
  const gmB = await api('GET', `/api/v1/admin/fansubs/${groupBId}/group-members`, { token: tokenA })
  const inA = (gmA.json.data || []).find((m) => m.member_id === memberA)
  const inB = (gmB.json.data || []).find((m) => m.member_id === memberA)
  const currentOk = inA && !inA.left_date
  const historicalOk = inB && !!inB.left_date
  check('member in 2 groups: one current (left_date null) + one historical (left_date set)', 'canonical',
    !!(currentOk && historicalOk),
    `groupA.left_date=${inA && inA.left_date}, groupB.left_date=${inB && inB.left_date}`)
  check('public profile exposes >=2 memberships', 'public',
    Array.isArray(adm.memberships) && adm.memberships.length >= 2,
    `memberships=${adm.memberships ? adm.memberships.length : 'n/a'}`)

  // 3. multi-role membership (canonical member-roles)
  const roles = await api('GET', `/api/v1/admin/fansubs/${groupAId}/member-roles`, {
    token: tokenA, query: { member_id: String(histA_admin) },
  })
  const distinctRoles = new Set((roles.json.data || []).map((r) => r.role_code))
  check('multi-role membership (>=2 distinct role codes)', 'canonical', distinctRoles.size >= 2,
    `roles=[${[...distinctRoles].join(', ')}]`)

  // 4. >=10 confirmed distinct-anime projects (public projection)
  check('>=10 confirmed distinct-anime projects', 'public', (adm.current_projects_count || 0) >= 10,
    `current_projects_count=${adm.current_projects_count}`)

  // 5. same anime across two release versions (canonical)
  check('same anime across 2 release versions', 'canonical', versionIds.length >= 2,
    `version_ids=[${versionIds.join(', ')}]`)
  let awardedBoth = true
  for (const vid of versionIds) {
    const eff = await api('GET', `/api/v1/admin/release-versions/${vid}/contributions/effective`, {
      token: tokenA, query: { fansub_group_id: String(groupAId) },
    })
    const has = (eff.json.data || []).some((r) => r.member_id === memberA)
    if (!has) awardedBoth = false
  }
  check('awarded release credit on both versions (dedupe case)', 'canonical', awardedBoth, '')

  // 6. year-only active period (own profile — public projection does not expose year yet, pre-PMDA-01)
  const meA = await api('GET', '/api/v1/me/profile', { token: tokenA })
  const meB = await api('GET', '/api/v1/me/profile', { token: tokenB })
  const yA = meA.json.data.active_from_year
  const yB = meB.json.data.active_from_year
  check('year-only active period set (member 1)', 'own-profile', yA === 2015,
    `active_from_year=${yA}, active_from_date=${meA.json.data.active_from_date}`)
  check('year-only active period set (member 2)', 'own-profile', yB === 2016,
    `active_from_year=${yB}, active_until_year=${meB.json.data.active_until_year}`)

  // 7. more than one project page (public paginated projects)
  const p1 = await api('GET', '/api/v1/members/csubs-leader/projects', { query: { limit: '6', offset: '0' } })
  const p2 = await api('GET', '/api/v1/members/csubs-leader/projects', { query: { limit: '6', offset: '6' } })
  const total = p1.json.data.total
  check('>1 project page (total>6 and page 2 non-empty)', 'public',
    total > 6 && (p2.json.data.items || []).length > 0,
    `total=${total}, page2.items=${(p2.json.data.items || []).length}`)

  // 8. is_currently_active flag (public projection)
  check('is_currently_active=true (member 1)', 'public', adm.is_currently_active === true,
    `is_currently_active=${adm.is_currently_active}`)

  // 9. server-authoritative points crossed (release credits)
  check('total_points > 0 (awarded credits)', 'public', (adm.total_points || 0) > 0,
    `total_points=${adm.total_points}`)

  // 10. unconfirmed/not-public contribution is filtered out (parity)
  check('draft/not-public contribution excluded from public projects', 'public',
    (adm.current_projects_count || 0) === CONFIRMED_ANIME_COUNT,
    `current_projects_count=${adm.current_projects_count} (expected ${CONFIRMED_ANIME_COUNT})`)

  // 11. member-owned story image referenced (not just uploaded and orphaned) in the
  // PUBLIC profile (Phase 134-01, T-134-01). See STORY_IMAGE_SRC_SUBSTRING above for
  // why this is /media/profile/... and not /media/story-images/...
  check('story image referenced in public profile (csubs-leader)', 'public',
    typeof adm.member_story_html === 'string' && adm.member_story_html.includes(STORY_IMAGE_SRC_SUBSTRING),
    `member_story_html=${adm.member_story_html ? adm.member_story_html.slice(0, 160) : 'null'}`)

  check('story image referenced in public profile (sheppert)', 'public',
    typeof shep.member_story_html === 'string' && shep.member_story_html.includes(STORY_IMAGE_SRC_SUBSTRING),
    `member_story_html=${shep.member_story_html ? shep.member_story_html.slice(0, 160) : 'null'}`)
}

// ---- Main -----------------------------------------------------------------

async function main() {
  console.log(`=== Team4s member-profile seed (API=${API}, KC=${KC}) ===`)

  const tokenA = await getToken('Token A (admin)', ADMIN_USER, ADMIN_PW)
  const tokenB = await getToken('Token B (sheppert)', SHEP_USER, SHEP_PW)

  const meA = must(await api('GET', '/api/v1/me/profile', { token: tokenA }), 'GET /me/profile (admin)')
  const meB = must(await api('GET', '/api/v1/me/profile', { token: tokenB }), 'GET /me/profile (sheppert)')
  const memberA = meA.data.member_id
  const memberB = meB.data.member_id
  log(`member ids: admin=${memberA} (slug ${meA.data.slug}), sheppert=${memberB} (slug ${meB.data.slug})`)

  // Step 1: groups
  const groupAId = await ensureGroup(tokenA, GROUP_A)
  const groupBId = await ensureGroup(tokenA, GROUP_B)

  // Step 2+3: anime (created & attached to Group A)
  const attached = await loadAttachedAnime(tokenA, groupAId)
  const confirmedAnimeIds = []
  for (let i = 1; i <= CONFIRMED_ANIME_COUNT; i++) {
    confirmedAnimeIds.push(await ensureAnimeAttached(tokenA, animeTitle(i), groupAId, attached))
  }
  const draftAnimeId = await ensureAnimeAttached(tokenA, DRAFT_ANIME_TITLE, groupAId, attached)
  log(`anime ready: ${confirmedAnimeIds.length} confirmed + 1 draft`)

  // Step 5: historical memberships (current vs historical)
  const histA_admin = await ensureHistMember(tokenA, groupAId, memberA, '2018-01-01', null)          // current
  const histB_admin = await ensureHistMember(tokenA, groupBId, memberA, '2016-01-01', '2020-12-31')  // historical
  const histB_shep = await ensureHistMember(tokenA, groupBId, memberB, '2016-01-01', '2019-12-31')   // historical

  // Step 6: member roles (multi-role + leader roles for historical_leader badge)
  await ensureRoles(tokenA, groupAId, histA_admin, ['fansub_lead', 'translator', 'typesetter'])
  await ensureRoles(tokenA, groupBId, histB_admin, ['founder'])
  await ensureRoles(tokenA, groupBId, histB_shep, ['translator'])

  // Step 7: anime contributions — confirmed+public (current projects) and one draft/not-public
  for (const animeId of confirmedAnimeIds) {
    await ensureContribution(tokenA, groupAId, animeId, memberA, ['translator'],
      { status: 'confirmed', isPublic: true, startedYear: 2018 }) // ended_year left null => current project
  }
  await ensureContribution(tokenA, groupAId, draftAnimeId, memberA, ['editor'],
    { status: 'draft', isPublic: false, startedYear: 2017, endedYear: 2018 })
  log('contributions seeded')

  // Step 4 + 8: two release versions on ONE anime + awarded effective crew (dedupe + points)
  const versionIds = await ensureTwoReleaseVersions(tokenA, groupAId, confirmedAnimeIds[0])
  for (const vid of versionIds) {
    await ensureEffectiveCrew(tokenA, vid, groupAId, memberA, ['translator'])
  }

  // Step 9: /me/profile — year-only active period + is_currently_active + public visibility
  await updateOwnProfile(tokenA, 'member 1 (admin)', {
    active_from_year: 2015, is_currently_active: true, profile_visibility: 'public',
  })
  await updateOwnProfile(tokenB, 'member 2 (sheppert)', {
    active_from_year: 2016, active_until_year: 2019, is_currently_active: false, profile_visibility: 'public',
  })

  // Step 10: memorial on ONE member (sheppert)
  await ensureMemorial(tokenA, memberB)

  // Step 11 (Phase 134-01): member-owned story image — one real media_assets row
  // per reference profile via the real story-image upload API (Open Question 3
  // resolution: POST /api/v1/me/profile/story-images, not anime-cover upload).
  const adminStoryMediaId = await ensureStoryImage(tokenA, 'member 1 (admin/csubs-leader)', 'Seed134 Mitgliedsgeschichte.')
  const shepStoryMediaId = await ensureStoryImage(tokenB, 'member 2 (sheppert)', 'Seed134 Kurzprofil.')
  log(`story image media_asset_ids: csubs-leader=${adminStoryMediaId}, sheppert=${shepStoryMediaId}`)

  await runAssertions({ tokenA, tokenB, memberA, memberB, groupAId, groupBId, histA_admin, versionIds })

  const failed = results.filter((r) => !r.pass)
  console.log('\n=== SUMMARY ===')
  console.log(`  ${results.length - failed.length}/${results.length} scenario checks passed`)
  if (failed.length > 0) {
    console.log('  FAILED:')
    for (const f of failed) console.log(`   - (${f.source}) ${f.name} — ${f.detail}`)
    console.log('\nRESULT: FAIL')
    process.exit(1)
  }
  console.log('\nRESULT: PASS')
}

main().catch((err) => {
  console.error('\n[seed129][FATAL]', err.message)
  process.exit(1)
})
