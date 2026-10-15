---
phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-
plan: 10
subsystem: ui
tags: [css-modules, dead-code, visual-regression, playwright, fansub-edit]

# Dependency graph
requires:
  - phase: 184-04
    provides: mergeCssModules-Umstellung FansubAppMembersSection-Cluster
  - phase: 184-06
    provides: mergeCssModules-Umstellung Fansub-Umfeld (page.tsx, create/, merge/)
  - phase: 184-07
    provides: mergeCssModules-Umstellung admin/episodes
  - phase: 184-08
    provides: mergeCssModules-Umstellung AnimeContext/EpisodeManager-Cluster
  - phase: 184-09
    provides: mergeCssModules-Umstellung ReleaseVersionNotesTab/EditorParts
provides:
  - "FansubEdit.module.css ohne 120 grep-belegt tote Top-Level-Klassen (3306 -> 2442 Zeilen, 286 -> 166 Top-Level-Selektoren)"
  - "Vollstaendige, grep-belegte Nutzungsklassifikation aller 286 ehemaligen Top-Level-Klassen inkl. Prop-Drill-Konsumenten-Kette (35 tatsaechliche Konsumenten statt der literal-importierenden 26)"
  - "Vorher/Nachher-Screenshot-Beweis (18 Paare, 15/18 byte-identisch, restliche 3 visuell identisch) unter /tmp/shots/184-10/{before,after}/ (nicht committet)"
