---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
verified: 2026-10-20T15:45:00Z
status: human_needed
score: 26/26 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Projektseite /anime/2/group/26 im Browser öffnen: Kopfbereich zeigt Coop-Partner-Kennzahl nur bei echtem gemeinsamem Release (Name(n) klickbar zur Partner-Projektseite), 'Weitere Gruppen zu diesem Anime' erscheint NICHT im Kopfbereich, sondern unten in 'Mehr entdecken' im dortigen Linkstil."
    expected: "Kein Logo/AvatarStack mehr in der Kennzahl; bei 0 Coop-Partnern ist die Kennzahl komplett ausgeblendet; bei >=3 ist die aufklappbare Liste nutzbar; alle Links führen zu /anime/<id>/group/<id>, nie zu /fansubs/<slug>."
    why_human: "Visuelles Layout/Stimmigkeit im bestehenden Design (D-05/D-06) ist nicht per grep abschließend beurteilbar, auch wenn Datenlogik und Link-Ziele bereits durch Unit-Tests abgedeckt sind."
  - test: "/anime/2/group/26/releases im Browser öffnen (der ursprüngliche Live-Crash-Fall aus dem Todo) und die Browser-Konsole auf Fehler prüfen."
    expected: "Seite rendert ohne next/image E426/E231-Absturz; Gruppen-Logo im Header und in den 'Weitere Gruppen'-Chips laden (ggf. unoptimiert) statt die Seite mit 500 abzureißen."
    why_human: "Die Laufzeit-Reproduktion des ursprünglich gemeldeten Absturzes erfordert ein echtes Browser-Rendering gegen reale Medien-URL-Formen; ein Komponenten-Unit-Test (vorhanden, deckt exakt diese URL-Form ab) ersetzt die Live-Bestätigung nicht vollständig, da next/image-Validierungsfehler SSR-spezifisch auftreten können."
  - test: "Admin-UI (/admin/fansubs) Löschversuch einer Bestandsgruppe mit echten Abhängigkeiten (z. B. Releases) auslösen und die angezeigte 409-Fehlermeldung lesen."
    expected: "Die bestehende Fehler-Banner-UI zeigt die deutsche Meldung 'Diese Gruppe kann nicht entfernt werden: <N Kategorie(n)> hängen noch daran.' verständlich und vollständig an, kein stiller Fehlschlag, keine rohe 500-Antwort."
    why_human: "Backend-Antwort und Fehlermeldungstext sind code-verifiziert (409 + GermanReasonFragment, Weiterleitung über formatError/ApiError), aber die tatsächliche Lesbarkeit/Verständlichkeit im echten Admin-UI-Fluss ist eine UX-Qualitätsfrage, die laut CLAUDE.md explizite UX-Aufmerksamkeit verlangt."
---

# Phase 189: Bugfix-Bündel — Coop-Partner, Projektnotizen-Recht, Gruppen-Merge-Entfernung & Lösch-Sperre Verification Report

**Phase Goal:** Vier Bugfixes/Scope-Punkte: (1) Projektseite zeigt nur echte Coop-Partner
(gemeinsames Release) namentlich und klickbar im Kopfbereich, übrige Gruppen klickbar in „Mehr
entdecken"; (2) next/image-Absturz auf der Release-Liste durch fehlende Logo-URL in der
zentralen Allowlist beheben; (3) Projektnotizen-Schreibrecht auf die projektbezogene Action
(`anime_fansub_project.notes.write` + `CanForAnimeProject`) umstellen, bestätigte Projektrollen
zählen künftig mit; (4) Fansub-Gruppen-Merge-Funktion vollständig entfernen (ersetzt durch
Episode-Umhängen + Löschen) und dafür eine Lösch-Sperre für Fansub-Gruppen mit echten
Abhängigkeiten einführen.

