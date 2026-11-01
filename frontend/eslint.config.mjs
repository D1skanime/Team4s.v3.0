import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

// Guard: user-facing UI muss die globalen Primitives aus @/components/ui nutzen
// (Button, Select, FormField, Modal, Input, Textarea, Tabs, Drawer ...).
// Handgebaute native <select>/<input>/<textarea> in .tsx sind verpönt.
// Basis-Severity ist 'error' (Phase 143 / Kriterium 6, 2026-09-01). Die
// LEGACY_NO_RESTRICTED_SYNTAX_FILES-Liste unten hält die zu diesem Zeitpunkt
// gemessenen Altfälle auf 'warn' (Ratchet) — siehe deren Kommentar.
const uiPrimitiveGuardOptions = [
  {
    selector: "JSXOpeningElement[name.name='select']",
    message: 'Natives <select> verboten — nutze <Select> aus @/components/ui (Referenz: Storybook UI/*).',
  },
  {
    selector: "JSXOpeningElement[name.name='input']",
    message: 'Natives <input> verboten — nutze <Input> aus @/components/ui (Referenz: Storybook UI/*).',
  },
  {
    selector: "JSXOpeningElement[name.name='textarea']",
    message: 'Natives <textarea> verboten — nutze <Textarea> aus @/components/ui (Referenz: Storybook UI/*).',
  },
]

const uiPrimitiveGuard = ['error', ...uiPrimitiveGuardOptions]
const uiPrimitiveGuardLegacyWarn = ['warn', ...uiPrimitiveGuardOptions]

// Zweiter, auf src/components/ui/** beschränkter Guard (Befund 8b, UAT-Runde 261029-i1y):
// verbietet dort ZUSÄTZLICH natives <button> (Modal/Drawer fielen vormals auf eigene
// <button>-Schließen-Kreuze zurück statt auf IconButton) und wiederholt die drei
// select/input/textarea-Selektoren aus uiPrimitiveGuardOptions -- NICHT den repo-weiten
// uiPrimitiveGuard selbst erweitert, damit dessen app-weiter Scope (select/input/textarea,
// ohne button) unverändert bleibt.
const uiDirectoryGuardOptions = [
  ...uiPrimitiveGuardOptions,
  {
    selector: "JSXOpeningElement[name.name='button']",
    message:
      'Natives <button> in components/ui verboten — nutze <Button>/<IconButton> (Ausnahme nur für dokumentierte ARIA-Widget-Dateien, siehe UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES).',
  },
]
const uiDirectoryGuard = ['error', ...uiDirectoryGuardOptions]

// Dritter, auf src/app/** beschränkter Guard (Befund 3, Live-UAT Runde 4, 2026-10-30, optional):
// verbietet dort ZUSÄTZLICH natives <table> (DefaultCrewManager.tsx baute vormals einen eigenen
// <table>-Nachbau statt Table/TableHead/TableRow/TableCell zu nutzen). Wiederholt die drei
// select/input/textarea-Selektoren aus uiPrimitiveGuardOptions, damit dieser Block den
// repo-weiten uiPrimitiveGuard für src/app NICHT versehentlich ersetzt -- ESLint Flat Config
// überschreibt eine Regel pro Datei komplett (kein Array-Merge zwischen mehreren passenden
// Config-Objekten). Zum Einführungszeitpunkt bestehen 0 Produktions-Verstöße (geprüft per
// `grep -rl '<table' src/app --include='*.tsx'`, nur zwei .test.tsx-Dateien rendern eigene
// Tabellen als Testinhalt) -- direkt als 'error' ohne Ratchet-Ausnahmeliste eingeführt.
const appDirectoryGuardOptions = [
  ...uiPrimitiveGuardOptions,
  {
    selector: "JSXOpeningElement[name.name='table']",
    message:
      'Natives <table> in src/app verboten — nutze <Table>/<TableHead>/<TableRow>/<TableCell> aus @/components/ui.',
  },
]
const appDirectoryGuard = ['error', ...appDirectoryGuardOptions]

