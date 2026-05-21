# UI Inventory

## Zweck

Dieses Inventar macht die wiederkehrenden UI-Muster des aktuellen Frontends sichtbar, bevor eine globale UI-System-Basis gebaut und später echte Seiten migriert werden.

Die Bewertung trennt bewusst:

- generische UI-Bausteine
- fachlich/domain-spezifische Komponenten
- lokale CSS-Duplikate
- offene Design- und Migrationsfragen

## Button

- Fundorte im Code:
  - `frontend/src/app/admin/admin.module.css` mit `.button`, `.buttonSecondary`, `.buttonDanger`
  - `frontend/src/app/admin/profile/page.module.css` nutzt globale Admin-Buttonklassen plus lokale Pills
  - `frontend/src/app/admin/anime/components/AnimeEditPage/*.tsx` referenzieren häufig `styles.buttonPrimary`, `styles.buttonSecondary`
  - `frontend/src/components/admin/MediaUpload.tsx` mit `buttonPrimary`, `buttonSecondary`, `buttonDanger`
- Aktuelle Komponenten:
  - Native `<button>`
  - Native `<a>` und `Link` mit Button-Klassen
- CSS-Seams:
  - `frontend/src/app/admin/admin.module.css`
  - `frontend/src/components/admin/MediaUpload.module.css`
  - diverse Feature-`*.module.css` mit lokalen Action-Buttons
- Erkannte Duplikate:
  - Primär-, Sekundär- und Danger-Buttons werden mehrfach neu definiert
  - unterschiedliche Höhen zwischen Admin-Formen, Merge-Wizard und Upload-Komponenten
- Visuelle Unterschiede:
  - mal stärker eingefärbt, mal fast neutral
  - Radius schwankt zwischen `var(--radius-sm)`, `12px` und `999px`
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - nein
- Empfohlene globale Komponente:
  - `Button`
- Benötigte Varianten:
  - `primary`
  - `secondary`
  - `ghost`
  - `subtle`
  - `danger`
  - `icon`
  - `loading`
  - `disabled`
- Offene Designfragen:
  - Sollen CTA-Buttons im Admin generell gefüllt oder eher subtiler geführt werden?
  - Braucht es langfristig eine Link-Variante oder reicht Button plus Page-spezifische `Link`-Hülle?

## Card

- Fundorte im Code:
  - `frontend/src/app/admin/admin.module.css` mit `.panel`
  - `frontend/src/app/admin/profile/page.module.css` mit `.metaCard`, `.listItem`
  - `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.module.css` mit `.infoPanel`, `.assetCard`, `.choiceCard`
  - `frontend/src/components/admin/MediaUpload.module.css` mit `.card`
- Aktuelle Komponenten:
  - freie `<section>`-, `<div>`- und `<article>`-Blöcke
- CSS-Seams:
  - `admin.module.css`
  - `page.module.css` je Feature
  - `MediaUpload.module.css`
- Erkannte Duplikate:
  - Standard-Panels, Meta-Karten, Auswahlkarten und Listen-Items nutzen ähnliche Rahmen, Hintergründe und Schatten
- Visuelle Unterschiede:
  - einige Cards sehr flach
  - andere mit deutlichem Hover und stärkerem Verlauf
  - Radien zwischen `12px`, `16px`, `20px`
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - nein, solange nur Hülle
- Empfohlene globale Komponente:
  - `Card`
- Benötigte Varianten:
  - `default`
  - `elevated`
  - `interactive`
  - `compact`
  - `section`
  - `flat`
- Offene Designfragen:
  - Wie stark darf Hover bei interaktiven Cards ausfallen?
  - Soll `section` einen dezenten Akzent-Hintergrund bekommen oder völlig neutral bleiben?

## PageHeader

- Fundorte im Code:
  - `frontend/src/app/admin/page.tsx`
  - `frontend/src/app/admin/profile/page.tsx`
  - `frontend/src/app/admin/anime/components/AnimeEditPage/SharedAnimeEditorWorkspace.tsx`
- Aktuelle Komponenten:
  - freie `<header>`-Blöcke mit Titel, Subtitle, teils zusätzlicher Navigation
