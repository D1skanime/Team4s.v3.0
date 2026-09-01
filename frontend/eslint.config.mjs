import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

// Guard: user-facing UI muss die globalen Primitives aus @/components/ui nutzen
// (Button, Select, FormField, Modal, Input, Textarea, Tabs, Drawer ...).
// Handgebaute native <select>/<input>/<textarea> in .tsx sind verpoent.
// Basis-Severity ist 'error' (Phase 143 / Kriterium 6, 2026-09-01). Die
// LEGACY_NO_RESTRICTED_SYNTAX_FILES-Liste unten haelt die zu diesem Zeitpunkt
// gemessenen Altfaelle auf 'warn' (Ratchet) — siehe deren Kommentar.
const uiPrimitiveGuardOptions = [
  {
    selector: "JSXOpeningElement[name.name='select']",
    message: 'Natives <select> verboten — nutze <Select> aus @/components/ui (Referenz: /dev/ui-system).',
  },
  {
    selector: "JSXOpeningElement[name.name='input']",
    message: 'Natives <input> verboten — nutze <Input> aus @/components/ui (Referenz: /dev/ui-system).',
  },
  {
    selector: "JSXOpeningElement[name.name='textarea']",
    message: 'Natives <textarea> verboten — nutze <Textarea> aus @/components/ui (Referenz: /dev/ui-system).',
  },
]

const uiPrimitiveGuard = ['error', ...uiPrimitiveGuardOptions]
const uiPrimitiveGuardLegacyWarn = ['warn', ...uiPrimitiveGuardOptions]

