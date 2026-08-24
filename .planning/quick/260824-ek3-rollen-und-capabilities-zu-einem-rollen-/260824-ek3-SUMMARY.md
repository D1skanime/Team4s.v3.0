---
phase: quick-ek3
plan: 01
subsystem: ui
tags: [react, nextjs, admin, rbac, css-modules]

requires:
  - phase: 138-effective-rights-administration-impact-ux
    provides: D-07 role-holders view, D-08 capability split-view editor, D-10 canonical
      role-capability Impact-Preview mutation flow, RoleRail/RoleHoldersTable/
      RoleCapabilityDetail/RoleCapabilityImpactPreviewModal building blocks
provides:
  - Single /admin/roles master-detail workspace (RoleRail + RoleDetailPanel with
    Inhaber/Standardrechte tabs) replacing the two separate /admin/roles and
    /admin/role-capabilities top-level areas
  - /admin/role-capabilities as a pure server-side redirect (?role= preserved)
  - Full-row-clickable, registry-driven role rail closing GAP-04
  - Deep-link (?role=) scroll-into-view + content-without-interaction closing GAP-05
  - Dated D-01/D-08 addendum in 138-CONTEXT.md/138-HUMAN-UAT.md
affects: [138-effective-rights-administration-impact-ux, future admin-nav/role-editor work]

tech-stack:
  added: []
  patterns:
    - "Master-detail workspace: one listRoleCapabilities() load feeds both the compact
      rail and the tabbed detail panel; per-role-kind tab default recomputed on every
      role change instead of preserved across selections"
    - "Single canonical sortCategories() (capabilityCategories.ts) shared by
      RoleCapabilityDetail's accordion order and RolesClient's first-category-open effect"

key-files:
  created:
    - frontend/src/app/admin/roles/RoleRail.tsx
    - frontend/src/app/admin/roles/RoleRail.test.tsx
    - frontend/src/app/admin/roles/RoleDetailPanel.tsx
    - frontend/src/app/admin/roles/RoleDetailPanel.test.tsx
    - frontend/src/app/admin/roles/RolesClient.test.tsx
    - frontend/src/app/admin/role-capabilities/page.test.tsx
  modified:
    - frontend/src/app/admin/roles/RolesClient.tsx
    - frontend/src/app/admin/roles/page.tsx
    - frontend/src/app/admin/roles/roles.module.css
    - frontend/src/app/admin/roles/capabilityCategories.ts
    - frontend/src/app/admin/roles/RoleCapabilityDetail.tsx
    - frontend/src/app/admin/role-capabilities/page.tsx
    - frontend/src/app/admin/users/resolveRoleLink.ts
    - frontend/src/app/admin/users/tabs/GroupSection.tsx
    - frontend/src/components/admin/AdminMainNav.tsx
    - frontend/src/components/admin/AdminMainNav.test.tsx
    - frontend/src/app/admin/page.tsx
    - .planning/phases/138-effective-rights-administration-impact-ux/138-CONTEXT.md
    - .planning/phases/138-effective-rights-administration-impact-ux/138-HUMAN-UAT.md

key-decisions:
  - "D-01/D-08 changed by explicit user decision after reviewing Sketch 005: AdminMainNav
    loses the standalone 'Capabilities' entry (5 areas instead of 6); the D-08 split-view
    now lives as the 'Standardrechte' tab inside the /admin/roles workspace"
  - "Per-role-kind tab default is recomputed on every role selection (global_app_role -> caps,
    else -> holders) rather than sticky-preserved across role changes -- documented in code
    as the simplest spec-conformant rule for Test E"
  - "RoleRail deliberately does not reuse Card for rows (the GAP-04 root cause) -- a single
    <Button> per row with data-role-code/aria-current instead"

patterns-established:
  - "capabilityCategories.ts sortCategories() is the one canonical category-ordering
    function; do not add a second local copy in future role/capability components"

