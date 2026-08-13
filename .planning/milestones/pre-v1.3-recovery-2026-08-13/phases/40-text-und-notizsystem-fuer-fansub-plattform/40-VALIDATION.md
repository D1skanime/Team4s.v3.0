---
phase: 40
slug: text-und-notizsystem-fuer-fansub-plattform
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-12
---

# Phase 40 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` 3.2.4 + React Testing Library 16.3.0 + Go `testing` |
| **Config file** | [frontend/vitest.config.ts](/C:/Users/admin/Documents/Team4s/frontend/vitest.config.ts), [frontend/package.json](/C:/Users/admin/Documents/Team4s/frontend/package.json), [backend/go.mod](/C:/Users/admin/Documents/Team4s/backend/go.mod) |
| **Quick run command** | `cd frontend && npx vitest run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx" "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx" "src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx" && cd ../backend && go test ./internal/services -run TestMarkdownService -count=1` |
| **Full suite command** | `cd frontend && npx vitest run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx" "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx" "src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx" && npx eslint "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx" "src/app/admin/fansubs/[id]/edit/NotesTab.tsx" "src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx" "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx" "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx" "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx" "src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx" "src/types/fansubNotes.ts" --max-warnings 0 && cd ../backend && go test ./internal/services -run TestMarkdownService -count=1 && go test ./internal/repository ./internal/handlers -run "FansubNotesRepository|AdminContentFansubNotes|ReleaseVersionNotes|ContributorGuardSourceInvariants|AnimeProjectNotes|ProjectNoteSourceInvariants" -count=1 && go build ./internal/repository ./internal/handlers && cd .. && git diff --check` |
| **Estimated runtime** | ~90 seconds without global typecheck |

---

## Sampling Rate

- **After every task commit:** Run the phase-40 quick run command.
- **After every plan wave:** Run the phase-40 full suite command.
- **Before `$gsd-verify-work`:** Full suite must be green, except documented out-of-scope repository failures.
- **Max feedback latency:** 90 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | 4 Note-Tabellen + Constraints + Soft-Delete vorhanden | static | `rg --files database/migrations | rg "0061_fansub_group_notes|0062_member_group_stories|0063_anime_fansub_project_notes|0064_release_version_notes"` | ✅ existing | ✅ green |
| 40-02-01 | 02 | 1 | 11 Kernrollen + Label/Description-Seed | static | `rg -n "translator|typesetter|quality_checker|project_lead|label|description" database/migrations/0065_seed_contributor_roles_kernrollen.up.sql` | ✅ existing | ✅ green |
| 40-03-01 | 03 | 1 | Markdown rendert sicher und entfernt Script-Tags | unit | `cd backend && go test ./internal/services -run TestMarkdownService -count=1` | ✅ [markdown_service_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/markdown_service_test.go) | ✅ green |
| 40-08-01 | 08 | 3 | Fansub-Editor lädt Gruppennotizen und Stories, erstellt neue Gruppennotiz, validiert Story ohne Member-ID | unit | `cd frontend && npx vitest run "src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx"` | ✅ [NotesTab.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx) | ✅ green |
| 40-09-01 | 09 | 3 | Anime-Projekttexte nutzen übergebene Anime-Props, lazy-loaden Form und speichern Upsert-Payload | unit | `cd frontend && npx vitest run "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx"` | ✅ [AnimeProjectNotesSection.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx) | ✅ green |
| 40-09-02 | 09 | 3 | Anime-Projekttexte halten React-Hook-Regeln ein | lint | `cd frontend && npx eslint "src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx" --max-warnings 0` | ✅ existing | ✅ green |
| 40-10-01 | 10 | 3 | Release-Version-Notizen zeigen Rollenhilfen, Zeichenwarnung und Empty-State | unit | `cd frontend && npx vitest run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx"` | ✅ [ReleaseVersionNotesTab.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx) | ✅ green |
| 40-10-02 | 10 | 3 | Bulk-Save überspringt leere neue Felder und zeigt 409 verständlich an | unit | `cd frontend && npx vitest run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx"` | ✅ [ReleaseVersionNotesTab.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx) | ✅ green |
| 40-11-01 | 11 | 4 | Anime-Projektnotizen hängen nur an echter `anime_fansub_groups`-Zuordnung | unit | `cd backend && go test ./internal/repository ./internal/handlers -run "AnimeProjectNotes|ProjectNoteSourceInvariants" -count=1` | ✅ existing | ✅ green |
| 40-12-01 | 12 | 4 | Release-Version-Notizen akzeptieren nur echte Member/Rollen der Release-Version | unit | `cd backend && go test ./internal/repository ./internal/handlers -run "ReleaseVersionNotes|ContributorGuardSourceInvariants" -count=1` | ✅ existing | ✅ green |
| 40-13-01 | 13 | 5 | Gruppennotiz- und Story-Mutationen sind auf `fansub_group_id` gescoped | unit | `cd backend && go test ./internal/repository ./internal/handlers -run "FansubNotesRepository|AdminContentFansubNotes" -count=1` | ✅ existing | ✅ green |
| 40-13-02 | 13 | 5 | Bestehende Mitgliedergeschichten senden kein `memberId`/`roleId`-Update mehr | unit | `cd frontend && npx vitest run "src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx"` | ✅ [NotesTab.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx) | ✅ green |
| 40-13-03 | 13 | 5 | Story-Edit-Vertrag bleibt typ- und lint-konsistent | lint | `cd frontend && npx eslint "src/app/admin/fansubs/[id]/edit/NotesTab.tsx" "src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx" "src/types/fansubNotes.ts" --max-warnings 0` | ✅ existing | ✅ green |
| 40-13-04 | 13 | 5 | Slice baut im Backend ohne Handler-/Repository-Drift | build | `cd backend && go build ./internal/repository ./internal/handlers` | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure now covers the phase-40 validation gaps.