- CSS-Seams:
  - `admin.module.css` mit `.header`, `.title`, `.subtitle`
  - `create/page.module.css` mit `pageHeader`, `pageTitle`, `pageIntro`
- Erkannte Duplikate:
  - wiederkehrende Titel-/Subtitel-Strukturen ohne gemeinsame Komponente
- Visuelle Unterschiede:
  - teils sehr knapp
  - teils bereits als gestaffelte Arbeitsfläche
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - nein
- Empfohlene globale Komponente:
  - `PageHeader`
- Benötigte Varianten:
  - default
  - withActions
  - withBreadcrumbs
- Offene Designfragen:
  - Sollen Breadcrumbs direkt integriert werden oder als separater Slot bleiben?

## SectionHeader

- Fundorte im Code:
  - `frontend/src/app/admin/anime/components/AnimeEditPage/*`
  - `frontend/src/app/admin/anime/create/*`
  - `frontend/src/app/admin/fansubs/[id]/edit/*`
- Aktuelle Komponenten:
  - freie Kombination aus `h2`, Meta-Text, Badge, Aktion
- CSS-Seams:
  - `admin.module.css` mit `sectionTitle`, `sectionMeta`
  - diverse lokale `summaryTitle`, `panelHeader`, `sectionHeading`
- Erkannte Duplikate:
  - überall ähnliche Abschnittsköpfe mit leicht abweichender Typografie und Actions
- Visuelle Unterschiede:
  - manche Sektionen als Summary im `<details>`
  - manche offen in Card-Köpfen
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - nein
- Empfohlene globale Komponente:
  - `SectionHeader`
- Benötigte Varianten:
  - default
  - withActions
  - compact
- Offene Designfragen:
  - Soll `SectionHeader` optional direkt mit Badge/Status-Slot ausgeliefert werden?

## Tables

- Fundorte im Code:
  - `frontend/src/components/anime/AnimeGrid.tsx`
  - `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeTable.tsx`
  - `frontend/src/components/episodes/EpisodesOverview/*`
- Aktuelle Komponenten:
  - echte `<table>` und listenartige Pseudo-Tabellen
- CSS-Seams:
  - `AnimeBrowser.module.css`
  - `EpisodeManager.module.css`
  - `EpisodesOverview.module.css`
- Erkannte Duplikate:
  - Header-Zeilen, Tabellenaktionen und Row-Hover werden lokal neu gebaut
- Visuelle Unterschiede:
  - mal sehr dicht
  - mal card-artig statt tabellarisch
- Global/generisch:
  - ja, als Basis-Hülle
- Fachlich/domain-spezifisch:
  - konkrete Spalten und Cell-Inhalte ja
- Empfohlene globale Komponente:
  - `Table`
- Benötigte Varianten:
  - `default`
  - `compact`
  - `selectable`
  - `withActions`
  - `empty`
  - `loading`
- 48A/48B-Richtung:
  - lange Release- oder Episodenlisten nutzen bevorzugt einen begrenzten Scrollbereich
  - Tabellenkopf bleibt sticky
  - Einträge werden zunächst inkrementell sichtbar gemacht statt sofort vollständig ausgerollt
- Offene Designfragen:
  - Wann ist eine echte Tabelle sinnvoll und wann bleibt eine Card-Liste besser?

## Detailpanel / Timeline