// Bewusste, kleine, FESTE Ausnahmeliste (kein Ratchet wie LEGACY_NO_RESTRICTED_SYNTAX_FILES
// oben — dieser Guard ist neu und wächst nicht über eine stillschweigend größer werdende
// Altlast, sondern über eine bewusste Review-Entscheidung): Dateien, in denen das native
// Element Teil der eigenen, unterschiedlichen ARIA-Widget-Semantik ist, kein fauler
// Button-Ersatz.
const UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES = [
  'Button.tsx', // definierende Datei des Button-Primitives selbst
  'IconButton.tsx', // definierende Datei des IconButton-Primitives selbst (analog zu Button.tsx: eigene forwardRef-Implementierung, kein Button-Wrapper)
  'Input.tsx', // definierende Datei des Input-Primitives selbst
  'Select.tsx', // definierende Datei des Select-Primitives selbst
  'Textarea.tsx', // definierende Datei des Textarea-Primitives selbst
  'Switch.tsx', // button[role=switch] IST Switch selbst, kein Button-Ersatz
  'Tabs.tsx', // button[role=tab] ist Tabs' eigene Struktur
  'NavArrow.tsx', // bereits im Code als bewusst natives Element dokumentiert
  // ThumbnailStrip.tsx wurde entfernt: die Thumbnail-Kacheln wurden auf IconButtons neue, offizielle
  // media-Variante umgestellt (Code-Review Runde 3, 2026-10-31) -- keine Ausnahme mehr nötig.
  // YearPicker.tsx wurde entfernt: alle fünf nativen <button> wurden auf IconButton/NavArrow
  // umgestellt (UAT-Runde 4, Befund 4, 2026-10-30) -- keine Ausnahme mehr nötig.
  // DatePicker.tsx wurde entfernt: alle nativen <button> (Auslöser, Leeren, Blätter-Pfeile,
  // Monats-/Jahres-Titel-Umschalter, Tages-/Monats-/Jahres-Kacheln, Fußzeilen-Aktionen) wurden
  // analog zu YearPicker auf IconButton/NavArrow/Button umgestellt (UAT-Runde 5, 2026-10-30) --
  // keine Ausnahme mehr nötig.
  // Accordion.tsx wurde entfernt: die Kopfzeile ist jetzt der geteilte DisclosureTrigger-
  // Baustein (UAT-Runde 4, Befund 6, 2026-10-30) -- das native <button> steht jetzt nur noch
  // in DisclosureTrigger.tsx selbst.
  // Vollbreites, klickbares Flex-Layout-Widget (Titel + DisclosureIndicator-Öffner-Symbol) mit
  // eigenem ARIA-Widget-Vertrag (aria-expanded/aria-controls) -- passt weder zu Buttons
  // Text-Button-Form noch zu IconButtons Icon-only-Form, daher bleibt das native <button> hier
  // die technisch zutreffende Basis (bewusste Entscheidung, kein offener Punkt mehr).
  'DisclosureTrigger.tsx',
]