- [x] [frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx) - Bulk-Save, Rollenhilfen, Empty-State, Konfliktmeldung, Zeichenwarnung
- [x] [frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx) - Prop-basierter Anime-Kontext, Upsert, Empty-State
- [x] [frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx) - Parallel-Loads, Gruppennotiz-Create, Story-Validation, Story-Update ohne `memberId`/`roleId`
- [x] [backend/internal/services/markdown_service_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/markdown_service_test.go) - Markdown-Rendering, Sanitizing, Empty-Input
- [x] `@testing-library/react`, `@testing-library/dom`, `jsdom` in [frontend/package.json](/C:/Users/admin/Documents/Team4s/frontend/package.json) - Frontend-Unit-Tests lokal lauffähig

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gruppennotiz im Fansub-Editor real anlegen, bearbeiten, löschen | `fansub_group_notes` CRUD live | Reale DB-Verbindung, Auth-Flow und Persistenzkette nötig | `/admin/fansubs/:id/edit` -> Tab `Notizen` -> Gruppennotiz erstellen, speichern, erneut öffnen, bearbeiten, löschen |
| Anime-Projekttext live über Accordion laden und erneut öffnen | `anime_fansub_project_notes` live persistence | Browser-Accordion, Live-API und DB-Upsert müssen zusammen geprüft werden | `/admin/fansubs/:id/edit` -> Tab `Anime-Projekte` -> Anime aufklappen -> Projekttext speichern -> erneut aufklappen |
| Release-Version-Notizen mit echten `release_member_roles` bulk speichern | `release_version_notes` live contributor flow | Echte Release-/Member-/Role-Daten und Auth nötig | `/admin/episode-versions/:versionId/edit` -> Tab `Notizen / Beiträge` -> mehrere Felder ausfüllen -> `Alle Notizen speichern` |
| Gespeichertes `body_html` im Browser/API gegen Sanitizing prüfen | public-safe markdown output | Live-Persistenz und Response-/DB-Inspektion nötig | Notiz mit `**bold**` und `<script>alert(1)</script>` speichern, danach API-Response oder DB prüfen: `<strong>` vorhanden, `<script>` entfernt |

---

## Known Out-Of-Scope Verification Gap

- `cd frontend && npx tsc --noEmit` schlägt aktuell außerhalb von Phase 40 fehl, weil in [RichTextEditor.tsx](/C:/Users/admin/Documents/Team4s/frontend/src/components/editor/RichTextEditor.tsx:3) und [ColorTokenExtension.ts](/C:/Users/admin/Documents/Team4s/frontend/src/components/editor/ColorTokenExtension.ts:1) mehrere `@tiptap/*`-Module fehlen.
- Diese TypeScript-Fehler betreffen den allgemeinen Editor-Stack und nicht die Phase-40-Notizverträge; sie blockieren daher die Phase-40-Slice-Validierung nicht, bleiben aber als Repo-Restproblem sichtbar.

---

## Validation Sign-Off

- [x] All task-critical phase-40 behaviors have automated verification or explicit manual-only live verification.
- [x] Sampling continuity: no 3 consecutive phase-40 tasks without an automated check.
- [x] Wave 0 gaps were filled for the missing Phase-40 UI and markdown coverage.
- [x] Wave 4 and 5 gap-closure tasks have targeted automated coverage.
- [x] No watch-mode flags in the validation commands.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** approved 2026-05-12

## 40-13 Vertragsbereinigung

- `member_group_stories.member_id` und `role_id` sind im Edit-Modus jetzt bewusst nicht mehr als veränderbarer Update-Vertrag exposed.
- `role_id` bleibt beim Anlegen optional; das Entfernen einer bestehenden Rolle wird im UI nicht mehr irreführend angeboten.
- Update- und Delete-Pfade für `fansub_group_notes` und `member_group_stories` sind zusätzlich auf `fansub_group_id` gescoped.