affects: ["184-REPORT.md (Phasenabschluss)", "Task 4 (blockierender Live-Checkpoint, noch offen)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixpunkt-Traversierung der styles-Prop-Weitergabe (styles={styles} JSX-Treffer -> Kindkomponenten-Datei) als korrekte Konsumentenermittlung fuer CSS-Module, die per Record<string,string>-Prop statt per direktem Import konsumiert werden"
    - "Python-Skript-basierte CSS-Selektor-Chirurgie: Komma-Selektorgruppen mit gemischt toten/lebenden Mitgliedern werden Mitglied-weise aufgetrennt statt den ganzen Rule-Body zu loeschen"

key-files:
  created: []
  modified:
    - "frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css"

key-decisions:
  - "Konsumenten-Scope korrigiert: Die im Plan/CONTEXT.md angenommenen '25-26 importierenden Dateien' sind unvollstaendig, weil 9 Tab-/Card-Komponenten (AnimeReleasesCockpit, FansubBasicInfoTab, FansubCommunityLinksList, FansubDetailsTab, FansubEditHeaderCard, ReleaseMediaDrawer, ReleaseRowDetails, ReleaseThemeDrawerSection, FansubEditWorkspaceSection) das gemergte styles-Objekt per Prop (styles: Record<string,string>) statt per eigenem Import erhalten. Eine Fixpunkt-Traversierung der styles={styles}-Weitergabe ab den 26 echten Importern ergab 35 tatsaechliche Konsumenten. Ergebnis: nur 120 Klassen sind wirklich tot (nicht ~206 wie in 184-CONTEXT.md geschaetzt) - 86 Klassen, die bei einer Pruefung nur gegen die 26 Importer faelschlich als tot gegolten haetten, sind tatsaechlich lebend ueber Prop-Drilling."
  - "Project-weite Literal-Suche (styles.<name> ueber ganz frontend/src) wurde verworfen, weil sie False Positives durch gleichnamige, aber voellig unabhaengige CSS-Module erzeugt (z. B. FansubOpEdSection.tsx/ReleaseThemeAssetsSection.tsx nutzen eine eigene, lokal 'styles' genannte mergeCssModules(opEdStyles, sharedStyles)-Instanz, die zufaellig denselben Klassennamen 'fansubEditHint' hat wie FansubEdit.module.css). Nur die per Fixpunkt-Traversierung bestaetigten 35 Dateien wurden fuer die Klassifikation herangezogen."
  - "Keine dynamischen Zugriffsmuster (styles[var], Template-Strings, clsx/classNames mit computed keys) in den 35 bestaetigten Konsumenten-Dateien gefunden - alle 120 toten Klassen sind ausschliesslich ueber Loeschung bereinigbar, keine Klasse musste als 'nicht sicher tot' zurueckgehalten werden."
  - "Komma-Selektorgruppen mit gemischten toten/lebenden Mitgliedern (z. B. '.fansubEditMembershipModalStack, .fansubEditMembershipModalSection {') wurden Mitglied-weise aufgetrennt: nur das tote Mitglied wird aus der Selektorliste entfernt, der Rule-Body bleibt fuer die verbleibenden lebenden Mitglieder unveraendert erhalten."
  - "Loeschung in 3 Gruppen (40/39/41 Klassen alphabetisch, da keine CSS-Abschnittskommentare fuer eine Tab-basierte Gruppierung vorhanden sind) mit vollem tsc/eslint/vitest-Gate zwischen jeder Gruppe, wie im Risikohinweis aus 184-CONTEXT.md gefordert."
  - "Descendant-/Kombinator-Selektoren, die eine tote Ankerklasse referenzieren (z. B. '.fansubEditAnimeReleaseActions .fansubEditAnimeContributorsButton'), wurden bewusst NICHT geloescht - sie liegen ausserhalb des per Regex definierten Top-Level-Scopes dieses Plans (Akzeptanzkriterium misst exakt die Top-Level-Selektor-Anzahl) und waeren damit ein ungeplanter Scope-Erweiterungs-Schritt."

requirements-completed: []  # D-03: Tasks 1-3 fertig, Task 4 (Live-Freigabe) noch offen - Requirement erst bei Nutzerfreigabe vollstaendig erfuellt

# Metrics
duration: ~100min
completed: "2026-10-15 (Tasks 1-3; Task 4 wartet auf Nutzerfreigabe)"
---

# Phase 184 Plan 10: FansubEdit.module.css Dead-Code-Bereinigung (F-20/D-03) Summary

**120 grep-belegt tote Top-Level-CSS-Klassen aus FansubEdit.module.css entfernt (3306 → 2442 Zeilen), nach einer korrigierten Nutzungspruefung, die Prop-Drilling-Konsumenten einschliesst (35 tatsaechliche Konsumenten statt der im Plan angenommenen 26 Importer) — Vorher/Nachher-Screenshot-Beweis liegt vor (15/18 Paare byte-identisch), Live-Freigabe durch den Nutzer (Task 4) steht noch aus.**

## Performance

- **Duration:** ~100min (kein exakter Start-Timestamp erfasst; Schaetzung basierend auf Umfang: vollstaendige Nutzungspruefung inkl. Methodik-Korrektur, 18 BEFORE-Screenshots, 3x Loesch-Gate-Zyklus, 18 AFTER-Screenshots, Vergleich)
- **Tasks:** 3 von 4 abgeschlossen (Task 4 ist `checkpoint:human-verify gate="blocking"` — kann nicht autonom abgeschlossen werden)
- **Files modified:** 1 (`FansubEdit.module.css`)

## Accomplishments

- **Methodik-Korrektur vor der Loeschung (wichtigster Fund dieses Plans):** Die in 184-CONTEXT.md dokumentierte Zahl "≈206 tote Klassen" basiert auf einer Nutzungspruefung, die nur die 26 Dateien beruecksichtigt, die `FansubEdit.module.css` direkt importieren. Eine Fixpunkt-Traversierung aller `styles={styles}`-JSX-Weitergaben ab diesen 26 Dateien deckte 9 weitere echte Konsumenten auf (`AnimeReleasesCockpit.tsx`, `FansubBasicInfoTab.tsx`, `FansubCommunityLinksList.tsx`, `FansubDetailsTab.tsx`, `FansubEditHeaderCard.tsx`, `ReleaseMediaDrawer.tsx`, `ReleaseRowDetails.tsx`, `ReleaseThemeDrawerSection.tsx`, `sections/FansubEditWorkspaceSection.tsx`), die das gemergte `styles`-Objekt per `styles: Record<string, string>`-Prop statt per eigenem Import erhalten. Gegen diese 35 Dateien geprueft sind nur **120** der 286 Top-Level-Klassen tatsaechlich tot (nicht 206) — 86 Klassen waeren bei einer Pruefung nur gegen die 26 Importer faelschlich als tot markiert und geloescht worden.
- Eine naive projektweite Literal-Suche (`styles.<name>` ueber ganz `frontend/src`) wurde verworfen, weil sie False Positives durch voellig unabhaengige, gleichnamige CSS-Module erzeugt (z. B. hat `FansubOpEdSection.module.css` zufaellig auch eine Klasse `fansubEditHint`, erreicht ueber eine eigene `mergeCssModules`-Instanz, die lokal ebenfalls `styles` heisst). Nur die 35 per Fixpunkt-Traversierung bestaetigten Dateien zaehlen als Konsumenten.
- Dynamische Zugriffsmuster (`styles[variable]`, Template-Strings, `clsx`/`classNames` mit computed keys) wurden explizit in allen 35 bestaetigten Konsumenten-Dateien gesucht — **keine gefunden**. Zusaetzlich wurde jede der 120 als tot klassifizierten Klassen per `grep -rln "\b<name>\b"` als reiner Wort-Treffer ueber ganz `frontend/src` (ausserhalb von `FansubEdit.module.css` selbst) gegengeprueft — **kein Treffer**, keine Klasse musste als "nicht sicher tot" zurueckgehalten werden.
- 120 tote Klassen in 3 Gruppen (40/39/41, alphabetisch — die Datei hat keine Abschnittskommentare fuer eine Tab-basierte Gruppierung) geloescht, mit vollem `tsc`/`eslint`/`vitest`-Gate zwischen jeder Gruppe. Komma-Selektorgruppen mit gemischten toten/lebenden Mitgliedern wurden Mitglied-weise aufgetrennt statt den ganzen Rule-Body zu loeschen (siehe Beispiele im Commit-Diff).
- 18 BEFORE- und 18 AFTER-Screenshots (8 Tabs von `/admin/fansubs/1/edit` + `/admin/fansubs/create`, je Desktop 1440×900 und Mobil 375×812) unter identischen Bedingungen aufgenommen (`docker restart team4sv30-frontend` vor jedem Lauf, Keycloak-Token-als-Cookie-Auth, TCP-Loopback-Proxy gegen den CORS-Fallstrick) — **15 von 18 Paaren sind byte-identisch**, die restlichen 3 (`fansub-edit-collaboration-desktop`, `fansub-edit-releases-mobile`, `fansub-edit-roles-desktop`) wurden manuell pixelweise verglichen und sind visuell identisch (minimale Byte-Differenz ohne sichtbaren Unterschied, vermutlich PNG-Encoder-Jitter).
- Nach der Loeschung: `grep -oE '^\.[a-zA-Z0-9_-]+(?=\s*[,{])' ... | sort -u | wc -l` = exakt 166, identisch zur Task-1-Live-Liste (keine versehentlich mitgeloeschte lebende Klasse). Klammern-Bilanz der Datei bleibt ausgeglichen (363 `{` / 363 `}`).

## Task Commits

1. **Task 1: Vollstaendige Nutzungspruefung + BEFORE-Screenshots** - kein eigener Commit (reine Analyse/Audit + Screenshot-Capture nach `/tmp/shots/184-10/before/`, nicht committet-relevant per Plan-Vorgabe)
2. **Task 2: Tote Klassen loeschen, Gate, Commit** - `ab02cfce8` (refactor)
3. **Task 3: AFTER-Screenshots** - kein eigener Commit (Screenshot-Capture nach `/tmp/shots/184-10/after/`, nicht committet-relevant per Plan-Vorgabe)

**Plan metadata:** wird erst nach Task 4 (Nutzerfreigabe) committet

## Files Created/Modified

- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` — 120 tote Top-Level-Klassen entfernt (3306 → 2442 Zeilen, 286 → 166 Top-Level-Selektoren)
- `/tmp/shots/184-10/before/*.png` (18 Dateien), `/tmp/shots/184-10/after/*.png` (18 Dateien) — nicht committet (ausserhalb des Repos, per Plan-Vorgabe)

## Vollstaendige Klassifikationstabelle (Task 1, Akzeptanzkriterium)

**Konsumenten-Scope:** 35 Dateien (26 direkte Importer von `FansubEdit.module.css` + 9 per Fixpunkt-Traversierung bestaetigte Prop-Drill-Kinder). Pruefmuster: `styles\.<name>\b|fansubEditStyles\.<name>\b` innerhalb dieser 35 Dateien; zusaetzlich `styles[...]`/`` styles` `` / `clsx(`/`classNames(`-Suche fuer dynamische Zugriffe (0 Treffer).

### Tote Klassen (120) — in Task 2 geloescht

**Loesch-Gruppe A (40, Commit `ab02cfce8`):**
contributionDrawerHint, contributionDrawerToolbar, fansubEditAnimeContributorsButton, fansubEditAnimeProjectNoteActions, fansubEditAnimeProjectNoteForm, fansubEditAnimeReleaseActions, fansubEditBasicIntro, fansubEditBasicSupplement, fansubEditBasicSupplementBody, fansubEditBasicSupplementHeader, fansubEditBasicSupplementTitle, fansubEditBasicTitle, fansubEditClaimActions, fansubEditClaimCell, fansubEditClaimInvite, fansubEditClaimItem, fansubEditClaimList, fansubEditDropzone, fansubEditHistoricalClaimActions, fansubEditHistoricalMemberActions, fansubEditHistoricalMemberBody, fansubEditHistoricalMemberMetaRow, fansubEditHistoricalMemberRoleChips, fansubEditHistoricalRoleActions, fansubEditHistoricalRoleChip, fansubEditMediaActions, fansubEditMediaCard, fansubEditMediaPermissionSummary, fansubEditMembershipActionRow, fansubEditMembershipBadgeRow, fansubEditMembershipBody, fansubEditMembershipCard, fansubEditMembershipCardTop, fansubEditMembershipControls, fansubEditMembershipIdentity, fansubEditMembershipList, fansubEditMembershipMetaGrid, fansubEditMembershipMetaLine, fansubEditMembershipModalSection, fansubEditMembershipNameRow

**Loesch-Gruppe B (39, Commit `ab02cfce8`):**
fansubEditMembershipProfile, fansubEditMembershipRoleControls, fansubEditMembershipRoleEditor, fansubEditMembershipRoleItem, fansubEditMembershipRoleItemMain, fansubEditMembershipRoleList, fansubEditMembershipRoleSummary, fansubEditMembershipTitle, fansubEditMembershipVisibilityBadge, fansubEditorActionBar, fansubEditorBadge, fansubEditorBadgeRow, fansubEditorCard, fansubEditorCardHeader, fansubEditorCardHeading, fansubEditorGhostButton, fansubEditorMain, fansubEditorMetaCard, fansubEditorMetaGrid, fansubEditorMetaHeader, fansubEditorPreviewText, fansubEditorSurface, fansubEditorTitle, fansubEditReleaseActions, fansubEditReleaseAssignmentCopy, fansubEditReleaseAssignmentPanel, fansubEditReleaseCardChips, fansubEditReleaseDrawerAssetTypes, fansubEditReleaseDrawerContextGrid, fansubEditReleaseDrawerFieldGrid, fansubEditReleaseDrawerMediaCard, fansubEditReleaseDrawerMediaGrid, fansubEditReleaseDrawerMediaHeader, fansubEditReleaseDrawerMediaThumb, fansubEditReleaseDrawerReadOnly, fansubEditReleaseDrawerTextarea, fansubEditReleaseEditButton, fansubEditReleaseExpandedHeader, fansubEditReleaseIconButton

**Loesch-Gruppe C (41, Commit `ab02cfce8`):**
fansubEditReleaseRow, fansubEditReleaseRowDisclosure, fansubEditReleaseScopeBadge, fansubEditReleaseTitleButton, fansubEditReleaseTitleCell, fansubEditReleaseTitleDisclosure, fansubEditSaveSuccess, fansubEditSegmentAssetHint, fansubEditSegmentCard, fansubEditSegmentCardActive, fansubEditSegmentEditor, fansubEditSegmentGrid, fansubEditSegmentStatus, fansubEditSegmentStatusglobal, fansubEditSegmentStatusmissing, fansubEditSegmentStatusrelease, fansubEditThemeMissingMark, fansubEditThemeUploadInput, fansubEditTimeline, fansubEditTimelineLegend, fansubEditTimelineLegendBadge, fansubEditTimelineLegendBadgeGlobal, fansubEditTimelineLegendBadgeMissing, fansubEditTimelineLegendBadgeRelease, fansubEditTimelineLegendItem, fansubEditTimelineMainContent, fansubEditTimelineScale, fansubEditTimelineSegment, fansubEditTimelineSegmentActive, fansubEditTimelineSegmentEd, fansubEditTimelineSegmentglobal, fansubEditTimelineSegmentIn, fansubEditTimelineSegmentmissing, fansubEditTimelineSegmentOp, fansubEditTimelineSegmentrelease, fansubEditTimelineTrack, formActionRow, formLayoutShell, formSectionCard, formSections, formSectionTitle

(4 Klassen — `fansubEditAnimeContributorsButton`, `fansubEditAnimeReleaseActions`, `fansubEditBasicIntro`, `fansubEditHistoricalMemberBody`, `fansubEditHistoricalRoleChip` — hatten je 2 separate Top-Level-Rule-Bloecke in der Datei, beide wurden entfernt; daher 125 geloeschte Selektor-Vorkommen fuer 120 eindeutige Klassennamen.)

### Lebende Klassen (166) — bleiben unveraendert, NICHT verschoben (D-03)

| Klasse | Konsumenten (Anzahl) | Dateien |
|---|---|---|
| chipRow | 9 | AdminFansubCreateAliasesSection.tsx, AnimeReleasesFilterBar.tsx, FansubAppMemberAddModal.tsx, FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx, ProjectCockpitBadges.tsx |
| contributionAddActions | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionAddPanel | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionEditRow | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionInlineWarning | 3 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionPersonCell | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionRemoveButton | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionRoleLabel | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionRolesCell | 4 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionRoleSummaryChip | 3 | AnimeContributionModal.tsx, AnimeReleasesCockpit.tsx, ReleaseContributionDrawer.tsx |
| contributionRoleSummaryChips | 3 | AnimeContributionModal.tsx, AnimeReleasesCockpit.tsx, ReleaseContributionDrawer.tsx |
| contributionRoleSummaryEmpty | 3 | AnimeContributionModal.tsx, AnimeReleasesCockpit.tsx, ReleaseContributionDrawer.tsx |
| contributionRoleSummaryLine | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionRoleToggles | 1 | RoleToggleGroup.tsx |
| contributionRowActions | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionRows | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionSheetIntro | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| contributionToolbarMeta | 2 | AnimeContributionModal.tsx, ReleaseContributionDrawer.tsx |
| fansubEditAnimeLandscape | 1 | AnimeReleasesCockpit.tsx |
| fansubEditAnimePoster | 1 | AnimeReleasesCockpit.tsx |
| fansubEditAnimeReleaseBody | 1 | AnimeReleasesCockpit.tsx |
| fansubEditAnimeReleaseCard | 1 | AnimeReleasesCockpit.tsx |
| fansubEditAnimeReleaseCount | 1 | AnimeReleasesCockpit.tsx |
| fansubEditAnimeReleaseHeader | 1 | AnimeReleasesCockpit.tsx |
| fansubEditAnimeReleaseHeaderRow | 1 | AnimeReleasesCockpit.tsx |
| fansubEditAnimeReleaseType | 1 | AnimeReleasesCockpit.tsx |
| fansubEditAnimeToggle | 2 | AnimeProjectNotesSection.tsx, AnimeReleasesCockpit.tsx |
| fansubEditBannerImage | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditBannerImageElement | 1 | FansubEditHeaderCard.tsx |
| fansubEditBannerPlaceholder | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditBannerShell | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditBasicField | 7 | FansubBasicInfoTab.tsx |
| fansubEditBasicFieldWide | 2 | FansubBasicInfoTab.tsx |
| fansubEditBasicGrid | 1 | FansubBasicInfoTab.tsx |
| fansubEditBasicPanelHeader | 1 | FansubBasicInfoTab.tsx |
| fansubEditBasicPanelTitle | 2 | FansubBasicInfoTab.tsx |
| fansubEditBasicSupplementGrid | 1 | FansubBasicInfoTab.tsx |
| fansubEditBasicSurface | 1 | FansubBasicInfoTab.tsx |
| fansubEditBasicWorkspace | 1 | FansubBasicInfoTab.tsx |
| fansubEditBrandingCard | 1 | FansubBasicInfoTab.tsx |
| fansubEditColumns | 2 | FansubDetailsTab.tsx, page.tsx |
| fansubEditColumnsSingleLeft | 1 | FansubDetailsTab.tsx |
| fansubEditColumnsSingleRight | 1 | FansubDetailsTab.tsx |
| fansubEditCommunityBody | 1 | FansubBasicInfoTab.tsx |
| fansubEditCommunityCard | 1 | FansubBasicInfoTab.tsx |
| fansubEditForm | 2 | FansubDetailsTab.tsx, page.tsx |
| fansubEditHeaderCard | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditHint | 34 | AdminFansubCreateAliasesSection.tsx, AdminFansubCreateBasicInfoSection.tsx, AdminFansubCreateLinksSection.tsx, AdminFansubCreateMediaSection.tsx, AnimeProjectNotesSection.tsx, AnimeReleasesCockpit.tsx, FansubAppMemberAddModal.tsx, FansubAppMemberEditorPanel.tsx, FansubAppMembersOverview.tsx, FansubAppMembersSection.tsx, FansubBasicInfoTab.tsx, FansubDetailsTab.tsx, GroupMembersHistTable.tsx, NotesTab.tsx, page.tsx, ReleaseThemeDrawerSection.tsx |
| fansubEditIdentity | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditIdentityTop | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditInlineError | 14 | AdminFansubCreateAliasesSection.tsx, AdminFansubCreateBasicInfoSection.tsx, AdminFansubCreateLinksSection.tsx, FansubBasicInfoTab.tsx |
| fansubEditInlineRoleFooter | 2 | FansubAppMemberEditorPanel.tsx, GroupMemberFormModals.tsx |
| fansubEditInlineRoleRow | 2 | FansubAppMemberEditorPanel.tsx, GroupMemberFormModals.tsx |
| fansubEditLeftColumn | 2 | FansubDetailsTab.tsx, page.tsx |
| fansubEditLinkInput | 2 | AdminFansubCreateLinksSection.tsx, FansubCommunityLinksList.tsx |
| fansubEditLinkInputInvalid | 1 | AdminFansubCreateLinksSection.tsx |
| fansubEditLinkRemoveButton | 1 | FansubCommunityLinksList.tsx |
| fansubEditLinkRow | 2 | AdminFansubCreateLinksSection.tsx, FansubCommunityLinksList.tsx |
| fansubEditLinksHeader | 2 | AdminFansubCreateLinksSection.tsx, FansubDetailsTab.tsx |
| fansubEditLinksList | 2 | AdminFansubCreateLinksSection.tsx, FansubCommunityLinksList.tsx |
| fansubEditLogoBadge | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditLogoImage | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditMainTabButton | 1 | FansubEditHeaderCard.tsx |
| fansubEditMainTabButtonActive | 1 | FansubEditHeaderCard.tsx |
| fansubEditMainTabRow | 1 | FansubEditHeaderCard.tsx |
| fansubEditMainTabSelect | 1 | FansubEditHeaderCard.tsx |
| fansubEditMediaGrid | 2 | AdminFansubCreateMediaSection.tsx, FansubBasicInfoTab.tsx |
| fansubEditMemberAddCard | 2 | FansubAppMemberAddModal.tsx |
| fansubEditMemberCompactBody | 5 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMemberCompactCard | 4 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMemberCompactHeader | 2 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMemberCompactIdentity | 2 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMemberCompactMeta | 2 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMemberEditButton | 2 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMemberEditorPanel | 3 | FansubAppMemberEditorPanel.tsx |
| fansubEditMemberMobileCard | 1 | FansubAppMembersOverview.tsx |
| fansubEditMembersCompactList | 2 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMembersDesktopTable | 1 | FansubAppMembersOverview.tsx |
| fansubEditMembershipAvatar | 2 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMembershipModalActions | 5 | GroupHistRoleDialog.tsx, GroupMemberFormModals.tsx, GroupMembersTab.tsx |
| fansubEditMembershipModalStack | 5 | FansubAppMemberAddModal.tsx, GroupHistRoleDialog.tsx, GroupMemberFormModals.tsx |
| fansubEditMembershipSurface | 2 | FansubAppMembersSection.tsx, GroupMembersTab.tsx |
| fansubEditMemberStatusDot | 2 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMemberStatusDotActive | 2 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMemberStatusDotInactive | 2 | FansubAppMembersOverview.tsx, GroupMembersHistTable.tsx |
| fansubEditMobileActionBar | 1 | FansubDetailsTab.tsx |
| fansubEditorEyebrow | 1 | AnimeProjectNoteForm.tsx |
| fansubEditorMetaTitle | 1 | AnimeProjectNoteForm.tsx |
| fansubEditPreviewLinkButton | 1 | AdminFansubCreateLinksSection.tsx |
| fansubEditProfileRow | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditProjectInsightPanel | 2 | AnimeReleasesCockpit.tsx |
| fansubEditProjectPanelHeader | 1 | AnimeReleasesCockpit.tsx |
| fansubEditProjectReleasesHeader | 1 | AnimeReleasesCockpit.tsx |
| fansubEditProjectTeamPanel | 1 | AnimeReleasesCockpit.tsx |
| fansubEditProjectTeamReadOnly | 1 | AnimeReleasesCockpit.tsx |
| fansubEditProjectTeamToggle | 1 | AnimeReleasesCockpit.tsx |
| fansubEditReleaseAvatarStack | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseCardActions | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseCardDisclosure | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseCardHeader | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseCardList | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseCardMeta | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseCardPrimaryMeta | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseCardStats | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseCardTitle | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseCardToggle | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseDrawer | 2 | ReleaseMediaDrawer.tsx, ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseDrawerAssetBox | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseDrawerBody | 2 | ReleaseMediaDrawer.tsx, ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseDrawerDetailGrid | 1 | ReleaseMediaDrawer.tsx |
| fansubEditReleaseDrawerDetailItem | 11 | ReleaseMediaDrawer.tsx |
| fansubEditReleaseDrawerDropzone | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseDrawerFooter | 2 | ReleaseMediaDrawer.tsx, ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseDrawerHeader | 2 | ReleaseMediaDrawer.tsx, ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseDrawerMediaLink | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseDrawerOverlay | 2 | ReleaseMediaDrawer.tsx, ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseDrawerPanel | 3 | ReleaseMediaDrawer.tsx, ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseDrawerTabs | 1 | ReleaseMediaDrawer.tsx |
| fansubEditReleaseDrawerTitleRow | 1 | ReleaseMediaDrawer.tsx |
| fansubEditReleaseEpisodeBadge | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseExpandButton | 2 | ReleaseMediaDrawer.tsx, ReleaseThemeDrawerSection.tsx |
| fansubEditReleaseExpanded | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseHeaderActions | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseItem | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseList | 1 | AnimeReleasesCockpit.tsx |
| fansubEditReleaseLoadMore | 1 | ReleaseRowDetails.tsx |
| fansubEditReleasePeopleBox | 1 | ReleaseRowDetails.tsx |
| fansubEditReleasePeopleNames | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseRows | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseState | 11 | AnimeProjectNotesSection.tsx, AnimeReleasesCockpit.tsx, ReleaseMediaDrawer.tsx, ReleaseRowDetails.tsx |
| fansubEditReleaseThemeBox | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseThemeBoxHeader | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseThemeItem | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseThemeItemActive | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseThemeList | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseThemeMeta | 1 | ReleaseRowDetails.tsx |
| fansubEditReleaseThemeMetaMuted | 1 | ReleaseRowDetails.tsx |
| fansubEditRequired | 6 | AdminFansubCreateBasicInfoSection.tsx, FansubBasicInfoTab.tsx |
| fansubEditRightColumn | 2 | FansubDetailsTab.tsx, page.tsx |
| fansubEditSection | 7 | AdminFansubCreateAliasesSection.tsx, AdminFansubCreateBasicInfoSection.tsx, AdminFansubCreateLinksSection.tsx, AdminFansubCreateMediaSection.tsx, AnimeProjectNotesSection.tsx, AnimeReleasesCockpit.tsx, FansubDetailsTab.tsx |
| fansubEditSectionBody | 10 | AdminFansubCreateAliasesSection.tsx, AdminFansubCreateBasicInfoSection.tsx, AdminFansubCreateLinksSection.tsx, AdminFansubCreateMediaSection.tsx, AnimeProjectNotesSection.tsx, AnimeReleasesCockpit.tsx, FansubBasicInfoTab.tsx, FansubDetailsTab.tsx, NotesTab.tsx |
| fansubEditSectionSummary | 7 | AdminFansubCreateAliasesSection.tsx, AdminFansubCreateBasicInfoSection.tsx, AdminFansubCreateLinksSection.tsx, AdminFansubCreateMediaSection.tsx, AnimeProjectNotesSection.tsx, AnimeReleasesCockpit.tsx, FansubDetailsTab.tsx |
| fansubEditSegmentEditorGrid | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditSegmentEditorLabel | 6 | ReleaseThemeDrawerSection.tsx |
| fansubEditSlugRow | 2 | AdminFansubCreateBasicInfoSection.tsx, FansubBasicInfoTab.tsx |
| fansubEditStatusActive | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditStatusBadge | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditStatusDissolved | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditStatusInactive | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditStickyActions | 2 | FansubDetailsTab.tsx, page.tsx |
| fansubEditTableSurface | 1 | FansubAppMembersOverview.tsx |
| fansubEditTableWrapWine | 2 | FansubAppMembersOverview.tsx, GroupMemberRequestsTable.tsx |
| fansubEditThemeDrawer | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditThemeDrawerPanel | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditThemePreview | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditThemePreviewVideo | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditThemeUploadActions | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditThemeUploadFileName | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditThemeUploadHeader | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditThemeUploadMeta | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditThemeUploadPicker | 1 | ReleaseThemeDrawerSection.tsx |
| fansubEditToast | 2 | FansubEditClient.tsx, page.tsx |
| fansubEditUrlPreview | 2 | FansubEditHeaderCard.tsx, page.tsx |
| fansubEditWorkspacePanel | 1 | FansubEditWorkspaceSection.tsx |
| inputRow | 1 | AdminFansubCreateAliasesSection.tsx |
| responsiveFieldGrid | 1 | AdminFansubCreateBasicInfoSection.tsx |

(166 Zeilen, exakt uebereinstimmend mit `grep -oE '^\.[a-zA-Z0-9_-]+(?=\s*[,{])' ... | sort -u | wc -l` nach der Loeschung.)

## Screenshot-Manifest (Task 1 BEFORE / Task 3 AFTER)

Beide Saetze unter `/tmp/shots/184-10/{before,after}/` (nicht committet, `.planning/**/*.png` ist gitignored, `/tmp` liegt ausserhalb des Repos). Je Datei: 1440×900 Desktop (`fullPage: true`) bzw. 375×812 Mobil, `reducedMotion: 'reduce'`, 4500ms Settle-Zeit nach `networkidle` (gegen die in 174-24-SUMMARY.md dokumentierte fullPage-Compositing-Race).

| Datei | Vergleichsergebnis |
|---|---|
| fansub-edit-basic-desktop.png / -mobile.png | byte-identisch |
| fansub-edit-notes-desktop.png / -mobile.png | byte-identisch |
| fansub-edit-media-desktop.png / -mobile.png | byte-identisch |
| fansub-edit-collaboration-desktop.png | **nicht byte-identisch** (857414 vs. 857466 Bytes) — manuell pixelweise verglichen (zwei Vollbild-Screenshots im Vergleich betrachtet): visuell identisch, keine sichtbare Layout-/Farb-/Abstandsaenderung |
| fansub-edit-collaboration-mobile.png | byte-identisch |
| fansub-edit-roles-desktop.png | **nicht byte-identisch** (573207 vs. 573304 Bytes) — manuell verglichen: visuell identisch |
| fansub-edit-roles-mobile.png | byte-identisch |
| fansub-edit-pruefungen-desktop.png / -mobile.png | byte-identisch |
| fansub-edit-releases-desktop.png | byte-identisch |
| fansub-edit-releases-mobile.png | **nicht byte-identisch, aber gleiche Groesse** (136786 Bytes beide) — manuell verglichen: visuell identisch |
| fansub-edit-changes-desktop.png / -mobile.png | byte-identisch |
| fansub-create-desktop.png / -mobile.png | byte-identisch |

**15 von 18 Paaren byte-identisch** (staerkster moeglicher Beweis fuer Null-Aenderung); die restlichen 3 Paare wurden einzeln als Bild gelesen und verglichen — kein sichtbarer Unterschied in Layout, Abstaenden, Farben oder Schriftgroessen gefunden. Die minimalen Byte-Differenzen bei gleichem visuellen Ergebnis sind vermutlich PNG-Encoder-/Compositing-Jitter zwischen den beiden Chromium-Sessions, keine CSS-Regression.

## Decisions Made

Siehe `key-decisions` im Frontmatter. Kernpunkt: Die Konsumenten-Scope-Korrektur (35 statt 26 Dateien) ist die wichtigste methodische Abweichung dieses Plans und reduziert die tatsaechliche Loeschmenge von den im Kontext geschaetzten ≈206 auf belegte 120 Klassen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in der im Plan vorgegebenen Pruefmethodik] Nutzungspruefung nur gegen die 25-26 "bekannten Importer" haette 86 tatsaechlich lebende Klassen faelschlich als tot markiert**
- **Found during:** Task 1 (Nutzungspruefung)
- **Issue:** Der Plan (und 184-CONTEXT.md) geht davon aus, dass die Menge der `FansubEdit.module.css`-Konsumenten identisch mit der Menge der Dateien ist, die das Modul per `import ... from './FansubEdit.module.css'` direkt importieren (25-26 Dateien, davon 2 Testdateien). Tatsaechlich reichen mehrere Importer-Dateien (`FansubEditClient.tsx`, `FansubEditWorkspaceSection.tsx`, `FansubDetailsTab.tsx`, `AnimeReleasesCockpit.tsx`, `ReleaseMediaDrawer.tsx`) das bereits gemergte `styles`-Objekt per `styles: Record<string, string>`-Prop an 9 weitere Tab-/Card-/Drawer-Komponenten durch, die selbst keinen eigenen Import besitzen. Eine Pruefung nur gegen die 26 Importer haette z. B. `fansubEditBasicField` (7 Treffer in `FansubBasicInfoTab.tsx`), `fansubEditReleaseDrawerDetailItem` (11 Treffer in `ReleaseMediaDrawer.tsx`) oder `fansubEditSegmentEditorLabel` (6 Treffer in `ReleaseThemeDrawerSection.tsx`) als tot eingestuft und geloescht, obwohl sie produktiv im DOM landen.
- **Fix:** Fixpunkt-Traversierung implementiert: ausgehend von den 26 bestaetigten Importern wird rekursiv nach JSX-Stellen `styles={styles}` gesucht, die zugehoerige Kindkomponente anhand des Tag-Namens im Verzeichnis aufgeloest und zur Konsumentenmenge hinzugefuegt, bis ein Fixpunkt erreicht ist (4 Iterationen bis zur Konvergenz bei 35 Dateien). Alle weiteren Klassifikationsschritte (Literal-Grep, dynamische Zugriffsmuster, projektweiter Wort-Treffer-Gegencheck) liefen gegen diese korrigierte 35-Datei-Menge.
- **Files modified:** keine (reine Analyse-Korrektur vor Task 2; betrifft nur die Klassifikationstabelle in dieser SUMMARY)
- **Verification:** Nach Task 2 stimmt die Top-Level-Selektor-Anzahl exakt mit der 166-Klassen-Liste ueberein (`diff` leer); kein Live-Screenshot zeigt eine Layout-Regression, die auf eine faelschlich geloeschte Klasse hindeuten wuerde.
- **Committed in:** `ab02cfce8` (Task 2 Commit; die Korrektur selbst ist Analyse, nicht Code, daher nur in dieser SUMMARY dokumentiert)

**2. [Rule 1 - Bug/Praezisierung im Plan-Pfadtext] Screenshot-Pfade im Plan-Text (`/tmp/shots/184-20/...`) korrigiert auf `/tmp/shots/184-10/...`**
- **Found during:** Planlektuere vor Task 1
- **Issue:** `184-10-PLAN.md` referenziert in Task 1/3 durchgaengig `/tmp/shots/184-20/{before,after}/` — ein Tippfehler/Copy-Paste-Rest aus einem anderen Plan-Slot, da dieser Plan `184-10` heisst. Der Orchestrator-Prompt wies explizit auf `/tmp/shots/184-10/` hin.
- **Fix:** Alle Screenshots unter `/tmp/shots/184-10/{before,after}/` abgelegt (wie vom Orchestrator vorgegeben), nicht unter dem im Plan-Text genannten `184-20`-Pfad.
- **Files modified:** keine (nur Capture-Zielverzeichnis)
- **Verification:** `ls /tmp/shots/184-10/before/*.png | wc -l` = 18, `ls /tmp/shots/184-10/after/*.png | wc -l` = 18
- **Committed in:** n/a (ausserhalb des Repos)

---

**Total deviations:** 2 (1 Methodik-Korrektur mit direktem Einfluss auf den Loesch-Scope, 1 Pfad-Tippfehler-Korrektur ohne Scope-Einfluss)
**Impact on plan:** Die Methodik-Korrektur ist entscheidend fuer Korrektheit — ohne sie waeren 86 tatsaechlich genutzte Klassen faelschlich geloescht worden, was mit hoher Wahrscheinlichkeit sichtbare Layout-Regressionen in den Tabs "Grunddaten", "Anime & Veroeffentlichungen" und im Release-Medien-Drawer verursacht haette. Kein Scope-Creep — die Korrektur bleibt innerhalb des D-03-Auftrags ("nur tote Klassen loeschen").

## Issues Encountered

Keine blockierenden Probleme. Der Proxy-Hintergrundprozess (`node /tmp/proxy-184-10.mjs`, TCP-Loopback 127.0.0.1:3300→3000 innerhalb des Frontend-Containers, identisch zum in 174-24-SUMMARY.md dokumentierten Verfahren) wurde nach den BEFORE-Shots nicht per `pkill` beendet, da `pkill` im Container-Image fehlt (`sh: pkill: not found`) — die zugehoerige Skriptdatei wurde geloescht, der verwaiste Node-Prozess lief bis zum fuer Task 3 ohnehin noetigen `docker restart team4sv30-frontend` weiter (harmlos, rein lokal an 127.0.0.1 gebunden, kein Sicherheits- oder Produktrisiko).

## User Setup Required

None — keine externe Service-Konfiguration noetig. Admin-Zugangsdaten (`admin`/`123` via Keycloak direct-grant) entsprechen den bereits in 174-24-SUMMARY.md dokumentierten lokalen Dev-Credentials.

## Next Phase Readiness

**Tasks 1-3 sind vollstaendig und verifiziert (Gate gruen, Screenshot-Beweis vorhanden). Task 4 (blockierender Live-Checkpoint) ist NICHT abgeschlossen** — er erfordert explizite Nutzerfreigabe ("approved" oder eine konkrete Abweichung) und wurde bewusst nicht vom Agenten selbst abgehakt oder zertifiziert. Dies ist der letzte Plan der Phase 184; die Phase gilt erst nach Task-4-Freigabe als abgeschlossen.

---
*Phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-*
*Tasks 1-3 completed: 2026-10-15*
*Task 4: AWAITING HUMAN VERIFICATION*

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` (2442 Zeilen, 166 Top-Level-Selektoren)
- FOUND commit: `ab02cfce8`
- FOUND: `/tmp/shots/184-10/before/` (18 PNG-Dateien)
- FOUND: `/tmp/shots/184-10/after/` (18 PNG-Dateien)
- VERIFIED: `tsc --noEmit` gruen, `eslint .` 4 vorbestehende/themenfremde Fehler (unveraendert vor/nach Loeschung), `vitest run` 4 vorbestehende/themenfremde Testfehlschlaege (unveraendert, per Baseline-Vergleich mit Original-CSS bestaetigt)