- Fundorte im Code:
  - `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` mit Timeline-Vorschau in aufgeklappten Release-Zeilen
  - `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
  - `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx`
- Aktuelle Komponenten:
  - seitenlokales `Detailpanel` unter Tabellenzeilen
  - seitenlokale Timeline-/Segmentspuren
- CSS-Seams:
  - `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css`
  - `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css`
- Erkannte Duplikate:
  - ähnliche Timeline- und Segmentdarstellungen an mehreren Stellen mit unterschiedlicher Form-, Farb- und Abstandslogik
  - Detailpanel-Optik nicht zentral vereinheitlicht
- Visuelle Unterschiede:
  - Fansub-Edit arbeitet mit Timeline-Legende und Release-bezogener Vorschau
  - Episode-Version-Editor nutzt ähnliche Segmentspuren, aber andere Geometrie und Farbigkeit
- Global/generisch:
  - ja, als wiederkehrendes UI-Muster für aufgeklappte Tabellen-Details und Segmentvorschauen
- Fachlich/domain-spezifisch:
  - konkrete Segmentdaten und Release-Logik ja
  - die Hülle und Timeline-Darstellung nein
- Empfohlene globale Komponente:
  - mittelfristig `DetailPanel`
  - mittelfristig `SegmentTimeline` oder `TimelinePreview`
- Benötigte Varianten:
  - `detailpanel-default`
  - `timeline-preview`
  - `timeline-selected`
  - `timeline-missing`
- Offene Designfragen:
  - Wie stark sollen Timeline-Segmente wie Buttons wirken, wenn sie gleichzeitig Klickziele sind?
  - Wann reicht eine gemeinsame Spur und wann braucht es mehrere Lanes?

## Lists

- Fundorte im Code:
  - `frontend/src/app/admin/profile/page.tsx`
  - `frontend/src/app/admin/fansubs/merge/*`
  - `frontend/src/components/comments/CommentSection.tsx`
- Aktuelle Komponenten:
  - `<ul>` / `<li>` und cardartige Listenblöcke
- CSS-Seams:
  - `page.module.css` mit `.listStack`, `.listItem`
  - `MergeWizard.module.css` mit `.mergeGroupList`, `.mergeGroupCard`
- Erkannte Duplikate:
  - Listen mit Sekundäraktionen und Statuschips
- Visuelle Unterschiede:
  - mal offen mit Border-Separatoren
  - mal als eigenständige Mini-Cards
- Global/generisch:
  - teilweise
- Fachlich/domain-spezifisch:
  - oft erst durch den Inhalt
- Empfohlene globale Komponente:
  - vorerst `Card` + `SectionHeader` + list utility, später evtl. `List`
- Benötigte Varianten:
  - simple
  - interactive
  - withSecondaryAction
- Offene Designfragen:
  - Reicht eine generische Listenstruktur oder braucht es wirklich eine `List`-Komponente?

## Badges / Status Chips

- Fundorte im Code:
  - `frontend/src/components/anime/StatusBadge.tsx`
  - `frontend/src/app/admin/profile/page.module.css` mit `.pill`
  - `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.module.css` mit `.statusPill`
  - `frontend/src/app/admin/fansubs/merge/MergeWizard.module.css` mit `.mergeMetaBadge`
- Aktuelle Komponenten:
  - `StatusBadge.tsx`
  - sonst freie `span`-Badges
- CSS-Seams:
  - `StatusBadge.module.css`
  - lokale `pill`-/`badge`-Klassen
- Erkannte Duplikate:
  - Statuschips, Meta-Pills und Count-Badges wiederholen sich stark
- Visuelle Unterschiede:
  - unterschiedliche Schriftgrößen
  - teils komplett gefüllt, teils nur outlined
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - `StatusBadge` ist fachlich, weil Anime-Status direkt kodiert ist
- Empfohlene globale Komponente:
  - `Badge`
- Benötigte Varianten:
  - `neutral`
  - `success`
  - `warning`
  - `danger`
  - `info`
  - `muted`
- Offene Designfragen:
  - Soll es später zusätzlich eine klare Semantik-Schicht für Status-Mapping geben?

## Tabs

- Fundorte im Code:
  - `frontend/src/components/fansubs/FansubProfileTabs.tsx`
  - `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx`
- Aktuelle Komponenten:
  - domänenspezifische Tabs mit lokalem State
- CSS-Seams:
  - `FansubProfileTabs.module.css`
  - Feature-spezifische lokale Module
- Erkannte Duplikate:
  - Tab-Leisten werden lokal neu gebaut
- Visuelle Unterschiede:
  - Public-Fansub-Tabs vs. Admin-Unterteilungen
- Global/generisch:
  - ja, die Tab-Hülle
- Fachlich/domain-spezifisch:
  - konkrete Panel-Inhalte ja
- Empfohlene globale Komponente:
  - `Tabs`
- Benötigte Varianten:
  - default
  - withBadge
  - compact
- Offene Designfragen:
  - Reicht ein einfacher State-basierter Tab-Container oder braucht es perspektivisch URL-Sync?

## Drawers

- Fundorte im Code:
  - `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx`
  - Release-/Media-Edit-Flows der letzten Phasen
- Aktuelle Komponenten:
  - globale `Drawer`-Hülle vorhanden
  - Inhalte bisher teils noch feature-spezifisch komponiert
- CSS-Seams:
  - globale Drawer-Hülle in `frontend/src/components/ui/ui.module.css`
  - Inhaltslayout teils noch in Feature-Modulen
- Erkannte Duplikate:
  - früher Overlay-Hülle, Header, Footer-Actions und Close-Verhalten
  - Readonly-Felder wurden lokal wie Formulare gebaut, obwohl nur Ansicht gemeint war
  - Medien-Zusammenfassungen wurden leicht cardig statt als ruhige Info-Struktur gebaut
- Visuelle Unterschiede:
  - stark featureabhängig gewesen
  - in 48A jetzt klarere Zielrichtung für Ansichts-Drawer festgezogen
- Global/generisch:
  - ja, als Hülle
- Fachlich/domain-spezifisch:
  - konkrete Inhalte ja
- Empfohlene globale Komponente:
  - `Drawer`
- Benötigte Varianten:
  - default
  - wide
  - withTabs
- 48A-Richtung:
  - Tabs im Drawer nutzen normale globale Button-Größen statt hoher Kachel-Reiter
  - `Details` zeigt kompakte Label/Wert-Zeilen statt Readonly-Formfelder
  - redundante Kontext-Cards im Ansichtsmodus sollen vermieden werden
  - Medien-Zusammenfassungen nutzen lieber eine leichte Tabellen-/Key-Value-Struktur statt Mini-Cards
  - reine Ansichts-Drawer enden mit einer einfachen `Schließen`-Aktion
- Offene Designfragen:
  - Soll der Drawer immer rechts hereinschieben oder später auch bottom-sheet mobil?

## Modals

- Fundorte im Code:
  - keine sichtbare globale Modal-Komponente gefunden
  - einzelne Dialog-/Overlay-Muster verstreut
- Aktuelle Komponenten:
  - vor allem page-lokale oder flow-lokale Lösungen
- CSS-Seams:
  - verstreut
- Erkannte Duplikate:
  - Bestätigungs- oder Review-Overlays sind nicht zentralisiert
- Visuelle Unterschiede:
  - derzeit kaum kanonische Linie
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - nein
- Empfohlene globale Komponente:
  - `Modal`
- Benötigte Varianten:
  - default
  - destructiveConfirm
  - large
- Offene Designfragen:
  - Muss Modal bereits jetzt Portals/Fokusfalle bekommen oder reicht für 48A eine einfache generische Hülle?

## Forms / FormFields

- Fundorte im Code:
  - `frontend/src/app/admin/profile/page.tsx`
  - `frontend/src/app/admin/anime/create/*`
  - `frontend/src/app/admin/anime/components/AnimeEditPage/*`
  - `frontend/src/components/comments/CommentForm.tsx`
- Aktuelle Komponenten:
  - Feldgruppen als freie `div.field`, `label`, `input`
- CSS-Seams:
  - `admin.module.css` mit `.field`
  - `AnimeEditWorkspace.module.css` mit `.field`
  - weitere page-lokale Form-CSS
- Erkannte Duplikate:
  - Label, Hint, Error, Required und Disabled-State werden ständig neu zusammengesetzt
- Visuelle Unterschiede:
  - Inkonsistente Abstände und Error-Presentation
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - nein
- Empfohlene globale Komponente:
  - `FormField`
- Benötigte Varianten:
  - `default`
  - `required`
  - `error`
  - `hint`
  - `disabled`
- Offene Designfragen:
  - Sollen Helper/Error-Texte immer unter dem Feld stehen oder optional inline?

## Inputs / Selects / Textareas

- Fundorte im Code:
  - `frontend/src/app/admin/admin.module.css` globale Admin-Control-Seam
  - `frontend/src/app/admin/anime/components/AnimeEditPage/*.tsx`
  - `frontend/src/components/comments/CommentForm.tsx`
- Aktuelle Komponenten:
  - native Controls mit CSS-Klassen
- CSS-Seams:
  - `admin.module.css`
  - lokale Module mit leicht abweichenden Borders und Paddings
- Erkannte Duplikate:
  - gleiche Feldtypen mit leicht verschiedenen Höhen und Borderfarben
- Visuelle Unterschiede:
  - Some controls are flatter, others heavier with gradients
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - nein
- Empfohlene globale Komponenten:
  - `Input`
  - `Select`
  - `Textarea`
- Benötigte Varianten:
  - default
  - invalid
  - disabled
  - dense
- Offene Designfragen:
  - Braucht `Select` später einen einheitlichen Custom-Chevron oder bleibt es nativ?

## Checkboxes / Radio Buttons

- Fundorte im Code:
  - `AnimeEditWorkspace.module.css` mit `.protectionOption input`, `.checkItem`
  - `admin.module.css` mit `.checkboxLabel`
- Aktuelle Komponenten:
  - native Inputs in lokalen Hüllen
- CSS-Seams:
  - `admin.module.css`
  - `AnimeEditWorkspace.module.css`
- Erkannte Duplikate:
  - Checkbox-/Radio-Hüllen mit unterschiedlichen Layouts
- Visuelle Unterschiede:
  - teils simple Inline-Checkbox
  - teils volle Option-Cards
- Global/generisch:
  - teilweise
- Fachlich/domain-spezifisch:
  - Card-artige Auswahloptionen oft nein, aber layoutabhängig
- Empfohlene globale Komponente:
  - vorerst keine eigene Primitive in 48A; über `FormField` + native Controls abdecken
- Benötigte Varianten:
  - inline
  - option-card
- Offene Designfragen:
  - Lohnt in 48A schon eine `ChoiceCard`-Primitive oder erst nach echten Migrationsfällen?

## Toolbars / ActionBars

- Fundorte im Code:
  - `RichTextEditor.tsx` mit Toolbar
  - `AnimeEditWorkspace.module.css` mit `panelHeader`, `assetCardHeader`, `saveBar`
  - verschiedene Admin-Seiten mit `.actions`
- Aktuelle Komponenten:
  - freie Flex-Container
- CSS-Seams:
  - `RichTextEditor.module.css`
  - `admin.module.css`
  - `AnimeEditWorkspace.module.css`
- Erkannte Duplikate:
  - Header-Actions, Filter-Zeilen und Save-Bars nutzen ähnliche horizontale Cluster
- Visuelle Unterschiede:
  - mal rein funktional
  - mal sticky
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - Save-State-Inhalte oder Editor-Aktionen ja
- Empfohlene globale Komponenten:
  - `Toolbar`
  - `ActionBar`
- Benötigte Varianten:
  - default
  - compact
  - sticky-ready shell
- Offene Designfragen:
  - Soll `ActionBar` später eine sticky Variante direkt kennen oder nur die Layout-Hülle?

## Empty / Loading / Error States

- Fundorte im Code:
  - `components/episodes/EpisodesOverview.tsx`
  - `AnimeEditPage/*` mit `emptyState`, `errorBox`, `statusNote`
  - `admin/profile/page.tsx` mit Erfolg/Fehler-Panels
- Aktuelle Komponenten:
  - meist Inline-Absätze oder lokale Hinweisboxen
- CSS-Seams:
  - `admin.module.css` mit `errorBox`, `successBox`
  - viele lokale `.emptyState`, `.helper`, `.statusNote`
- Erkannte Duplikate:
  - leere Zustände und Fehlerboxen werden oft völlig individuell formuliert
- Visuelle Unterschiede:
  - von nacktem Text bis zur farbigen Infobox
- Global/generisch:
  - ja
- Fachlich/domain-spezifisch:
  - nein
- Empfohlene globale Komponenten:
  - `EmptyState`
  - `LoadingState`
  - `ErrorState`
- Benötigte Varianten:
  - `default`
  - `compact`
  - `withAction`
- Offene Designfragen:
  - Braucht es zusätzlich eine neutrale `InfoState` oder reicht Badge + Card?

## MediaGrid

- Fundorte im Code:
  - `AnimeEditWorkspace.module.css` mit `assetGallery`
  - `MediaUpload.tsx`
  - Release-Media-Bereiche der Phase 36 bis 38
- Aktuelle Komponenten:
  - fachliche Asset-/Media-Galerien
- CSS-Seams:
  - `AnimeEditWorkspace.module.css`
  - `ReleaseVersionMediaGallery.module.css`
  - `MediaUpload.module.css`
- Erkannte Duplikate:
  - Thumbnail-Grids und Meta-Blöcke wiederholen sich
- Visuelle Unterschiede:
  - public vs. admin preview patterns
- Global/generisch:
  - teilweise
- Fachlich/domain-spezifisch:
  - meist ja
- Empfohlene globale Komponente:
  - keine reine `MediaGrid`-Komponente in 48A; erst `Card`, `Toolbar`, `EmptyState` und Badge als Basis
- Benötigte Varianten:
  - thumbnail-grid
  - list-grid
- Offene Designfragen:
  - Welche Teile sind wirklich generisch genug, um später extrahiert zu werden?

## FilterBar / SearchBox

- Fundorte im Code:
  - `AnimeBrowserFilters.tsx`
  - Merge-Filter in `MergeWizard.module.css`
  - diverse Admin-Übersichten mit Action-Reihen
- Aktuelle Komponenten:
  - lokale Input- und Select-Zeilen
- CSS-Seams:
  - `AnimeBrowser.module.css`
  - `MergeWizard.module.css`
- Erkannte Duplikate:
  - Suchfelder plus Status-/Typ-Filter
- Visuelle Unterschiede:
  - Inline, Grid, Toolbar-artig
- Global/generisch:
  - ja, als Hülle
- Fachlich/domain-spezifisch:
  - Filteroptionen ja
- Empfohlene globale Komponenten:
  - `Toolbar` + `Input` + `Select`
- Benötigte Varianten:
  - search-first
  - stacked-mobile
- Offene Designfragen:
  - Braucht es später eine kleine `SearchBox`-Komponente mit Icon?

## Pagination

- Fundorte im Code:
  - `frontend/src/components/anime/Pagination.tsx`
- Aktuelle Komponenten:
  - spezifische Link-basierte Paginierung für `/anime`
- CSS-Seams:
  - `Pagination.module.css`
- Erkannte Duplikate:
  - aktuell nur eine klare Pagination-Komponente sichtbar
- Visuelle Unterschiede:
  - domänenspezifisch über Query-String-Bildung
- Global/generisch:
  - ja, als generische Hülle
- Fachlich/domain-spezifisch:
  - bestehende Komponente ja, wegen URL-/Query-Logik
- Empfohlene globale Komponente:
  - `Pagination`
- Benötigte Varianten:
  - default
  - compact
  - withSummary
- Offene Designfragen:
  - Soll die globale Variante state-basiert, link-basiert oder beides können?

## Breadcrumbs / Navigation / Sidebar

- Fundorte im Code:
  - `frontend/src/components/navigation/Breadcrumbs.tsx`
  - `frontend/src/components/anime/AnimeEdgeNavigation.tsx`
  - `frontend/src/components/groups/GroupEdgeNavigation.tsx`
- Aktuelle Komponenten:
  - `Breadcrumbs`
  - domain-spezifische Edge-Navigation
- CSS-Seams:
  - `Breadcrumbs.module.css`
  - `AnimeEdgeNavigation.module.css`
  - `GroupEdgeNavigation.module.css`
- Erkannte Duplikate:
  - Breadcrumbs bereits separat
  - Edge-Navigation jeweils fachlich
- Visuelle Unterschiede:
  - public-oriented statt admin-oriented
- Global/generisch:
  - Breadcrumbs ja
- Fachlich/domain-spezifisch:
  - Edge-Navigation ja
- Empfohlene globale Komponenten:
  - `PageHeader` Breadcrumb-Slot
  - evtl. später `Breadcrumbs` konsolidieren
- Benötigte Varianten:
  - simple
  - linked
- Offene Designfragen:
  - Soll `Breadcrumbs` im UI-Layer aufgehen oder getrennt im Navigation-Bereich bleiben?

## DetailPanels / InfoPanels / StatsCards

- Fundorte im Code:
  - `AnimeEditWorkspace.module.css` mit `infoPanel`
  - `profile/page.module.css` mit `metaCard`
  - Merge-/Anime-Overview-Felder
- Aktuelle Komponenten:
  - freie Cards mit strukturiertem Inhalt
- CSS-Seams:
  - `AnimeEditWorkspace.module.css`
  - `page.module.css`
- Erkannte Duplikate:
  - Meta-Info-Cards mit Titel + Value + Hint
- Visuelle Unterschiede:
  - mal neutral, mal akzentuiert
- Global/generisch:
  - ja, meist über `Card` plus `SectionHeader`
- Fachlich/domain-spezifisch:
  - konkrete Inhalte ja
- Empfohlene globale Komponente:
  - kein separates Primitive in 48A; über `Card`-Patterns lösen
- Benötigte Varianten:
  - metric
  - info
  - summary
- Offene Designfragen:
  - Wann wird eine `StatsCard` wirklich eigenständig genug?

## Avatar / User Display

- Fundorte im Code:
  - `frontend/src/app/admin/profile/page.tsx`
- Aktuelle Komponenten:
  - page-lokale Avatar-Vorschau
- CSS-Seams:
  - `profile/page.module.css` mit `avatarPreview`, `avatarFallback`
- Erkannte Duplikate:
  - bislang kein globales Avatar-Muster gefunden
- Visuelle Unterschiede:
  - noch lokal
- Global/generisch:
  - perspektivisch ja
- Fachlich/domain-spezifisch:
  - nein
- Empfohlene globale Komponente:
  - vorerst kein Muss in 48A, aber Kandidat für spätere `Avatar`-Primitive
- Benötigte Varianten:
  - image
  - fallback
  - compact
- Offene Designfragen:
  - Ist Avatar für 48B relevant genug oder erst später?

## Dropdown Menus

- Fundorte im Code:
  - `AnimeEditWorkspace.module.css` mit `tagDropdown`
  - RichText-Farbmenü in `RichTextEditor.tsx`
- Aktuelle Komponenten:
  - lokale Dropdown-Listen und Toolbar-Menüs
- CSS-Seams:
  - `AnimeEditWorkspace.module.css`
  - `RichTextEditor.module.css`
- Erkannte Duplikate:
  - Overlay-Panel, Option-Liste, aktiver Zustand
- Visuelle Unterschiede:
  - texteditor-spezifisch vs. form-spezifisch
- Global/generisch:
  - vielleicht später
- Fachlich/domain-spezifisch:
  - oft ja
- Empfohlene globale Komponente:
  - in 48A noch kein Muss; zunächst `Modal`/`Drawer`/`Tabs`/`Toolbar` priorisieren
- Benötigte Varianten:
  - select-like
  - menu-like
- Offene Designfragen:
  - Reicht ein späteres Popover-Primitive statt eigenem Dropdown?

## Wichtigste lokale CSS-Duplikate

- `frontend/src/app/admin/admin.module.css` bildet bereits eine halbgenerische Admin-Basis, wird aber nicht als globale UI-Schicht verwendet
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.module.css` enthält viele generische Patterns, die fachlich neutral aussehen, aber lokal leben
- `frontend/src/app/admin/profile/page.module.css` wiederholt Card-, List-, Badge- und Avatar-Strukturen
- `frontend/src/components/admin/MediaUpload.module.css` enthält generische Button-, Card-, Empty- und Feedback-Muster
- `frontend/src/app/admin/fansubs/merge/MergeWizard.module.css` hat eigene Stepper-, Filter- und Badge-Hüllen

## Sofortige Empfehlung für 48B

Die erste echte Seitenmigration sollte nicht breit, sondern repräsentativ sein. Gute Kandidaten:

- `frontend/src/app/admin/page.tsx`
- `frontend/src/app/admin/profile/page.tsx`
- eine klar abgegrenzte Admin-Arbeitsfläche mit vielen generischen Mustern, zum Beispiel ein Teil von `AnimeEditPage` oder `AnimeBrowser`
