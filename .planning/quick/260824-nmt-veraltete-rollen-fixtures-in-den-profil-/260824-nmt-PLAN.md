---
phase: quick-nmt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Die Test-Fixtures in MemberCurrentProjectsSection.test.tsx verwenden nur echte, in roleCatalog.ts existierende icon_key/color_key-Werte (keine erfundenen Kategorienamen wie 'technical'/'creative'/'language')."
    - "Der Test 'orders and labels catalog roles while keeping karaoke, typesetting and unknown roles distinct' prüft wieder eine echte, aus der Registry abgeleitete colorKey-Zuordnung statt sie durch eine erratene Erwartung grün zu färben."
    - "frontend/src/lib/roleCatalog.ts bleibt byteweise unverändert (Produktionscode ist korrekt, nur Test-Fixtures sind veraltet)."
    - "Die 5 Tests in MemberBadgeChain.test.tsx (4) und MembershipsSection.test.tsx (1), die aus anderer, unrelated Ursache fehlschlagen (Badge-Special-Gruppe / CSS-Grid-Layout, nicht Rollenregistry), bleiben unangetastet und werden nicht fälschlich als 'gefixt' gemeldet."
  artifacts:
    - path: "frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx"
      provides: "Rollen-Fixture (catalogRoles) mit echten ROLE_COLOR_KEYS-Hexwerten statt erfundener Kategorienamen; Assertions prüfen die daraus resultierende reale colorKey/'neutral'-Zuordnung"
      contains: "'#0f766e'"
  key_links:
    - from: "frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx (catalogRoles fixture)"
      to: "frontend/src/lib/roleCatalog.ts (ROLE_COLOR_KEYS, ICON_KEYS)"
      via: "color_key/icon_key values in the fixture must be members of the real ROLE_COLOR_KEYS/ICON_KEYS sets"
      pattern: "color_key: '#(0f766e|7e22ce|0369a1)'"
---

<objective>
Repariert die veraltete Rollen-Fixture in `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx`,
die noch aus-dem-Rollencode-abgeleitete Kategorienamen ('technical', 'creative', 'language') als
`color_key` verwendet statt echter Werte aus `ROLE_COLOR_KEYS` in `roleCatalog.ts`. Seit der
Registry-Umstellung ist `presentationForRole` (`frontend/src/lib/roleCatalog.ts:54-58`) rein
Registry-getrieben: `colorKey` wird über `boundedColorKey()` gegen die echten Hex-Werte in
`ROLE_COLOR_KEYS` geprüft und fällt bei Nichttreffer korrekt auf `'neutral'` zurück. Der
Produktionscode ist korrekt; die Fixture ist veraltet.

**Befund-Korrektur gegenüber dem ursprünglichen Auftrag (live nachgemessen in diesem Planungsschritt):**
Der volle Testlauf zeigt tatsächlich 6 fehlschlagende Tests in 3 Dateien unter
`frontend/src/components/profile` — die Dateizahl/Testzahl aus dem Auftrag stimmt. Die
angenommene EINHEITLICHE URSACHE (Rollen-Registry-Fixture ohne icon_key/color_key) trifft aber nur
auf **einen** dieser 6 Tests zu:
`MemberCurrentProjectsSection.test.tsx > orders and labels catalog roles while keeping karaoke,
typesetting and unknown roles distinct`. Die anderen 5 fehlschlagenden Tests haben nachweislich
eine andere, unrelated Ursache und dürfen laut Task-Scope ("ausschliesslich ... Rollen-Fixtures")
nicht angefasst werden:

- `MemberBadgeChain.test.tsx` (4 Tests: "keeps category order, a non-founder founding stage locked
  and the next year target reachable", "Phase 127 RED chain suppresses legacy Special while
  preserving five retained groups", "Phase 120 Task 2: keeps SSR carousel content while expensive
  listeners remain dormant", plus deren Kaskadeneffekt) — Ursache ist eine fehlende/unvollständige
  Unterdrückung der Legacy-"Special"-Badge-Gruppe (`data-badge-group="special"`,
  "Besondere Auszeichnungen"-Heading/Karussell), völlig unabhängig von `roleCatalog.ts`. Diese
  Fixture in dieser Datei setzt bereits gültige `color_key`/`icon_key`-Werte je Rollencode
  (`code === 'karaoke_fx' ? 'creative' : 'other'` bzw. `... : 'image' : ... 'film' : 'user'`) und
  ist NICHT das hier beschriebene "fehlt icon_key komplett"-Muster.
- `MembershipsSection.test.tsx` (1 Test: "keeps membership cards bounded in a responsive
  overflow-safe grid") — Ursache ist ein CSS-`grid-template-columns`-Wert
  (`repeat(3, minmax(0, 360px))` erwartet, `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`
  gefunden) in `MembershipsSection.module.css`; hat nichts mit Rollen-Registry zu tun.

Dieser Plan behebt **ausschließlich** den einen Test, der tatsächlich durch die
Registry-Umstellung verursacht wird. Die anderen 5 bleiben bewusst rot und werden im SUMMARY als
separates, nicht in diesem Auftrag behobenes Thema dokumentiert (kein stillschweigendes Ignorieren,
keine falsche "0 Fehler"-Meldung).

Purpose: Test-Fixtures wieder inhaltlich korrekt gegen die reale Rollen-Registry prüfen lassen,
ohne Produktionscode zu verändern oder unrelated rote Tests fälschlich als gefixt zu melden.
Output: Ein korrigierter, tatsächlich aussagekräftiger Test in MemberCurrentProjectsSection.test.tsx
plus eine präzise Dokumentation der verbleibenden, unrelated roten Tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@frontend/src/lib/roleCatalog.ts
@frontend/src/components/profile/MemberCurrentProjectsSection.tsx
</context>

<interfaces>
<!-- Ground truth from frontend/src/lib/roleCatalog.ts — the ONLY source of valid icon_key/
     color_key values. Do not invent values outside these sets. -->
```typescript
export const ROLE_COLOR_KEYS = [
  '#183b7c', '#8c4a16', '#0f766e', '#475569', '#7e22ce', '#0369a1', '#27664f',
  '#6d3f83', '#c26a2e', '#7b3c4e', '#a16207', '#506b91', '#a04444', '#6b7f2a', '#b23a78',
] as const
export const NEUTRAL_ROLE_COLOR_KEY = 'neutral' as const
const ICON_KEYS = new Set(['crown', 'image', 'wrench', 'languages', 'check', 'film', 'user'])

// presentationForRole: if the role is missing OR its icon_key is not in ICON_KEYS -> neutral.
// Otherwise colorKey = the role's color_key IF it is a member of ROLE_COLOR_KEYS, else 'neutral'.
export function presentationForRole(rows, code): RolePresentation {
  const role = getRole(rows, code)
  if (!role || !role.icon_key || !ICON_KEYS.has(role.icon_key)) return neutral
  return { colorKey: boundedColorKey(role.color_key), iconKey: role.icon_key }
}
```

<!-- MemberCurrentProjectsSection.tsx (line 186) sets data-role-code from the colorKey, NOT the
     raw role code -- this is what the failing test's assertions actually observe: -->
```typescript
data-role-code={presentationForRole(contributionRoles, role.code).colorKey}
```

<!-- Current (broken) fixture in MemberCurrentProjectsSection.test.tsx, lines 14-20 -- icon_key
     values are already valid ICON_KEYS members and MUST stay unchanged; only color_key is wrong: -->
```typescript
const { catalogRoles } = vi.hoisted(() => ({
  catalogRoles: [
    { code: 'typesetter', label_de: 'Typesetting', contexts: ['anime_contribution'], sort_order: 20, color_key: 'technical', icon_key: 'wrench' },
    { code: 'karaoke_fx', label_de: 'Karaoke-FX', contexts: ['anime_contribution'], sort_order: 30, color_key: 'creative', icon_key: 'image' },
    { code: 'translator', label_de: 'Übersetzung', contexts: ['anime_contribution'], sort_order: 40, color_key: 'language', icon_key: 'languages' },
  ],
}))
```

<!-- Current (wrong-expectation) assertions, lines 98-100 -- these check data-role-code, which is
     the colorKey, so the expected values must be real ROLE_COLOR_KEYS hex strings (or 'neutral'
     for the deliberately-unknown 'future_role', which has no catalog entry at all): -->
```typescript
expect(screen.getByText('Typesetting').getAttribute('data-role-code')).toBe('technical')
expect(screen.getByText('Karaoke-FX').getAttribute('data-role-code')).toBe('creative')
expect(screen.getByText('Future Role').getAttribute('data-role-code')).toBe('other')
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Confirm scope via live test run, then repair the stale role-fixture and its assertions</name>
  <files>frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx</files>
  <action>
    Step 1 — confirm scope before editing anything: run
    `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/profile --reporter=basic'`
    and read the failure list. Confirm it matches this plan's objective section: exactly 1 failing
    test in MemberCurrentProjectsSection.test.tsx is caused by role-registry fixture drift
    (data-role-code / colorKey mismatch); the other failures (in MemberBadgeChain.test.tsx and
    MembershipsSection.test.tsx) are unrelated (badge-group suppression, CSS grid) and MUST NOT be
    touched. If the live failure set differs meaningfully from this description, stop and report the
    discrepancy instead of guessing a fix.

    Step 2 — fix the fixture (`catalogRoles`, the `vi.hoisted` array near the top of the file):
    replace the invented category-name `color_key` values with real, distinct hex strings taken
    directly from `ROLE_COLOR_KEYS` in `frontend/src/lib/roleCatalog.ts`: `typesetter` gets
    `color_key: '#0f766e'`, `karaoke_fx` gets `color_key: '#7e22ce'`, `translator` gets
    `color_key: '#0369a1'` (all three are real members of `ROLE_COLOR_KEYS` — do not invent new
    ones). Leave every `icon_key` value (`'wrench'`, `'image'`, `'languages'`) unchanged — they are
    already real members of `ICON_KEYS` and are not the bug.

    Step 3 — fix the test `'orders and labels catalog roles while keeping karaoke, typesetting and
    unknown roles distinct'` (the assertions currently at lines ~98-100): change the three
    `data-role-code` expectations to the resulting real values: `'Typesetting'` -> `'#0f766e'`,
    `'Karaoke-FX'` -> `'#7e22ce'`, `'Future Role'` -> `'neutral'`. The `'Future Role'` case
    deliberately uses `code: 'future_role'`, which has NO entry in `catalogRoles` — per
    `presentationForRole`, an unmatched role always resolves to `neutral`, so `'neutral'` is the
    correct, precise expectation here (this is the task's explicit "role without icon_key stays
    neutral" case) — keep this assertion present and precise, do not remove it or weaken it to a
    non-committal check.

    Do not modify `frontend/src/lib/roleCatalog.ts`, any other file under
    `frontend/src/components/profile`, or any of the explicitly out-of-scope files
    (`frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx`,
    `FansubAppMembersSection.test.tsx`, `fansubs/[id]/edit/page.test.tsx`,
    `useGroupMembersTab.test.ts`, `ResponsiveImage.config.test.ts`).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/profile/MemberCurrentProjectsSection.test.tsx --reporter=basic'</automated>
  </verify>
  <done>
    All tests in MemberCurrentProjectsSection.test.tsx pass, including the previously-failing
    `'orders and labels catalog roles...'` test, which now asserts real registry-derived colorKey
    values (two distinct real hex strings) plus the deliberate `'neutral'` fallback for the unknown
    `future_role` case. `roleCatalog.ts` is untouched.
  </done>
</task>

<task type="auto">
  <name>Task 2: Run full profile-suite verification and document the exact scope in SUMMARY.md</name>
  <files>.planning/quick/260824-nmt-veraltete-rollen-fixtures-in-den-profil-/260824-nmt-SUMMARY.md</files>
  <action>
    Run, in the container (never on the host):
    `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/profile --reporter=basic'`.
    Confirm the result is exactly: MemberCurrentProjectsSection.test.tsx fully green; the 5
    previously-identified unrelated failures in MemberBadgeChain.test.tsx (4) and
    MembershipsSection.test.tsx (1) remain exactly as before this plan (untouched, unchanged failure
    reasons — this proves Task 1 introduced no regression and attempted no unscoped fix).

    Write the SUMMARY covering: (a) the exact fixture values changed in
    MemberCurrentProjectsSection.test.tsx (before/after `color_key` per role code), (b) an explicit
    statement that `'neutral'` was deliberately kept/corrected as the expected result for the
    `future_role` case (simulating an unknown/future role with no catalog entry), (c) an explicit
    statement that `roleCatalog.ts` was not touched, (d) the Befund-Korrektur from this plan's
    objective: the original task assumed all 6 failing tests shared the registry-fixture root cause,
    but live verification showed only 1 of 6 did — the other 5 (MemberBadgeChain.test.tsx x4,
    MembershipsSection.test.tsx x1) have unrelated causes (legacy "Special" badge-group suppression,
    CSS grid-template-columns) and were correctly left untouched per this task's scope, (e) the exact
    full-suite failure count before (6) and after (5) this plan.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/profile --reporter=basic' 2>&1 | grep -E "Tests\s+[0-9]+ failed"</automated>
  </verify>
  <done>
    Full `src/components/profile` suite shows exactly 5 remaining (unrelated, unchanged, correctly
    out-of-scope) failures, down from 6; SUMMARY.md documents the fixture change, the deliberate
    'neutral' case, the untouched roleCatalog.ts, and the Befund-Korrektur precisely.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Test-only change | No runtime/production code path, no user input, no network/DB access; change is confined to a Vitest fixture and its assertions in a `*.test.tsx` file. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-nmt-01 | Tampering | Test fixture values | accept | Fixture values are constrained to real, existing `ROLE_COLOR_KEYS`/`ICON_KEYS` members from `roleCatalog.ts`, never invented; no production code, dependency, or install is touched. |
</threat_model>

<verification>
Run, inside the `team4sv30-frontend` container, never on the host:
`docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/profile --reporter=basic'`

Expected: `MemberCurrentProjectsSection.test.tsx` fully green. The following pre-existing failures
are known-red BEFORE this plan, have a confirmed unrelated root cause, and are explicitly NOT to be
investigated or fixed as part of this task — verify only that they are unchanged, do not attempt to
turn them green: `MemberBadgeChain.test.tsx` (4 tests: legacy "Special" badge-group suppression /
SSR carousel heading enumeration), `MembershipsSection.test.tsx` (1 test: CSS
grid-template-columns mismatch).
</verification>

<success_criteria>
- `frontend/src/lib/roleCatalog.ts` is byte-for-byte unchanged.
- Only `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx` is modified.
- The repaired test asserts real, registry-derived `colorKey` values (not invented category names)
  plus the correct `'neutral'` fallback for the deliberately-unknown `future_role` case.
- The 5 named out-of-scope files/tests (`MemberBadgeChain.test.tsx`, `MembershipsSection.test.tsx`,
  and the 5 explicitly-excluded files from the task brief) remain untouched.
- SUMMARY.md documents the exact fixture change and the Befund-Korrektur (1 of 6 failures actually
  caused by role-registry drift, not 6 of 6) so the discrepancy is never silently glossed over.
</success_criteria>

<output>
Create `.planning/quick/260824-nmt-veraltete-rollen-fixtures-in-den-profil-/260824-nmt-SUMMARY.md` when done
</output>