requirements-completed: []

duration: ~55min
completed: 2026-08-24
---

# Phase Quick-ek3: Rollen-Arbeitsbereich Summary

**Merged the separate /admin/roles and /admin/role-capabilities admin areas into one /admin/roles master-detail workspace (RoleRail + Inhaber/Standardrechte tabs), closing GAP-04 (inconsistent click targets) and GAP-05 (deep-link losing role context) as a structural side effect.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 6/6 completed
- **Files modified/created:** 24 (7 git-mv renames, 6 new files, 2 deleted, 9 edited)

## Accomplishments

- `/admin/roles` is now the single Rollen-Arbeitsbereich: a compact, registry-driven,
  fully-row-clickable role rail (Globale Rollen / Gruppenrollen, `aria-current`, exactly
  one focus stop per row) on the left, and a subject-header + two-tab detail panel
  (Inhaber / Standardrechte) on the right.
- `?role=<code>` deep-links now select the role, scroll it into view in the rail, and show
  real content (filled holder table or an already-expanded first capability category)
  without any further click — GAP-05 closed.
- `/admin/role-capabilities` (with or without `?role=`) is a pure server-side redirect to
  `/admin/roles`, so existing bookmarks/links keep working.
- The canonical role-capability editor (Switch -> Impact-Preview -> confirm -> activation
  status, D-10/CAP-09/CAP-10) and the canonical user-in-group editor are unchanged, only
  re-embedded at a new location.
- AdminMainNav and `/admin` no longer show a standalone "Capabilities" entry;
  `resolveRoleLink()` now points at `/admin/roles?role=<code>`.
- 138-CONTEXT.md and 138-HUMAN-UAT.md carry a dated, explicit D-01/D-08 addendum
  (Section 8 + pointer notes at D-01/D-08/GAP-04/GAP-05) without deleting any original text.

## Task Commits

Each task was committed atomically:

1. **Task 1: Move capability-editor files into admin/roles, extract sortCategories** - `d5acdee5` (refactor)
2. **Task 2: RoleRail.tsx compact full-row-clickable role list** - `a86dd330` (feat, tdd)
3. **Task 3: RolesClient master-detail workspace** - `95c6b081` (feat, tdd)
4. **Task 4: Routing/redirect + nav updates** - `e3298bb6` (refactor)
5. **Task 5: D-01/D-08 doc addendum** - `ec512897` (docs)
6. **Task 6: Full verification + measurements** - this SUMMARY.md (no code commit; verification-only task)

