#!/usr/bin/env node
// scripts/e2e/provision-fixtures.mjs
//
// Legt die einzige Playwright-E2E-Fixturegruppe "E2E Gruppe A" idempotent
// ausschliesslich ueber die echte Admin-API an und verknuepft die drei
// dafuer vorgesehenen Testkonten (Leitung, Stellvertretung, einfaches
// Mitglied) mit der Live-Mitgliedschaft, die `can_manage_members` und die
// 403-Guards tatsaechlich steuert. Nach Muster von
// scripts/seed-member-profile-fixtures.mjs (Keycloak-Direct-Grant-Token +
// fetch-Helfer), aber zusaetzlich gegen die Live-App-Mitgliedschaft
// (/admin/fansubs/:id/app-members), da das historische Modell allein keine
// Berechtigung trägt. Erzeugt scripts/e2e/fixtures.manifest.json als
// einzige, bei jedem Lauf ueberschriebene Quelle der erzeugten IDs - nie ein
// Passwort oder eine E-Mail-Adresse darin.
//
// Node 18+, keine externen npm-Abhaengigkeiten.
//
// Env (alle optional, provision.sh exportiert E2E_API_BASE/E2E_KC_BASE bereits
// passend zur lokalen .env ueber scripts/e2e/_env-defaults.sh):
//   E2E_API_BASE        default http://127.0.0.1:8092 (docker-compose.yml-Standard)
//   E2E_KC_BASE          default http://127.0.0.1:8081 (docker-compose.yml-Standard)
//   E2E_PASSWORD_ADMIN / _LEADER / _DEPUTY / _MEMBER / _USER  (vom Aufrufer gesetzt, siehe provision.sh)

import { writeFileSync } from 'node:fs'

const API = (process.env.E2E_API_BASE || 'http://127.0.0.1:8092').replace(/\/+$/, '')
const KC = (process.env.E2E_KC_BASE || 'http://127.0.0.1:8081').replace(/\/+$/, '')
const REALM = 'team4s'
const KC_CLIENT = 'team4s-frontend'

const MANIFEST_PATH = new URL('./fixtures.manifest.json', import.meta.url)

const GROUP = { slug: 'e2e-gruppe-a', name: 'E2E Gruppe A', status: 'active', kuerzel: 'e2e-fixture-261026-wve' }
const HIST_MEMBER_DISPLAY_NAME = 'E2E Mitglied'

const ROLE_EMAILS = {
  admin: 'e2e-admin@team4s.test',
  leader: 'e2e-leader@team4s.test',
  deputy: 'e2e-deputy@team4s.test',
  member: 'e2e-member@team4s.test',
}

function log(...a) { console.log('[e2e-fixtures]', ...a) }

function requiredPassword(role) {
  const key = `E2E_PASSWORD_${role.toUpperCase()}`
  const value = process.env[key]
  if (!value || !value.trim()) {
    throw new Error(`${key} ist nicht gesetzt - ein stillschweigend uebersprungenes Konto waere eine falsch-gruene Fixture.`)
  }
  return value
}

// ---- HTTP helpers (Muster: scripts/seed-member-profile-fixtures.mjs) -----

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

