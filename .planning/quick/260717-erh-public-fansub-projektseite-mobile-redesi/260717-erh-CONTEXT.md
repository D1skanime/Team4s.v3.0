# Quick Task 260717-erh: Public Fansub-Projektseite Mobile Redesign Add-on - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Task Boundary

Den freigegebenen Auftrag aus
`C:/Users/admin/.codex/attachments/f7b9c238-2f18-4d45-aca1-aec4eb9408b9/pasted-text.txt`
als Anschluss an Quick Task `260717-d7i` umsetzen. Bereits erledigte Projektseiten-Arbeit
nicht neu interpretieren. Schwerpunkt dieses Add-ons ist die mobile Release-Detailseite,
die konsistente Herkunftsgruppen-Projektion fuer Release-Inhalte und der getrennte offene
Karaoke-Stream bei weiterhin geschuetzter Wiedergabe der gesamten Episode.

</domain>

<decisions>
## Implementation Decisions

### Bereits im vorherigen Quick festgelegt und beibehalten
- Pro Kara-Typ-Gruppe sind initial drei Eintraege sichtbar.
- Der Coop-Avatar-Stack zeigt drei Avatare und danach `+N`.
- Kara-Links navigieren im selben Tab.
- Numerische Folgen stehen aufsteigend vor Specials/OVAs; Specials/OVAs werden nach Veroeffentlichungsdatum sortiert.
- Featured Release wird nach `release_date` bestimmt.
- Initial werden Featured plus fuenf weitere Releases geladen, danach jeweils zehn.
- Kleine Erweiterungen des globalen UI-Systems sind erlaubt, wenn bestehende Seams nicht ausreichen; keine neuen Rohfarben oder Frameworks.

### Fallback-Key-Visual
- Prioritaet: dediziertes Anime-Backdrop, danach Anime-Banner.
- Bestehenden Blur ungefaehr 14px und vorhandenen Scrim verwenden.
- Das Anime-Logo bleibt zentriert; kein weisser oder leerer Fallback-Grund.

### Hero-Accordion
- Der Release-Hero startet bei jedem Seitenaufruf zugeklappt.
- Zugeklappt: Key-Visual, Eyebrow, Episodentitel, Credit-Zeile `Gruppe · Sub-Typ` und Detailhinweis.
- Aufgeklappt: technische Fakten und nach Herkunftsgruppe gruppierte Release-Mitwirkende.
- Keine Player-Anmutung und kein Full-Episode-Player im Hero. Eine tatsaechlich berechtigte Gesamtfolgen-Wiedergabe darf funktional erhalten bleiben, aber nicht als zentrales Hero-Element erscheinen.

### Stimmen aus dem Team
- Initial mindestens ein Text je beteiligter Gruppe, danach bis drei Texte auffuellen.
- Bei mehr als drei beteiligten Gruppen initial je Gruppe einen Text zeigen.
- Rest ueber vorhandenes Load-More-Muster nachladen.

### Karaoke-Rechte
- Karaoke-Segmente sind fuer anonyme und angemeldete Nutzer abspielbar.
- Nur die Wiedergabe der gesamten Episode bleibt durch die vorhandene Entitlement-/Capability-Logik geschuetzt.
- Der Kara-Stream benoetigt einen eigenen oeffentlichen, kurzlebigen und segmentgebundenen Grant/Relay-Vertrag; er darf keine Full-Episode-Rechte ausweiten.
- Deep-Link bleibt `?kara={id}&autoplay=1#op-ed-middle` und soll anonym funktionieren.

### Release-Seiten-Umfang
- Die Anforderungen D.1 bis D.4 und die zugehoerigen Akzeptanzkriterien sind verbindlich.
- Der widersprechende Ausschluss `Kein Redesign der eigentlichen Release-Detailseite` ist fuer diesen Add-on-Auftrag veraltet.
- Der Ausschluss `Keine Aenderung der Rechte-/Sichtbarkeitslogik` ist fuer den ausdruecklich freigegebenen oeffentlichen Kara-Stream ebenfalls veraltet.

### Herkunftsgruppe von Bildern und Texten
- `release_version_media` und `release_version_notes` erhalten additiv eine nullable `fansub_group_id` mit kanonischem FK auf `fansub_groups.id`.
- Neue Schreibvorgaenge muessen die reale Gruppe aus dem autorisierten Release-/Gruppenkontext speichern; kein Client darf eine unvalidierte Gruppe frei behaupten.
- Altbestand wird nur dann zurueckgefuehrt, wenn genau eine Gruppe zweifelsfrei aus vorhandenen Release-/Contribution-/Membership-Daten folgt.
- Uneindeutiger oder nicht belegbarer Altbestand bleibt `NULL` und erscheint in einem neutralen Bereich wie `Nicht eindeutig zugeordnet`.
- Es darf niemals die aktuell geroutete Gruppe oder die erste Release-Gruppe als stiller Fallback gespeichert oder angezeigt werden.

### UI und responsive Verhalten
- Mobile 360-420px ist das primaere Ziel; Desktop darf keine unnoetige weisse Flaeche oder Regression erhalten.
- Globale `SectionHeader`/`AccentRule`, Accordion, Avatar, Card, Badge und Button-Hierarchie wiederverwenden.
- Keine neuen Rohfarben, Icon-Sets oder Komponentenbibliotheken.
- Deutsche UI-Texte verwenden korrekte Umlaute.

</decisions>

<code_context>
## Existing Code Findings

- Der weinrote Trenner ist global ueber `SectionHeader underline` beziehungsweise `AccentRule` und `var(--ui-line)` vorhanden.
- Ein globaler `AvatarStack` und ein ReactNode-faehiges globales `Accordion` existieren aus Quick `260717-d7i`.
- Kara-Typen, Segmentversionen und der Deep-Link bestehen bereits.
- Release-Technikdaten sind bereits in `ReleaseDetailResponse` und im Public Repository vorhanden.
- Release-Mitwirkende koennen ueber `anime_contributions.fansub_group_id` verlaesslich gruppiert werden.
- Bilder und Texte haben bislang keine persistierte Herkunftsgruppe.
- `getAnimeBackdrops` liefert Backdrops, Banner und Logo-Fallback.
- Der bestehende Segmentstream verlangt aktuell einen authentifizierten Grant; die UI blendet Playback ohne Session aus.

</code_context>

<deferred>
## Deferred Ideas

- Kein allgemeines Redesign des Full-Episode-Players.
- Keine Ausweitung von Full-Episode-Entitlements.
- Keine heuristische Altbestandszuordnung ueber die aktuelle URL-Gruppe.

</deferred>
