# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current slice:** `Fansub editor polish, local UX proof, and preparation for later global rollout`

## Current State

### What Finished In This Pass
- Die Fansub-Editoren auf `/admin/fansubs/88/edit` wurden lokal modernisiert: Card-Struktur, bessere Hierarchie, abgesetzte Optionen und klarere Aktionen.
- Der gemeinsame `RichTextEditor` hat jetzt eine echte Farbpalette statt eines rohen Selects und verständliche Tabellenaktionen.
- Gruppennotizen und Mitgliedergeschichten wechseln nach dem Speichern zurück in eine Lesekarte statt offen im Editor zu bleiben.
- Die Änderungen wurden live auf `http://localhost:3000/admin/fansubs/88/edit` geprüft.

### What Works
- Gruppennotizen, Mitgliedergeschichten und Anime-Projekttexte auf der Fansub-Edit-Seite wirken strukturierter und weniger wie ein altes Standardformular.
- Die Farbauswahl im gemeinsamen Editor ist live bedienbar und zeigt aktive Farbe, Palette und Reset sauber an.
- Tabellen lassen sich nach dem Einfügen direkt um Spalten und Zeilen erweitern oder wieder entfernen.
- Nach dem Speichern springt die Fansub-Notizbearbeitung zurück in eine Lesekarte mit klarer `Bearbeiten`-Aktion.
- Die bestehenden Notiz-/Rollen-/Scope-Guards aus Phase 40/41 bleiben aktiv; es wurde kein neues Persistenzmodell eingeführt.

### What Is Open
- Der Editor wirkt noch immer zu weiß und visuell etwas zu neutral; eine weitere Designrunde ist eingeplant.
- Der aktuelle visuelle Wrapper gilt erst einmal nur für die Fansub-Edit-Seite und ist noch nicht global auf alle `RichTextEditor`-Einsätze ausgerollt.
- Bildunterstützung im Editor ist noch offen und soll später über den bestehenden globalen Media-/Upload-Flow angebunden werden.
- Cross-AI review still unavailable locally.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Active roadmap phase in practice: `41-globalen-tiptap-rich-text-editor-einfuehren`, now in a follow-through polish/rollout slice
- Current plan position: the shared editor behavior is good enough to refine visually; the fansub page serves as the proving ground before the same wrapper gets rolled out everywhere else.
- Immediate next step: one more pass on toolbar/background/contrast so the editor feels less flat, then inventory the global call sites for rollout.

## Key Decisions In Force
- AniSearch owns canonical episode identity; Jellyfin provides media evidence.
- Release-native tables remain the authoritative persistence target for imported episode/version data.
- Fansub links are authored canonically through `fansub_group_links`; fixed URL columns are compatibility projections only.
- Collaboration-member management is explicit and separate from ordinary group profile editing.
- `release_version_groups.fansub_group_id` is the runtime truth; legacy `fansubgroup_id` is cleanup-only.
- Anime and episodes stay neutral; release and group media must stay on their existing release/group seams.
- The current visual editor refresh is being proven locally on the fansub page before any broad global wrapper rollout.
- Future editor image support must reuse the existing product media/upload flow rather than inventing a TipTap-specific parallel path.