// RATCHET — diese Liste darf nur SCHRUMPFEN, nie wachsen.
// Gemessen am 2026-09-01 (Phase 143, Plan 143-12, Task 3): 264 Verstöße in
// genau diesen 67 Dateien (60 Produktions- + 7 Testdateien), als
// `docker compose exec team4sv30-frontend npx eslint . --rule
// '{"no-restricted-syntax":"error"}' --quiet` gegen den vollen Repo-Baum
// gelaufen ist (src/components/ui/** ausgenommen, siehe dessen eigenes
// Override unten). Es ist eine FROZEN EXPLICIT FILE LIST, keine Glob-Regel:
// ein Directory-Glob würde auch morgen neu angelegte Dateien in denselben
// Ordnern stillschweigend mit-exemptieren und den Ratchet aushebeln — eine
// neue Datei trägt hier nie automatisch eine Ausnahme. Wird eine Datei auf
// die globalen Primitives umgestellt (retrofitted), wird ihr Eintrag
// GELÖSCHT. Nichts wird hier je hinzugefügt; ein genuiner Bedarf für eine
// Ergänzung ist eine bewusste Entscheidung, die in einen Code-Review gehört,
// nicht in eine stille Editierung. Vollständige Migration ist als Backlog-
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
  // JellyfinSyncPanel.tsx wurde aufgeteilt (CLAUDE.md "Übergroße Dateien beim Anfassen
  // aufteilen", Quick-Task 261029-i1y) -- dieselbe, bereits vor dem Split bestehende
  // native-input/select-Altlast lebt jetzt in diesen drei Schritt-Komponenten, kein Zuwachs.
  'src/app/admin/anime/components/JellyfinSync/JellyfinSyncStepPreview.tsx',
  'src/app/admin/anime/components/JellyfinSync/JellyfinSyncStepSearch.tsx',
  'src/app/admin/anime/components/JellyfinSync/JellyfinSyncStepSeries.tsx',
  'src/app/admin/anime/components/ManualCreate/ManualCreateAssetUploadPanel.tsx',
  'src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx',
  'src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx',
  'src/app/admin/anime/create/CreateAssetSearchDialog.tsx',
  'src/app/admin/anime/create/CreateJellyfinCard.tsx',
  'src/app/admin/anime/create/page.tsx',
  // 187-06: reine Code-Verschiebung aus dem vormals hier gelisteten
  // EpisodeVersionEditorPage.tsx (450-Zeilen-Split der Informationen-/Dateien-Tabs in eigene
  // Sektions-Komponenten) -- keine neuen nativen Elemente, nur relokierte Altlast
  // (Stream-Link-/Media-Provider-/Media-ID-Inputs bzw. das schreibgeschützte Anime-Folder-Path-
  // Input). EpisodeVersionEditorPage.tsx selbst enthält nach dem Split kein natives Element mehr
  // und wurde deshalb aus dieser Liste entfernt (Ratchet schrumpft). Bewusste, dokumentierte
  // Ergänzung (187-06-SUMMARY.md), gleiches Muster wie die 156-14-/174-14-/180-04-/184-05-
  // Ergänzungen oben.
  'src/app/admin/episode-versions/\\[versionId\\]/edit/DateienTabSection.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/InformationenTabSection.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/ReleaseVersionMediaDetailPanel.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/ReleaseVersionMediaSection.tsx',
  // 180-04: reine Code-Verschiebung aus dem bereits gelisteten
  // ReleaseVersionMediaSection.tsx (Edit/View-Drawer-Extraktion zur
  // Einhaltung der 450-Zeilen-Grenze) -- keine neuen nativen Elemente, nur
  // relokierte Altlast (Checkbox- und Ersatzdatei-Input). Bewusste,
  // dokumentierte Ergänzung (180-04-SUMMARY.md), gleiches Muster wie die
  // 156-14-/174-14-Ergänzungen oben.
  'src/app/admin/episode-versions/\\[versionId\\]/edit/ReleaseVersionMediaEditDrawer.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/ReleaseVersionNotesTab.test.tsx',
  // 156-14: reine Code-Verschiebung aus dem bereits gelisteten SegmentEditPanel.tsx (Extraktion
  // zur Einhaltung der 450-Zeilen-Grenze aus 156-UAT.md) -- keine neuen nativen Elemente, nur
  // relokierte Altlast. Bewusste, dokumentierte Ergänzung (156-14-SUMMARY.md), keine stille
  // Editierung.
  'src/app/admin/episode-versions/\\[versionId\\]/edit/SegmentAssetSection.tsx',
  'src/app/admin/episode-versions/\\[versionId\\]/edit/SegmentBasicFieldsSection.tsx',
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
  // 174-14: reine Code-Verschiebung aus dem bereits gelisteten
  // admin/fansubs/create/page.tsx (D-14-Split in Aliases-/Links-/Media-
  // Section-Komponenten) -- keine neuen nativen Elemente, nur relokierte
  // Altlast. Bewusste, dokumentierte Ergänzung (174-14-SUMMARY.md), keine
  // stille Editierung. Gleiches Muster wie die 156-14-Ergänzung oben.
  'src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx',
  'src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx',
  'src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx',
  'src/app/admin/fansubs/merge/page.tsx',
  'src/app/admin/fansubs/page.tsx',
  // 184-05: reine Code-Verschiebung aus dem bereits gelisteten
  // admin/fansubs/page.tsx (D-05-Split zur Einhaltung der 450-Zeilen-Grenze,
  // Zeilen-Komponenten FansubDesktopRow/FansubMobileCard ausgelagert) --
  // keine neuen nativen Elemente, nur relokierte Altlast (Checkbox-Inputs).
  // Bewusste, dokumentierte Ergänzung (184-05-SUMMARY.md), gleiches Muster
  // wie die 174-14-/156-14-/180-04-Ergänzungen oben.
  'src/app/admin/fansubs/FansubListRows.tsx',
  // quick-261018-l5r Task 2: reine Code-Verschiebung aus dem bereits gelisteten
  // AnimeEditWorkspace.tsx (Datei-Split zur Einhaltung der 450-Zeilen-Grenze vor der neuen
  // AniSearch-Verknüpfungs-Karte in Task 3) -- keine neuen nativen Elemente, nur relokierte
  // Altlast (Basisdaten-Inputs/-Selects). Bewusste, dokumentierte Ergänzung
  // (261018-l5r-SUMMARY.md), gleiches Muster wie die 180-04-/184-05-Ergänzungen oben.
  'src/app/admin/anime/components/AnimeEditPage/AnimeEditDetailsSection.tsx',
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
    ignores: ['tmp-live-full-flow*.js', 'storybook-static/**'],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // App Router project: no /pages directory.
      '@next/next/no-html-link-for-pages': 'off',
      // Globales UI erzwingen (siehe oben).
      'no-restricted-syntax': uiPrimitiveGuard,
      // GAP-20 (165-UAT.md, 2026-09-22): window.confirm()/bare confirm() sind
      // repo-weit verboten, Severity 'error', ohne Legacy-Ausnahmen (dieser
      // Quick-Task migriert alle bestehenden Vorkommen in einem Zug).
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'confirm',
          message:
            'window.confirm() ist verboten — nutze useConfirmDialog()/ConfirmDialog aus @/components/ui (GAP-20, 165-UAT.md).',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'confirm',
          message:
            'Globales confirm() ist verboten — nutze useConfirmDialog()/ConfirmDialog aus @/components/ui (GAP-20, 165-UAT.md).',
        },
      ],
    },
  },
  {
    // Block A (Befund 8b): aktiviert den components/ui-spezifischen Guard (select/input/
    // textarea/button) für alle produktiven .tsx-Dateien UND .stories.tsx-Dateien (Stories
    // sollen ebenfalls die Primitive nutzen), aber NICHT für .test.tsx -- Test-Harnesses
    // rendern legitim eigene native <button>-Kinder als Testinhalt, unabhängig von der
    // eigentlichen Komponente. Datei-Scope (.{ts,tsx}) bewusst identisch zum vormals hier
    // stehenden, abgelösten Block übernommen -- reine .ts-Dateien wie classNames.ts/index.ts
    // enthalten ohnehin kein JSX und sind vom JSX-Selektor nie betroffen.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': uiDirectoryGuard,
    },
  },
  {
    // Block B: überschreibt Block A für die dokumentierte, feste Ausnahmeliste (muss NACH
    // Block A stehen, damit die Override-Reihenfolge greift).
    files: UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES.map((f) => `src/components/ui/${f}`),
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Block C (Befund 3, Live-UAT Runde 4, 2026-10-30, optional): aktiviert den src/app-
    // spezifischen Guard (select/input/textarea/table) für alle produktiven .tsx-Dateien, aber
    // NICHT für .test.tsx -- Test-Harnesses rendern legitim eigene native <table>-Testinhalte.
    files: ['src/app/**/*.{ts,tsx}'],
    ignores: ['src/app/**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': appDirectoryGuard,
    },
  },
  {
    // Ratchet-Ausnahme für die eingefrorene Altfälle-Liste, siehe deren
    // Definition/Kommentar oben (LEGACY_NO_RESTRICTED_SYNTAX_FILES). Kommt bewusst NACH Block C,
    // damit die dort grandfatherte warn-Stufe für select/input/textarea auf exakt diesen Dateien
    // weiterhin greift (keine dieser Dateien nutzt natives <table>, siehe Kommentar an
    // appDirectoryGuardOptions -- kein Abdeckungsverlust in der Praxis).
    files: LEGACY_NO_RESTRICTED_SYNTAX_FILES,
    rules: {
      'no-restricted-syntax': uiPrimitiveGuardLegacyWarn,
    },
  },
]

export default config
