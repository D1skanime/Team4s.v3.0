---
created: 2026-09-01T22:37:50.035Z
title: no-restricted-syntax Legacy-Datei-Migration
area: ui
files:
  - frontend/eslint.config.mjs
  - frontend/src/app/admin/anime
  - frontend/src/app/admin/episode-versions
  - frontend/src/app/admin/fansubs
  - frontend/src/app/anime
  - frontend/src/app/archiv/page.tsx
  - frontend/src/app/me/profile/components
  - frontend/src/components/admin/MediaUploadCore.tsx
  - frontend/src/components/comments/CommentForm.tsx
  - frontend/src/components/editor/StoryImageToolbarButton.tsx
  - frontend/src/components/media/crop/Team4sCropper.tsx
---

## Problem

Phase 143 / Plan 143-12 (Kriterium 6) sollte `no-restricted-syntax` in
`frontend/eslint.config.mjs` reihenweit von `warn` auf `error` anheben, gestuetzt
auf 143-VALIDATION.md's Annahme von "~17 Altfaellen ausserhalb components/ui".
Diese Annahme war falsch: eine echte Repo-weite Messung
(`docker compose exec team4sv30-frontend npx eslint . --rule
'{"no-restricted-syntax":"error"}' --quiet`, ausgefuehrt 2026-09-01) fand
**264 einzelne Verstoesse in 67 Dateien** (60 Produktionsdateien + 7
Testdateien), die weiterhin native `<input>`/`<select>`/`<textarea>` statt der
globalen `@/components/ui`-Primitives verwenden (`src/components/ui/**` selbst
ist per eigenem Override ausgenommen — die Primitive-Definitionen kapseln die
nativen Elemente absichtlich).

Statt die naive Reihenweit-Anhebung zurueckzurollen (was den Rueckschritt
zurueck auf 'warn' repo-weit bedeutet haette), wurde per Nutzerentscheidung
(Checkpoint, 2026-09-01) Option A — "Scoped enforcement als Ratchet" —
umgesetzt: die Basis-Severity ist jetzt `error`; eine eingefrorene, nur
schrumpfende `LEGACY_NO_RESTRICTED_SYNTAX_FILES`-Liste in
`frontend/eslint.config.mjs` haelt exakt diese 67 zum Messzeitpunkt
gemessenen Dateien auf `warn`. Die Liste ist eine explizite Dateiliste, kein
Directory-Glob — ein Glob wuerde kuenftig neu angelegte Dateien im selben
Ordner stillschweigend mit-exemptieren und den Ratchet aushebeln.

Vollstaendige Dateiliste (Stand 2026-09-01, siehe
`frontend/eslint.config.mjs`'s `LEGACY_NO_RESTRICTED_SYNTAX_FILES`-Konstante
fuer die kanonische, aktuell gueltige Version — diese Liste hier ist nur die
Momentaufnahme zum Zeitpunkt der Backlog-Erstellung und kann inzwischen
kuerzer sein):