**Verified:** 2026-10-20T15:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (D-ID) | Status | Evidence |
|---|---|---|---|
| 1 | `coop_groups` only on Cursor endpoint, real self-join (D-04) | ✓ VERIFIED | `group_repository_coop.go:23-65` self-joins `release_version_groups` on shared `release_version_id`; wired at `group_repository_cursor.go:291,301`; offset endpoint `GetGroupReleases` (`group_repository.go:156`) untouched (no `CoopGroups`/`coop_groups` references found there) |
| 2 | `coop_groups` excludes non-overlapping-release groups (D-04) | ✓ VERIFIED | Same self-join requires `rvg_other.release_version_id = rvg_self.release_version_id`; real-Postgres test `group_repository_coop_test.go` asserts this (per plan interface + passing suite) |
| 3 | Offset endpoint `GetGroupReleases` untouched (D-04) | ✓ VERIFIED | `grep` for `coop_groups\|CoopGroups` in `group_repository.go` returns nothing |
| 4 | Header "Coop-Partner" metric: hide/1/2/3+ formatting, name-links only, no logos (D-05) | ✓ VERIFIED | `ProjectStats.tsx:21-73` — `coopGroups.length > 0` gate hides the metric at 0; single/`A · B`/`A · B +N` branches present; `partnerLink` uses `buildTechnicalFansubProjectPath`; zero `AvatarStack` import |
| 5 | "Weitere Gruppen zu diesem Anime" moved to "Mehr entdecken", no chip reuse (D-06) | ✓ VERIFIED | `BacklinksSection.tsx:27-35` renders plain `Link`s in the section's existing `styles.deepLink` style (no `ResponsiveImage`/chip markup); `discoverableOtherGroups` (`projectPageData.ts:115-122`) excludes self + coop groups |
| 6 | next/image crash fixed via central ResponsiveImage allowlist, no local bypass (D-07) | ✓ VERIFIED | `releases/page.tsx:329`, `OtherGroupsChips.tsx:38`, `ReleaseEpisodeCard.tsx:42,77` all use `ResponsiveImage`; `isConfiguredForImageOptimization` (pre-existing `publicImagePatterns.mjs`-backed helper) falls back to `unoptimized` instead of throwing; regression test `OtherGroupsChips.test.tsx` reproduces the exact reported URL shape (`/api/v1/media/files/logo_...png`) and asserts `data-unoptimized=true` |
| 7 | Confirmed project role grants Projektnotizen write without group role (D-08) | ✓ VERIFIED | `requireAnimeProjectNoteWriteAccess` (`admin_content_anime_project_notes.go:73-106`) calls `CanForAnimeProject(..., ActionAnimeFansubProjectNotesWrite, animeID, fansubID)`, which (per Phase 188's `permissions_anime_project.go`) includes confirmed `anime_contribution_roles` |
| 8 | Pure group-wide founder/co_leader loses access, accepted (D-09) | ✓ VERIFIED | Same guard replaces the old group-wide `requireFansubGroupNoteWriteAccess`; `role_capabilities` not extended (see #9) |
| 9 | No `role_capabilities` migration for co_leader/founder (D-10) | ✓ VERIFIED | `git log` shows no new migration touching `anime_fansub_project.notes.write`/`role_capabilities` for this phase |
| 10 | `can_edit_notes` unchanged (D-08) | ✓ VERIFIED | `app_auth_capabilities.go:114` — `canEditNotes` still computed via `CanForFansubGroup(..., ActionFansubGroupNotesWrite, ...)`, byte-identical to pre-phase logic; `CanEditProjectNotes` is a separate new field |
| 11 | No backend merge route/handler/repository remains (D-11) | ✓ VERIFIED | `fansub_merge.go`, `fansub_repository_merge_core.go`, `fansub_repository_merge_duplicates.go` all deleted; `admin_routes.go` has zero "merge" matches |
| 12 | No permission-catalog migration added for merge removal (D-11) | ✓ VERIFIED | Plan rationale confirmed (merge was gated by `h.requireAdmin(c)` only); no migration found touching a merge action |
| 13 | No frontend merge route/component/API-client remains (D-11) | ✓ VERIFIED | `frontend/src/app/admin/fansubs/merge/` directory does not exist; no `MergeFansubs`/`mergeFansubs` symbol anywhere in `frontend/src` |
| 14 | No dead merge links in admin UI (D-11) | ✓ VERIFIED | `grep -i merge` on `frontend/src/app/admin/fansubs/page.tsx` returns only an unrelated `mergeCssModules` import |
| 15 | Full-repo grep for merge references returns zero hits outside `.planning/` (D-11) | ✓ VERIFIED | `grep -rniE "fansub_merge|MergeFansubs|mergeFansubs|fansub-merge|MergeGroups"` across `backend/frontend/shared/database` returns no matches |
| 16 | Todo `2026-10-19-fansub-gruppen-merge-ungeschuetzter-pfad.md` moved to completed with "erledigt durch Entfernung" status (D-11) | ✓ VERIFIED | File present at `.planning/todos/completed/...md` with `status: erledigt durch Entfernung (Phase 189)` |
| 17 | DeleteGroup/DeleteFansub refuses delete with any real dependent, 409 + German message (D-12) | ✓ VERIFIED | `countFansubGroupDependents` counts 19 categories (18 original + `fansub_group_links` added post-review); `DeleteGroup` returns `*FansubGroupHasDependentsError` when `HasAny()`; `DeleteFansub` translates to 409 `fansub_group_has_dependents` with `GermanReasonFragment()` |
| 18 | Lock applies identically to platform admins, no bypass branch (D-12) | ✓ VERIFIED | `fansub_groups.go:409-416` comment + code confirm no admin-bypass branch; `TestDeleteFansubReturnsConflictWhenDependentsExist` authenticates as a seeded `platform_admin` and still asserts 409 |
| 19 | Zero-dependent group still deletes successfully (D-12) | ✓ VERIFIED | `TestDeleteGroupSucceedsWhenEmpty` / `TestDeleteFansubSucceedsWhenEmpty` pass |
| 20 | Pure link tables excluded from dependents count (D-12) | ✓ VERIFIED | `TestCountFansubGroupDependentsIgnoresExcludedTables` asserts `fansub_group_aliases`/`anime_fansub_groups` rows don't trip `HasAny()` |
| 21 | `fansub.ts` split to ≤450 lines before content change (189-06) | ✓ VERIFIED | `fansub.ts` is 369 lines, `fansub-capabilities.ts` 36 lines, both well under 450 |
| 22 | `FansubEditClient.canEditProjectNotes` reflects new capability, not notes-tab visibility (D-08) | ✓ VERIFIED | `FansubEditClient.tsx:153-154` — `canEditProjectNotes = isPlatformAdmin || Boolean(capabilities?.can_edit_project_notes)` |
| 23 | `AnimeProjectNoteWorkspace` fetches own per-project capability (D-08) | ✓ VERIFIED | `AnimeProjectNoteWorkspace.tsx:98` calls `getFansubGroupCapabilities(fansubId, undefined, { animeId })`, mirrors `AnimeProjectTimelineSection.tsx` |
| 24 | `direct-access-gate.test.tsx` still covers create-gating, not deleted (189-07) | ✓ VERIFIED | File still exists; frontend test suite run (49 files, 389 tests) passes including this file |
| 25 | Review-fix CR-01 (fansub_group_links omission) actually fixed | ✓ VERIFIED | Commit `de1232818`: `Links int32` field, query, `HasAny()`, `GermanReasonFragment`, fixture, and a dedicated `TestCountFansubGroupDependentsDetectsLinksOnly` regression test all added |
| 26 | Review-fix CR-02 (TOCTOU pre-check outside tx) actually fixed | ✓ VERIFIED | Commit `8648d6f73`: `countFansubGroupDependents` now called with `tx` after `BeginTx`, mirroring `ensureRemovedReleaseVersionGroupsHaveNoDependents` precedent |

**Score:** 26/26 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/internal/repository/group_repository_coop.go` | `getCoopGroups` self-join | ✓ VERIFIED | Exists, wired into cursor endpoint |
| `backend/internal/repository/group_repository_coop_test.go` | Real-Postgres proof | ✓ VERIFIED | Present, part of green backend suite |
| `shared/contracts/openapi.yaml` (`coop_groups`) | Documents new field | ✓ VERIFIED | `coop_groups:` found at line 17563 on `GroupReleaseListCursorResponse`/cursor page schema |
| `frontend/src/lib/fansubProjectRoutes.ts` (`buildTechnicalFansubProjectPath`) | URL builder | ✓ VERIFIED | Used by `ProjectStats.tsx` and `BacklinksSection.tsx` |
| `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` (`discoverableOtherGroups`) | Pure exclusion function | ✓ VERIFIED | Implemented, wired into `discoverableGroups` |
| `frontend/.../sections/ProjectStats.tsx` | 1/2/3+ rendering, no AvatarStack | ✓ VERIFIED | Confirmed, see truth #4 |
| `frontend/.../sections/BacklinksSection.tsx` | Extra discoverable-group links | ✓ VERIFIED | Confirmed, see truth #5 |
| `frontend/.../releases/page.tsx` | ResponsiveImage for logo, ≤450 lines | ✓ VERIFIED | 417 lines, `ResponsiveImage` import present |
| `frontend/.../releases/OtherGroupsChips.tsx` | Extracted chip w/ ResponsiveImage | ✓ VERIFIED | 56 lines, uses `ResponsiveImage` |
| `backend/internal/handlers/admin_content_anime_project_notes.go` | `requireAnimeProjectNoteWriteAccess` | ✓ VERIFIED | Present, both Upsert/Delete call sites updated |
| `backend/internal/handlers/app_auth_capabilities.go` | `CanEditProjectNotes` field | ✓ VERIFIED | Field + anime_id-aware computation present |
| `backend/cmd/server/admin_routes.go` (merge routes removed) | No merge route | ✓ VERIFIED | No "merge" matches |
| `shared/contracts/openapi.yaml` (merge schemas removed) | No dangling refs | ✓ VERIFIED | No "merge" (fansub-group sense) matches anywhere in file |
| `frontend/src/app/admin/fansubs/page.tsx` | Merge entry points removed | ✓ VERIFIED | No merge links present |
| `backend/internal/repository/release_version_group_guard.go` | `FansubGroupDependencySummary` (19 categories incl. Links) | ✓ VERIFIED | Confirmed by direct read, 380 lines |
| `backend/internal/repository/fansub_repository_groups_delete.go` | `DeleteGroup` w/ in-tx pre-check | ✓ VERIFIED | 62 lines, confirmed post CR-02 fix |
| `backend/internal/handlers/fansub_groups.go` | `DeleteFansub` 409 translation, `errors.As`-first | ✓ VERIFIED | 431 lines, confirmed post WR-03 fix |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `group_repository_cursor.go` (`GetGroupReleasesCursor`) | `group_repository_coop.go` (`getCoopGroups`) | direct sibling call | ✓ WIRED | `r.getCoopGroups(ctx, animeID, groupID)` at line 291 |
| `UpsertAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote` | `CanForAnimeProject` | `requireAnimeProjectNoteWriteAccess` | ✓ WIRED | Both handlers call the guard at lines 144/220 |
| `GetFansubGroupCapabilities` | frontend (`?anime_id=`) | `can_edit_project_notes` JSON field | ✓ WIRED | Field computed conditionally on `parsedAnimeID`, consumed by `AnimeProjectNoteWorkspace`/`FansubEditClient` |
| `fansub_groups.go` (`DeleteFansub`) | `fansub_repository_groups_delete.go` (`DeleteGroup`) | `errors.As(err, &depErr)` | ✓ WIRED | Confirmed post WR-03 fix (no `errors.Is` + discarded `errors.As` anymore) |
| `ProjectStats.tsx`/`BacklinksSection.tsx` | `fansubProjectRoutes.ts` | `buildTechnicalFansubProjectPath` | ✓ WIRED | Both import and call it for every rendered link |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Backend full test suite green at HEAD | `bash scripts/test-backend.sh` | `go test exit code: 0`, `GATE: GREEN (0)`, 27 throwaway DBs created+dropped | ✓ PASS |
| Frontend typecheck clean | `npx tsc --noEmit` (frontend) | no output / exit 0 | ✓ PASS |
| Frontend tests for touched project-page/releases area | `npx vitest run` on `anime/[id]/group/[groupId]` + `fansubProjectRoutes.test.ts` + `src/types` | 24 files / 170 tests passed | ✓ PASS |
| Frontend tests for admin/fansubs area (merge removal, capability wiring) | `npx vitest run "src/app/admin/fansubs"` | 49 files / 389 tests passed | ✓ PASS |
| Dangling merge-reference grep | `grep -rniE "fansub_merge\|MergeFansubs\|mergeFansubs\|fansub-merge\|MergeGroups" backend frontend shared database` | no output | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| D-04 | 189-01 | `coop_groups` on Cursor endpoint only | ✓ SATISFIED | Truths #1-3 |
| D-05 | 189-02 | Header metric: names only, hide/1/2/3+ | ✓ SATISFIED | Truth #4 |
| D-06 | 189-02 | "Mehr entdecken", no chip reuse | ✓ SATISFIED | Truth #5 |
| D-07 | 189-03 | next/image crash via central allowlist | ✓ SATISFIED | Truth #6; human UAT recommended (see below) |
| D-08 | 189-04, 189-06 | Project-scoped Projektnotizen write | ✓ SATISFIED | Truths #7, #10, #22, #23 |
| D-09 | 189-04 | Loss case accepted | ✓ SATISFIED | Truth #8 |
| D-10 | 189-04 | No role_capabilities extension | ✓ SATISFIED | Truth #9 |
| D-11 | 189-05, 189-07 | Full merge removal | ✓ SATISFIED | Truths #11-16 |
| D-12 | 189-08 | Delete-lock, no admin bypass | ✓ SATISFIED | Truths #17-20, #25-26 |

No orphaned D-IDs: all of D-04 through D-12 appear in at least one plan's `requirements:` frontmatter. D-01/D-02/D-03 are first-round scope/process decisions explicitly superseded by the second round per `189-CONTEXT.md` and carry no independent code obligation.

### Anti-Patterns Found

None found in the files touched by this phase. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers, no empty handlers, no hardcoded-empty stub returns in any of the 17 artifacts inspected above. All production files touched by this phase are ≤450 lines (largest: `fansub_groups.go` at 431, `group_repository.go` untouched at 454 — pre-existing, not content-modified by this phase so the split rule does not apply).

### Code Review Fixes (189-REVIEW.md) — Verified Landed

| Finding | Commit | Verified |
|---|---|---|
| CR-01 (fansub_group_links omitted from delete-lock) | `de1232818` | ✓ `Links` field/query/HasAny/fragment added, fixture extended, dedicated regression test `TestCountFansubGroupDependentsDetectsLinksOnly` added and passing |
| CR-02 (dependents check outside transaction, TOCTOU) | `8648d6f73` | ✓ Check moved inside `tx`, matches sibling guard's precedent exactly |
| WR-01 (409 undocumented in contracts) | `0a1f20889` | ✓ `fansubs.yaml` + `openapi.yaml` both document the 409 `fansub_group_has_dependents` response |
| WR-02 (`ReleaseEpisodeCard.tsx` still raw next/image) | `ebdbb5d03` | ✓ Both `next/image` usages replaced with `ResponsiveImage` |
| WR-03 (`errors.As` return value discarded) | `f3a3db572` | ✓ `errors.Is` + discard pattern replaced with `if errors.As(err, &depErr)` |
| Self-caught (contract gap `can_edit_project_notes` + Phase136 test path regression from the 189-06 `fansub.ts` split) | `32c690a63` | ✓ `admin-capabilities.yaml`/`openapi.yaml` now list `can_edit_project_notes`; `phase136_contract_parity_test.go` now reads `fansub-capabilities.ts` instead of the stale `fansub.ts` path |

All 5 review findings plus the one additional self-caught regression are fixed with correct, targeted diffs — not cosmetic or partial fixes. The backend full suite (including `TestPhase136ContractParity`) passes at current HEAD (re-run live during this verification, exit code 0).

### Human Verification Required

See frontmatter `human_verification:` for the 3 structured items. In summary:

1. **Coop-Partner header + "Mehr entdecken" visual layout** — data logic and link targets are unit-tested, but the actual visual placement/stimmigkeit with the existing design (D-05/D-06's explicit "Option a — stimmiges Aussehen hat Vorrang" instruction) benefits from a live look.
2. **next/image crash fix, live browser check on the originally-reported URL** (`/anime/2/group/26/releases`) — a targeted regression test reproduces the exact legacy URL shape and asserts the `unoptimized` fallback fires, but full confirmation of no SSR crash is best done live, since this was reported as a live production crash.
3. **409 dependents message readability in the real Admin-UI delete flow** — backend message generation and frontend error-surfacing wiring (`ApiError` → `formatError` → existing error banner) are code-verified, but exact wording/comprehensibility in situ is a UX-quality check per CLAUDE.md's explicit UX-attention requirement.

These are soft human-verification requests reflecting genuinely strong automated evidence (all 26 must-have truths pass, full backend suite green, full relevant frontend suites green, tsc clean, all 5 code-review findings + 1 self-caught regression demonstrably fixed) — not signs of a broken implementation.

### Gaps Summary

No gaps found. All 9 decision IDs (D-04 through D-12) are implemented, wired, and covered by passing automated tests (real-Postgres backend tests + Vitest frontend tests + tsc). The merge-feature removal is grep-confirmed dangling-reference-free across backend, frontend, and shared contracts. The delete-lock explicitly blocks platform admins with a real httptest-executed regression test (not just a code comment). All 5 code-review findings (2 critical, 3 warning) plus one additional self-caught contract/test-path regression were fixed with correct, verifiable diffs, and the full backend test suite was independently re-run at current HEAD during this verification and confirmed GREEN (exit code 0), including the previously-regressed `TestPhase136ContractParity`. The only open items are soft UAT-style human checks for visual/runtime confirmation of behavior that is already strongly evidenced in code and tests.

---

_Verified: 2026-10-20T15:45:00Z_
_Verifier: Claude (gsd-verifier)_