async function getToken(label, username, password) {
  const attempt = await kcToken(username, password)
  if (!attempt.ok || !attempt.json.access_token) {
    throw new Error(`${label}: Keycloak-Direct-Grant-Login fehlgeschlagen (status ${attempt.status}): ${JSON.stringify(attempt.json)}`)
  }
  log(`${label}: token acquired`)
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

// ---- Idempotente Schritte --------------------------------------------------

async function ensureGroup(adminToken) {
  // GROUP.kuerzel wird in DERSELBEN Create-Anfrage mitgeschickt, die die
  // Gruppe erzeugt - nicht in einem separaten Schritt danach. Ein lokaler
  // Schreibvorgang (z. B. ein Manifest) NACH der 201-Antwort kann durch
  // einen Prozess-Kill/Host-Abbruch jederzeit verhindert werden; eine
  // serverseitige Eigenschaft, die bereits TEIL der erfolgreichen
  // Create-Antwort selbst ist, kann das nicht - sie existiert exakt in dem
  // Moment, in dem die Gruppe existiert, ohne weiteren Netzwerk-Hop oder
  // Await-Schritt dazwischen. kuerzel hat zusaetzlich eine eigene,
  // serverseitige Eindeutigkeitspruefung (siehe ConflictOwnerError in
  // backend/internal/repository/fansub_repository_groups.go) und ist sowohl
  // bei der Erstellung setzbar als auch in GET/Listen-Antworten lesbar -
  // anders als description (im Create-Request-Modell gar nicht vorhanden)
  // oder created_by (auf fansub_groups nicht modelliert).
  const create = await api('POST', '/api/v1/fansubs', {
    token: adminToken,
    body: { slug: GROUP.slug, name: GROUP.name, status: GROUP.status, kuerzel: GROUP.kuerzel },
  })
  if (create.status === 201) {
    const id = create.json.data.id
    log(`gruppe "${GROUP.slug}" angelegt (id=${id})`)
    return id
  }
  if (create.status === 409) {
    const list = await api('GET', '/api/v1/fansubs', { token: adminToken, query: { q: GROUP.slug, per_page: '500' } })
    must(list, 'liste fansubs')
    const found = (list.json.data || []).find((g) => g.slug === GROUP.slug)
    if (!found) throw new Error(`gruppe "${GROUP.slug}" meldete 409, wurde aber nicht gefunden`)

    // Sicherheitshalt gegen Slug-Kollision: ein Treffer per Slug alleine ist
    // KEIN Beweis, dass diese Gruppe tatsaechlich von diesem Skript erzeugt
    // wurde - jeder andere Prozess/Mensch kann zufaellig denselben Slug
    // vergeben haben. Nur das exakt erwartete, server-persistierte kuerzel
    // zaehlt als verifizierter Fixture-Nachweis - dieser Nachweis ist
    // atomar MIT der Gruppenerstellung entstanden (siehe oben), nicht erst
    // durch einen separaten, abbruchanfaelligen lokalen Schritt danach.
    if (found.kuerzel !== GROUP.kuerzel) {
      throw new Error(
        `gruppe "${GROUP.slug}" (id=${found.id}) existiert bereits, aber ihr kuerzel ("${found.kuerzel}") ` +
        `stimmt nicht mit dem erwarteten E2E-Fixture-Marker ("${GROUP.kuerzel}") ueberein. Abbruch vor ` +
        `jeder Mutation, um keine fremde Gruppe zu veraendern. Falls Gruppe ${found.id} tatsaechlich ` +
        `eine fehlerhaft angelegte E2E-Fixture ist, muss ihr kuerzel manuell auf "${GROUP.kuerzel}" ` +
        `gesetzt oder die Gruppe ueber die Admin-UI geprueft werden.`
      )
    }
    log(`gruppe "${GROUP.slug}" existiert bereits (id=${found.id}), durch kuerzel verifiziert`)
    return found.id
  }
  throw new Error(`ensureGroup(${GROUP.slug}): unerwarteter status ${create.status}: ${JSON.stringify(create.json)}`)
}

async function loadAppMemberIds(adminToken, groupId) {
  // member.member_id (siehe models.FansubGroupMemberIdentity) ist dieselbe
  // Antwort, die auch die POST-Create-Antwort unten liefert - eine zweite
  // Live-Mitgliedschaft ensureAppUserMemberAnchorTx() (bzw. der historisch
  // verlinkte Pfad) legt dafuer serverseitig eine eigene members-Zeile samt
  // verified member_claims-Zeile an (backend/internal/repository/
  // fansub_group_app_members_repository.go). reset-fixtures.sh muss diese
  // ebenfalls abbauen - die member_id wird deshalb hier mitgelesen und am
  // Ende ins Manifest geschrieben, nicht nur die app_user_id.
  const res = await api('GET', `/api/v1/admin/fansubs/${groupId}/app-members`, {
    token: adminToken, query: { per_page: '500' },
  })
  must(res, 'liste app-members')
  const map = new Map((res.json.data || []).map((m) => [m.app_user_id, m.member?.member_id ?? null]))
  return map
}

async function ensureLeadAppMember(adminToken, groupId, appUserId, existingAppUserIds, label) {
  if (existingAppUserIds.has(appUserId)) {
    const memberId = existingAppUserIds.get(appUserId)
    log(`${label}: bereits Live-Mitglied (app_user_id=${appUserId}, member_id=${memberId})`)
    return memberId
  }
  const create = await api('POST', `/api/v1/admin/fansubs/${groupId}/app-members`, {
    token: adminToken,
    body: { app_user_id: appUserId, roles: ['fansub_lead'] },
  })
  const data = must(create, `app-member fansub_lead fuer ${label}`, [201]).data
  const memberId = data.member?.member_id
  if (!memberId) throw new Error(`app-member fansub_lead fuer ${label}: Antwort enthaelt kein member.member_id`)
  existingAppUserIds.set(appUserId, memberId)
  log(`${label}: als fansub_lead live verknuepft (app_user_id=${appUserId}, member_id=${memberId})`)
  return memberId
}

async function ensureHistoricalMemberId(adminToken, groupId) {
  const list = await api('GET', `/api/v1/admin/fansubs/${groupId}/group-members`, {
    token: adminToken, query: { per_page: '500' },
  })
  must(list, 'liste group-members')
  const found = (list.json.data || []).find((m) => m.display_name === HIST_MEMBER_DISPLAY_NAME)
  let histMemberId
  if (found) {
    log(`historischer eintrag "${HIST_MEMBER_DISPLAY_NAME}" existiert bereits (id=${found.id})`)
    histMemberId = found.id
  } else {
    const create = await api('POST', `/api/v1/admin/fansubs/${groupId}/group-members`, {
      token: adminToken,
      body: { display_name: HIST_MEMBER_DISPLAY_NAME },
    })
    histMemberId = must(create, `historischer eintrag "${HIST_MEMBER_DISPLAY_NAME}" anlegen`, [201]).data.id
    log(`historischer eintrag "${HIST_MEMBER_DISPLAY_NAME}" angelegt (id=${histMemberId})`)
  }

  // Die Live-App-Mitgliedschaft (Create, siehe ensureMemberAppMember) verlangt
  // beim Verlinken per historical_member_id eine "offene Rolle" (hist_group_member_roles
  // ohne ended_date) auf dem historischen Eintrag - sonst 409
  // "historical_member_not_current". Ohne das waere die historische Identitaet nur
  // ein Name ohne jede Mitwirkung, was fachlich keine "offene Mitgliedschaft bis heute"
  // ist. Eine einzelne, zeitlich offene "translator"-Rolle reicht als Nachweis.
  const roles = await api('GET', `/api/v1/admin/fansubs/${groupId}/member-roles`, {
    token: adminToken, query: { member_id: String(histMemberId), per_page: '500' },
  })
  must(roles, 'liste member-roles')
  const hasOpenRole = (roles.json.data || []).some((r) => !r.ended_date)
  if (!hasOpenRole) {
    const createRole = await api('POST', `/api/v1/admin/fansubs/${groupId}/member-roles`, {
      token: adminToken,
      body: {
        hist_fansub_group_member_id: histMemberId,
        role_code: 'translator',
        status: 'confirmed',
        visibility: 'public',
      },
    })
    must(createRole, `offene rolle fuer historischen eintrag ${histMemberId} anlegen`, [201])
    log(`historischer eintrag ${histMemberId}: offene "translator"-rolle angelegt`)
  } else {
    log(`historischer eintrag ${histMemberId}: offene rolle bereits vorhanden`)
  }

  return histMemberId
}

async function ensureMemberAppMember(adminToken, groupId, appUserId, historicalMemberId, existingAppUserIds) {
  if (existingAppUserIds.has(appUserId)) {
    const memberId = existingAppUserIds.get(appUserId)
    log(`mitglied: bereits Live-Mitglied (app_user_id=${appUserId}, member_id=${memberId})`)
    return memberId
  }
  const create = await api('POST', `/api/v1/admin/fansubs/${groupId}/app-members`, {
    token: adminToken,
    body: { app_user_id: appUserId, roles: [], historical_member_id: historicalMemberId },
  })
  const data = must(create, 'app-member mitglied (historisch verlinkt)', [201]).data
  const memberId = data.member?.member_id
  if (!memberId) throw new Error('app-member mitglied (historisch verlinkt): Antwort enthaelt kein member.member_id')
  existingAppUserIds.set(appUserId, memberId)
  log(`mitglied: live verknuepft ueber historical_member_id=${historicalMemberId} (app_user_id=${appUserId}, member_id=${memberId})`)
  return memberId
}

// ---- Main -------------------------------------------------------------------

async function main() {
  console.log(`=== Team4s E2E-Fixture-Provisioning (API=${API}, KC=${KC}) ===`)

  const adminPw = requiredPassword('admin')
  const leaderPw = requiredPassword('leader')
  const deputyPw = requiredPassword('deputy')
  const memberPw = requiredPassword('member')
  requiredPassword('user') // existiert absichtlich nur in Keycloak, kein DB-Fixture (siehe CONTEXT.md)

  const adminToken = await getToken('e2e-admin', ROLE_EMAILS.admin, adminPw)
  const meAdmin = must(await api('GET', '/api/v1/me', { token: adminToken }), 'GET /me (admin)')
  if (meAdmin.data.is_platform_admin !== true) {
    throw new Error('e2e-admin ist laut /api/v1/me kein platform_admin - Task 1 wurde nicht korrekt ausgefuehrt')
  }

  const groupId = await ensureGroup(adminToken)

  const leaderToken = await getToken('e2e-leader', ROLE_EMAILS.leader, leaderPw)
  const meLeader = must(await api('GET', '/api/v1/me', { token: leaderToken }), 'GET /me (leader)')
  const leaderAppUserId = meLeader.data.app_user_id

  const deputyToken = await getToken('e2e-deputy', ROLE_EMAILS.deputy, deputyPw)
  const meDeputy = must(await api('GET', '/api/v1/me', { token: deputyToken }), 'GET /me (deputy)')
  const deputyAppUserId = meDeputy.data.app_user_id

  const memberToken = await getToken('e2e-member', ROLE_EMAILS.member, memberPw)
  const meMember = must(await api('GET', '/api/v1/me', { token: memberToken }), 'GET /me (member)')
  const memberAppUserId = meMember.data.app_user_id

  const existingAppUserIds = await loadAppMemberIds(adminToken, groupId)

  const leaderMemberId = await ensureLeadAppMember(adminToken, groupId, leaderAppUserId, existingAppUserIds, 'e2e-leader')
  const deputyMemberId = await ensureLeadAppMember(adminToken, groupId, deputyAppUserId, existingAppUserIds, 'e2e-deputy')

  const historicalMemberId = await ensureHistoricalMemberId(adminToken, groupId)
  const memberMemberId = await ensureMemberAppMember(adminToken, groupId, memberAppUserId, historicalMemberId, existingAppUserIds)

  const manifest = {
    manifest_version: 1,
    fansub_group_id: groupId,
    group_slug: GROUP.slug,
    members: {
      leader: { app_user_id: leaderAppUserId, member_id: leaderMemberId },
      deputy: { app_user_id: deputyAppUserId, member_id: deputyMemberId },
      member: { app_user_id: memberAppUserId, historical_member_id: historicalMemberId, member_id: memberMemberId },
    },
  }
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  log(`manifest geschrieben: ${MANIFEST_PATH.pathname}`)

  console.log('\nRESULT: PASS')
}

main().catch((err) => {
  console.error('\n[e2e-fixtures][FATAL]', err.message)
  process.exit(1)
})