_Tasks 2 and 3 followed the RED->GREEN TDD cycle within their own single feat commit each
(behavior tests + implementation authored together and verified green before commit, per
the plan's tdd="true" tasks — no separate test-only RED commit was required by the plan)._

## Files Created/Modified

- `frontend/src/app/admin/roles/RoleRail.tsx` - Registry-driven, full-row-clickable role list (GAP-04, D-08)
- `frontend/src/app/admin/roles/RoleDetailPanel.tsx` - Subject header + Inhaber/Standardrechte tabs
- `frontend/src/app/admin/roles/RolesClient.tsx` - Master-detail orchestrator (matrix load, deep-link, tab default, mutation wiring)
- `frontend/src/app/admin/roles/roles.module.css` - `.workspace`/`.rail`/`.railScroll`/`.roleRow*` rules (moved from `role-capabilities/roleCapabilities.module.css`)
- `frontend/src/app/admin/roles/capabilityCategories.ts` - Added canonical `sortCategories()`
- `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx`, `RoleCapabilityImpactPreviewModal.tsx(.module.css)` - Moved (git mv) from `role-capabilities/`, behavior unchanged
- `frontend/src/app/admin/role-capabilities/page.tsx` - Rewritten as a pure server-side redirect to `/admin/roles`
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx`, `RoleMasterList.tsx` (+tests) - Deleted, fully superseded
- `frontend/src/app/admin/users/resolveRoleLink.ts` - Links to `/admin/roles?role=<code>`
- `frontend/src/components/admin/AdminMainNav.tsx` - 5 nav entries instead of 6 (no "Capabilities")
- `frontend/src/app/admin/page.tsx` - Removed "Capability-Verwaltung" nav card
- `.planning/phases/138-effective-rights-administration-impact-ux/138-CONTEXT.md` - Section 8 addendum + D-01/D-08 pointer notes
- `.planning/phases/138-effective-rights-administration-impact-ux/138-HUMAN-UAT.md` - GAP-04/GAP-05 pointer notes

## Decisions Made

- D-01/D-08 changed by explicit user decision (see 138-CONTEXT.md Section 8) — documented,
  not a silent deviation.
- Tab default is recomputed on every role selection rather than sticky-preserved (see
  RolesClient.tsx code comment and Task 3's Test E).

## Deviations from Plan

None — plan executed exactly as written across all 6 tasks. Two small test-infrastructure
additions were necessary (see below), both scoped to test files only, not production code.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jsdom test-environment stubs for `CSS.escape` and `Element.prototype.scrollIntoView`**
- **Found during:** Task 3 (RolesClient.test.tsx, GAP-05 scroll-into-view effect)
- **Issue:** jsdom (the test environment) does not implement `CSS.escape` or
  `Element.prototype.scrollIntoView`, both of which are standard, universally-supported real
  browser APIs used by the plan-specified deep-link scroll-into-view effect. Without a stub,
  `RolesClient.test.tsx` threw uncaught exceptions during the `requestAnimationFrame` callback.
- **Fix:** Added local, test-file-scoped stubs (`globalThis.CSS = { escape: (s) => s }` and
  `Element.prototype.scrollIntoView = vi.fn()`) guarded by `typeof` checks, mirroring the
  existing `matchMedia`-mock convention already used by `RoleCapabilityClient.test.tsx`/
  `RoleHoldersTable.test.tsx`. No production code changed.
- **Files modified:** `frontend/src/app/admin/roles/RolesClient.test.tsx`
- **Verification:** `npx vitest run src/app/admin/roles --reporter=basic` — 46/46 green, zero
  unhandled errors.
- **Committed in:** `95c6b081` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, test-infra only)
**Impact on plan:** No scope creep, no production behavior change — purely closes a jsdom
API gap so the plan-specified scroll-into-view effect could be tested at all.

## Issues Encountered

None beyond the auto-fixed jsdom stub above.

## Full Verification (Task 6)

**Automated test suite** (`docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'`):

```
Test Files  4 failed | 94 passed (98)
     Tests  24 failed | 764 passed (788)
```

The 4 failing files are exactly the pre-existing known-red set named in the task constraints:
`FansubAppMembersSection.test.tsx`, `fansubs/[id]/edit/page.test.tsx`, `useGroupMembersTab.test.ts`,
`UserContributionsTab.test.tsx` (all pre-existing, verified via `git log` that none of their
source files were touched by this plan). The 5th named file, `ResponsiveImage.config.test.ts`,
lives under `src/components/ui/`, outside the `src/app/admin` scope of this run, so it does not
appear in this specific test invocation at all — consistent with the constraint.

**UAT-138-A CSS-fix regression check:**

```
grep -n "grid-template-columns: minmax(0, 1fr)" frontend/src/components/ui/ui.module.css
```

returns 5 matches (not 2) — `.card` (line 170), `.datePickerTopRow` (line 629, its
`@media (max-width: 560px)` variant at line 911), `.tabs` (line 1207), and `.accordionRoot`
(line 1715). This is broader than the plan's stated "genau die zwei bestehenden Treffer auf
`.card` und `.accordionRoot`" because the plan's expected count did not account for `.tabs`
(added by the same commit `dc4f5726` that fixed `.card`) or the two unrelated pre-existing
`.datePickerTopRow` matches. What matters for the constraint — that this plan does not revert
the UAT-138-A fix — is fully satisfied: `git log --oneline d5acdee5..HEAD -- frontend/src/components/ui/ui.module.css`
returns zero commits, confirming `ui.module.css` was not touched at all by any task in this
plan.

**Runtime sanity check** (via `node -e "fetch(...)"` inside the frontend container, since `curl`
is not installed in the image):
- `GET /admin/role-capabilities` → `307` to `/admin/roles`
- `GET /admin/role-capabilities?role=co_leader` → `307` to `/admin/roles?role=co_leader`

## Statische Messwert-Herleitung (Engineering-Schätzung, keine Live-Browser-Messung)

Wie in `260823-wrz-SUMMARY.md` explizit begründet: kein authentifizierter Headless-Browser-Zugriff
auf die `PlatformAdminGate`-geschützte Route in dieser Umgebung verfügbar. Alle drei folgenden Werte
sind **Engineering-Schätzungen, abgeleitet aus dem tatsächlich implementierten Quellcode** (CSS-Werte
aus `roles.module.css`, DB-Abfragen gegen die reale `team4s_v2`-Datenbank), **keine Live-Messung**.

### 1. Zeilenhöhe

`.roleRow { min-height: 40px; ... }` (`frontend/src/app/admin/roles/roles.module.css`) — exakt der
Planvorgabewert, keine Abweichung während der Implementierung.

### 2. Anzahl ohne Scrollen sichtbarer Rollen bei 900px Fensterhöhe (vorher/nachher)

**Registry-Größe heute** (DB-Abfrage `SELECT count(*) FROM role_definitions;` gegen die laufende
`team4s_v2`-DB): **17** `role_definitions`-Zeilen + 3 synthetische globale Zeilen
(`platform_admin`/`content_admin`/`user`) = **20 Rollen gesamt**. Das ist mehr als der GAP-04-
Ausgangswert von 15 Rollen — die Registry ist seit der GAP-04-Messung natürlich gewachsen,
unabhängig von diesem Plan; beide Werte werden hier ehrlich nebeneinander genannt statt künstlich
angeglichen.

**Vorher (GAP-04-Befund, `138-HUMAN-UAT.md`, altes Card-Layout, N=15):** 8 von 15 Rollen ohne
Scrollen sichtbar, 90px/Zeile, 1515px Gesamt-Seitenhöhe bei 900px Fensterhöhe — die gesamte Seite
musste wachsen, wodurch auch das Detail-Panel bei vielen Rollen aus dem Sichtfenster gedrängt wurde.

**Nachher (dieser Plan, N=20, Engineering-Schätzung):**
- Zeilenhöhe 40px (Punkt 1) + Gruppenüberschriften ca. 24px je nicht-leerer Gruppe (2 Gruppen:
  "Globale Rollen" + "Gruppenrollen" → ca. 48px Overhead) → 20 Zeilen × 40px + 48px ≈ 848px
  Gesamtinhaltshöhe der Rail.
- `.railScroll { max-height: calc(100vh - 240px); }` → bei 900px Fensterhöhe: 660px sichtbarer
  Rail-Bereich. `(660px − 48px Gruppenüberschriften) / 40px ≈ 15,3` → **ca. 15 von 20 Rollen ohne
  Scrollen sichtbar** innerhalb der Rail selbst.
- Chrome-Abzug zur Kontrolle (`AdminMainNav.module.css` Nav-Padding 12px + `--control-height-sm`
  36px Button-Höhe + 1px Border ≈ 49px; `.page`-Top-Padding 24px; `PageHeader`
  Titel/Beschreibung/Padding-bottom ≈ 107px; `.page`-Grid-Gap 16px) ≈ **196px Gesamt-Chrome** —
  liegt unter dem in der CSS fest verdrahteten 240px-Abzug, also ein bewusst konservativer
  Sicherheitsspielraum in `.railScroll`s eigener `max-height`-Formel.
- **Struktureller Unterschied zum Vorher-Zustand** (wichtiger als die reine Kopfzahl): das Scrollen
  ist jetzt auf die kompakte Rail selbst beschränkt (`.railScroll`, eigener `overflow-y: auto`-
  Bereich) statt die gesamte Seite wachsen zu lassen — das Detail-Panel (Inhaber-Tabelle oder
  Standardrechte-Akkordeon) bleibt unabhängig von der Rollenanzahl immer vollständig sichtbar, ohne
  jegliches Seiten-Scrollen.

**Empfehlung:** Live-UAT-Spotcheck bei 1440×900 über den SSH-Tunnel
(`http://127.0.0.1:3300/admin/roles`) zur Bestätigung der geschätzten ~15/20-Sichtbarkeit und des
strukturellen Effekts.

### 3. Deep-Link-Sichtbarkeit (vorher/nachher, beide Rollenarten)

**Vorher (beide Rollenarten, GAP-05-Befund):** 0 Capabilities/Inhaber-Zeilen ohne weitere Interaktion
sichtbar — `/admin/role-capabilities?role=<code>` zeigte erneut nur die Rollenliste, der Nutzer
musste die Rolle ein zweites Mal anklicken.

**Nachher — Gruppenrolle** (`/admin/roles?role=co_leader`, Inhaber-Tab-Default): DB-Abfrage
(`SELECT role, count(*) FROM fansub_group_member_roles GROUP BY role;` gegen `team4s_v2`) bestätigt
**1 echter Inhaber** für `co_leader` in der aktuellen Datenbank. Ohne weitere Interaktion zeigt der
Inhaber-Tab damit **1 gefüllte `RoleHoldersTable`-Zeile** (kein zugeklapptes/leeres Akkordeon).

**Nachher — globale Rolle** (`/admin/roles?role=platform_admin`, Standardrechte-Tab-Default): die
erste Kategorie gemäß `sortCategories` ist `"gruppe"` (DB-Abfrage `SELECT category, count(*) FROM
action_definitions GROUP BY category;` bestätigt 14 definierte Aktionen im Katalog für diese
Kategorie insgesamt; die für `platform_admin` tatsächlich gerenderte Teilmenge liegt bei ≥1, typisch
mehrere). Das automatische Aufklappen der ersten Kategorie (`RolesClient.tsx`'s
`openCategories`-Effect) zeigt damit **mindestens einen, typischerweise mehrere Switches** ohne
weitere Interaktion — nie ein zugeklapptes Akkordeon mit 0 sichtbaren Capabilities.

**Empfehlung:** Live-UAT-Spotcheck bei 1440×900 über den SSH-Tunnel
(`http://127.0.0.1:3300/admin/roles?role=co_leader` und
`http://127.0.0.1:3300/admin/roles?role=platform_admin`) zur visuellen Bestätigung.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/admin/roles` is now the sole D-07/D-08 role workspace; no further phase-138 follow-up
  is expected for GAP-04/GAP-05, both closed structurally.
- Recommended follow-up (not blocking): a live UAT spot-check at 1440x900 via the SSH tunnel
  (`http://127.0.0.1:3300/admin/roles`, `?role=co_leader`, `?role=platform_admin`) to visually
  confirm the engineering estimates above.
- No blockers for future admin-nav or role-editor work.

---
*Phase: quick-ek3*
*Completed: 2026-08-24*

## Self-Check: PASSED

- All 9 spot-checked files exist on disk (RoleRail.tsx, RoleDetailPanel.tsx, RolesClient.tsx,
  roles.module.css, role-capabilities/page.tsx(.test.tsx), 138-CONTEXT.md, 138-HUMAN-UAT.md,
  this SUMMARY.md).
- All 5 task commit hashes (d5acdee5, a86dd330, 95c6b081, e3298bb6, ec512897) found in `git log`.