// RATCHET — diese Liste darf nur SCHRUMPFEN, nie wachsen.
// Gemessen am 2026-09-01 (Phase 143, Plan 143-12, Task 3): 264 Verstoesse in
// genau diesen 67 Dateien (60 Produktions- + 7 Testdateien), als
// `docker compose exec team4sv30-frontend npx eslint . --rule
// '{"no-restricted-syntax":"error"}' --quiet` gegen den vollen Repo-Baum
// gelaufen ist (src/components/ui/** ausgenommen, siehe dessen eigenes
// Override unten). Es ist eine FROZEN EXPLICIT FILE LIST, keine Glob-Regel:
// ein Directory-Glob wuerde auch morgen neu angelegte Dateien in denselben
// Ordnern stillschweigend mit-exemptieren und den Ratchet aushebeln — eine
// neue Datei traegt hier nie automatisch eine Ausnahme. Wird eine Datei auf
// die globalen Primitives umgestellt (retrofitted), wird ihr Eintrag
// GELOESCHT. Nichts wird hier je hinzugefuegt; ein genuiner Bedarf fuer eine
// Ergaenzung ist eine bewusste Entscheidung, die in einen Code-Review gehoert,
// nicht in eine stille Editierung. Vollstaendige Migration ist als Backlog-
// Item getrackt: .planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md
const LEGACY_NO_RESTRICTED_SYNTAX_FILES = [
  'src/app/admin/anime/\\[id\\]/episodes/\\[episodeId\\]/edit/page.tsx',
  'src/app/admin/anime/\\[id\\]/episodes/\\[episodeId\\]/versions/page.tsx',
  'src/app/admin/anime/\\[id\\]/episodes/import/EpisodeImportMappingRow.tsx',
  'src/app/admin/anime/\\[id\\]/episodes/import/page.tsx',
  'src/app/admin/anime/\\[id\\]/episodes/page.tsx',
  'src/app/admin/anime/components/AnimeBrowser/AnimeBrowserFilters.tsx',
  'src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx',
  'src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx',
  'src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.tsx',
  'src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx',
  'src/app/admin/anime/components/AnimeEditPage/AnimeEditSharedSections.tsx',
  'src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx',
  'src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx',
  'src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx',
  'src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx',
  'src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx',
  'src/app/admin/anime/components/AnimePatchForm/AnimeBasicFields.tsx',
  'src/app/admin/anime/components/AnimePatchForm/AnimeCoverField.tsx',
  'src/app/admin/anime/components/AnimePatchForm/AnimeMetaFields.tsx',
  'src/app/admin/anime/components/AnimePatchForm/AnimePatchForm.tsx',
  'src/app/admin/anime/components/CreatePage/AnimeCreateCoverField.tsx',
  'src/app/admin/anime/components/CreatePage/AnimeCreateGenreField.tsx',
  'src/app/admin/anime/components/CreatePage/AnimeCreateTagField.tsx',
  'src/app/admin/anime/components/EpisodeManager/EpisodeCreateForm.tsx',
  'src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx',
  'src/app/admin/anime/components/EpisodeManager/EpisodeFilters.tsx',
  'src/app/admin/anime/components/EpisodeManager/EpisodeInlineEdit.tsx',
  'src/app/admin/anime/components/EpisodeManager/EpisodeRow.tsx',
  'src/app/admin/anime/components/JellyfinSync/JellyfinSyncPanel.tsx',
  'src/app/admin/anime/components/ManualCreate/ManualCreateAssetUploadPanel.tsx',
  'src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx',
  'src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx',
  'src/app/admin/anime/create/CreateAssetSearchDialog.tsx',
  'src/app/admin/anime/create/CreateJellyfinCard.tsx',
  'src/app/admin/anime/create/page.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/EpisodeVersionEditorPage.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/ReleaseVersionMediaDetailPanel.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/ReleaseVersionMediaSection.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/ReleaseVersionNotesTab.test.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/SegmentEditPanel.tsx',
  'src/app/admin/episodes/page.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/AnimeProjectNoteForm.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/AnimeProjectNoteWorkspace.test.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/AnimeProjectNotesSection.test.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/FansubAppMemberEditorPanel.test.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/FansubOpEdSection.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/GroupHistRoleDialog.test.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/NotesTab.helpers.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/NotesTab.test.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/ReleaseThemeAssetsSection.tsx',
  'src/app/admin/fansubs/\\[id\\]/edit/ReleaseThemeDrawerSection.tsx',
  'src/app/admin/fansubs/create/page.tsx',
  'src/app/admin/fansubs/merge/page.tsx',
  'src/app/admin/fansubs/page.tsx',
  'src/app/anime/\\[id\\]/group/\\[groupId\\]/releases/page.tsx',
  'src/app/archiv/page.tsx',
  'src/app/me/profile/components/AchievementBadgesCard.tsx',
  'src/app/me/profile/components/ClaimStatusCard.tsx',
  'src/app/me/profile/components/MemberAvatarCard.tsx',
  'src/app/me/profile/components/ProfileBackgroundCard.tsx',
  'src/app/me/profile/components/ProfileBasicsForm.tsx',
  'src/app/me/profile/components/VisibilityCard.tsx',
  'src/app/me/profile/page.test.tsx',
  'src/components/admin/MediaUploadCore.tsx',
  'src/components/comments/CommentForm.tsx',
  'src/components/editor/StoryImageToolbarButton.tsx',
  'src/components/media/crop/Team4sCropper.tsx',
]

const config = [
  {
    ignores: ['tmp-live-full-flow*.js'],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // App Router project: no /pages directory.
      '@next/next/no-html-link-for-pages': 'off',
      // Globales UI erzwingen (siehe oben).
      'no-restricted-syntax': uiPrimitiveGuard,
    },
  },
  {
    // Die Primitive-Definitionen selbst kapseln die nativen Elemente — hier erlaubt.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Ratchet-Ausnahme fuer die eingefrorene Altfaelle-Liste, siehe deren
    // Definition/Kommentar oben (LEGACY_NO_RESTRICTED_SYNTAX_FILES).
    files: LEGACY_NO_RESTRICTED_SYNTAX_FILES,
    rules: {
      'no-restricted-syntax': uiPrimitiveGuardLegacyWarn,
    },
  },
]

export default config