Produktionsdateien (60):
- `src/app/admin/anime/[id]/episodes/[episodeId]/edit/page.tsx`
- `src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx`
- `src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx`
- `src/app/admin/anime/[id]/episodes/import/page.tsx`
- `src/app/admin/anime/[id]/episodes/page.tsx`
- `src/app/admin/anime/components/AnimeBrowser/AnimeBrowserFilters.tsx`
- `src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx`
- `src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx`
- `src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.tsx`
- `src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx`
- `src/app/admin/anime/components/AnimeEditPage/AnimeEditSharedSections.tsx`
- `src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
- `src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx`
- `src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx`
- `src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx`
- `src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx`
- `src/app/admin/anime/components/AnimePatchForm/AnimeBasicFields.tsx`
- `src/app/admin/anime/components/AnimePatchForm/AnimeCoverField.tsx`
- `src/app/admin/anime/components/AnimePatchForm/AnimeMetaFields.tsx`
- `src/app/admin/anime/components/AnimePatchForm/AnimePatchForm.tsx`
- `src/app/admin/anime/components/CreatePage/AnimeCreateCoverField.tsx`
- `src/app/admin/anime/components/CreatePage/AnimeCreateGenreField.tsx`
- `src/app/admin/anime/components/CreatePage/AnimeCreateTagField.tsx`
- `src/app/admin/anime/components/EpisodeManager/EpisodeCreateForm.tsx`
- `src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx`
- `src/app/admin/anime/components/EpisodeManager/EpisodeFilters.tsx`
- `src/app/admin/anime/components/EpisodeManager/EpisodeInlineEdit.tsx`
- `src/app/admin/anime/components/EpisodeManager/EpisodeRow.tsx`
- `src/app/admin/anime/components/JellyfinSync/JellyfinSyncPanel.tsx`
- `src/app/admin/anime/components/ManualCreate/ManualCreateAssetUploadPanel.tsx`
- `src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx`
- `src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx`
- `src/app/admin/anime/create/CreateAssetSearchDialog.tsx`
- `src/app/admin/anime/create/CreateJellyfinCard.tsx`
- `src/app/admin/anime/create/page.tsx`
- `src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- `src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx`
- `src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx`
- `src/app/admin/episodes/page.tsx`
- `src/app/admin/fansubs/[id]/edit/AnimeProjectNoteForm.tsx`
- `src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx`
- `src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx`
- `src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx`
- `src/app/admin/fansubs/[id]/edit/ReleaseThemeDrawerSection.tsx`
- `src/app/admin/fansubs/create/page.tsx`
- `src/app/admin/fansubs/merge/page.tsx`
- `src/app/admin/fansubs/page.tsx`
- `src/app/anime/[id]/group/[groupId]/releases/page.tsx`
- `src/app/archiv/page.tsx`
- `src/app/me/profile/components/AchievementBadgesCard.tsx`
- `src/app/me/profile/components/ClaimStatusCard.tsx`
- `src/app/me/profile/components/MemberAvatarCard.tsx`
- `src/app/me/profile/components/ProfileBackgroundCard.tsx`
- `src/app/me/profile/components/ProfileBasicsForm.tsx`
- `src/app/me/profile/components/VisibilityCard.tsx`
- `src/components/admin/MediaUploadCore.tsx`
- `src/components/comments/CommentForm.tsx`
- `src/components/editor/StoryImageToolbarButton.tsx`
- `src/components/media/crop/Team4sCropper.tsx`

Testdateien (7):
- `src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx`
- `src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx`
- `src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx`
- `src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.test.tsx`
- `src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx`
- `src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx`
- `src/app/me/profile/page.test.tsx`

Der `src/app/admin/anime/**`-Baum traegt allein ~35 Dateien und ist damit der
groesste Einzelblock.

## Solution

Migriere die verbleibenden Dateien schrittweise auf die globalen
`@/components/ui`-Primitives (`Input`, `Select`, `Textarea`, plus `FormField`
wo ein natives `<label>` dupliziert wird), analog zum bereits abgeschlossenen
Retrofit von `ReleaseVersionMetadataFields.tsx` und
`AnimeProjectTimelineSection.tsx` (Plan 143-12, Tasks 1-2). Empfohlene
Reihenfolge: groesste Bloecke zuerst (`src/app/admin/anime/**`, dann
`src/app/admin/fansubs/**`, dann Einzeldateien). Nach jeder migrierten Datei
wird ihr Eintrag aus `LEGACY_NO_RESTRICTED_SYNTAX_FILES` in
`frontend/eslint.config.mjs` geloescht (nie hinzugefuegt) — sobald die Liste
leer ist, kann der gesamte Ratchet-Override-Block entfernt werden und
`no-restricted-syntax` steht dann unqualifiziert repo-weit auf `error`.

Die 7 Testdateien brauchen eine gesonderte Entscheidung: entweder werden ihre
literalen natives JSX-Fixtures ebenfalls auf die Primitives umgestellt, oder
es wird bewusst ein dediziertes Test-Override ergaenzt (z. B.
`files: ['**/*.test.{ts,tsx}']` mit eigener Begruendung) statt sie in der
Produktions-Ratchet-Liste mitzufuehren — diese Entscheidung ist bislang nicht
getroffen und sollte Teil der Umsetzung sein.
</content>
