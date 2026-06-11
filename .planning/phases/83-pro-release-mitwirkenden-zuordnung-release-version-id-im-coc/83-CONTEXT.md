# Phase 83: Pro-Release-Mitwirkenden-Zuordnung (release_version_id) im Cockpit - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Leader können Mitwirkende/Rollen **pro Release-Version** festlegen — nicht nur anime-weit. Default: die auf Projektebene (anime-weit) zugeordneten Mitwirkenden gelten automatisch für **jede** Release-Version des Projekts. Pro Release sind **Ausnahmen** („dieser User war hier nicht dabei") und **Rollen-Overrides** („der hat hier diese Rolle gemacht") möglich. Datenseitig über `anime_contributions.release_version_id` (Migration 0091) + `release_version_groups`.

UI als Pro-Release-Sicht im bestehenden Projekt-Cockpit (`/admin/fansubs/[id]/edit`, `tab=releases`), aufbauend auf Phase 82 (Cockpit, Abdeckungs-Matrix, `members.id`-Anker).

**In Scope:**
- Pro-Release-Override-Editor (Drawer) für Mitwirkende/Rollen einer einzelnen Release-Version.
- Auflösungslogik anime-weit (Projekt-Default) ↔ release-spezifischer Override.
- **Kopplung der Bearbeitungsrechte** an die gültige Contribution (Umbau `CanForReleaseVersion`).
- Konsistente Anzeige in der Notizen-/Media-Maske des jeweiligen Releases.
- Mitübernommen (gefoldete Todos): Credits-UI-Konsolidierung/Benennung-Klärung + Contribution-UI auf `@/components/ui`-Primitives.

**Out of Scope:**
- Member-zentrischer `/me`-Einstieg zum Mitwirken (Schicht B — eigene Folge-Phase).
- Collab-übergreifende Zuordnung (Mitglieder fremder Gruppen an Collab-Releases) — bewusst nicht in V1.
- Vollausbau einer Soft-Delete/Hard-Delete-Infrastruktur über das hinaus, was bereits existiert (siehe Constraint, ggf. eigene Verifikation).

</domain>

<decisions>
## Implementation Decisions

### Permission-Kopplung (sicherheitsrelevant — Kernentscheidung)
- **D-01:** Das Pro-Release-Mapping **steuert die Bearbeitungsrechte** für Notizen/Media — es ist NICHT nur Credit-/Anzeige-Information. Die Contribution (Projekt-Default oder Release-Override) ist die **alleinige Wahrheit** für Release-Edit-Rechte. Konkret muss `CanForReleaseVersion` (backend/internal/permissions/permissions.go) umgebaut werden, sodass die zutreffenden `anime_contribution_roles` (über `roleMatrix`) die erlaubten Aktionen bestimmen — heute entscheidet allein die Gruppen-Rolle (`fansub_group_member_roles`).
- **D-02:** **Auflösung „Default anime-weit, Override pro Release":** Ohne expliziten Release-Satz gelten für eine Release-Version die anime-weiten Contributions (`release_version_id IS NULL`) des Projekts — als Credit UND Recht. Existiert für eine Release-Version ein expliziter Override-Satz (`release_version_id` gesetzt), gilt **für genau dieses Release nur dieser Satz** und ersetzt den Projekt-Default. Andere Release-Versionen ohne Override bleiben beim Projekt-Default.
- **D-03:** **Absenz wirkt:** Ist eine Person im Override-Satz eines Releases nicht enthalten („war hier nicht dabei"), verliert sie die Bearbeitungsrechte **nur für dieses Release** — auch wenn der Projekt-Default oder die Gruppen-Rolle sie sonst gäben. Auf allen anderen Releases bleiben ihre Rechte unberührt.
- **D-04:** **Reine Gruppen-Mitgliedschaft reicht NICHT.** Ein App-Mitglied, das nur in der Fansub-Gruppe ist (mit Gruppen-Rolle), aber KEINER Contribution des Projekts zugeordnet ist, kann an dessen Releases **nichts** schreiben/hochladen/bearbeiten. Edit-Rechte auf Release-Inhalte entstehen ausschließlich aus einer Contribution-Zuordnung zum Projekt (bzw. zum Release).
- **D-05:** **Leader/Leadership immer ausgenommen.** `fansub_lead` kann in seiner Fansub-Gruppe **immer alles** bearbeiten, steuern und moderieren (alle User-Beiträge ansehen, editieren, löschen) — unabhängig von einer eigenen Projekt-Contribution. `project_lead` wird pro Projekt angesetzt (oft der Leader selbst, kann aber eine andere Person sein). Nur **operative** Rollen (translator/timer/typesetter/…) benötigen eine Contribution, um zu handeln.

### Cockpit-Einstieg & Override-Editor (UX)
- **D-06:** **Einstieg pro Release-Version-Zeile.** Im Cockpit (`tab=releases`) gibt es je Release-Version (z. B. „Episode 2") eine **„Mitwirkende"-Aktion**, die **rechts ein Drawer/Side-Panel** öffnet. Das Panel ist **staged** mit explizitem **Speichern/Abbrechen** (kein Auto-Save).
- **D-07:** **Panel-Aufbau:** oben Abschnitt „**Vom Projekt geerbtes Team**" (geerbte Projekt-Contributions sichtbar), darunter die **Rollen genau für diese Release-Version**. Pro Rolle: zugeordnete Person(en) mit Aktionen — entfernen, freie Rolle neu vergeben, Person aus der Fansub-Gruppe hinzufügen + Rolle geben. Eine Rolle von Person A auf Person D umhängen = erst bei A entfernen, dann D zuweisen (UX-Workflow, kein harter Constraint — siehe D-09).
- **D-08:** **Cockpit-Übersicht + Drawer-Tiefe.** Das Cockpit zeigt pro Release den Mitwirkenden-Status als Übersicht (Badge/Kurzliste); der vollständige Override-Editor lebt im Drawer. (Gewählte Variante „Übersicht + Tiefe".)

### Override-Datenmodell
- **D-09:** **Mehrere Personen pro Rolle erlaubt.** Eine Rolle kann pro Release von mehreren Personen gehalten werden (z. B. zwei Übersetzer). Konsistent zum bestehenden Datenmodell (`anime_contribution_roles`, mehrere `role_code` pro Contribution) und zu Phase 82 (D-05 dort: mehrere Rollen pro Person). Das A→D-Umhängen aus D-07 ist eine UX-Option, kein Zwang zur Exklusivität.
- **D-10:** **Override-Geltung = genau eine Release-Version.** Ein Override betrifft ausschließlich die eine Release-Version, für die er gepflegt wurde (z. B. nur Episode 1). Alle anderen Release-Versionen des Projekts nutzen weiter unverändert das Projekt-Team.
- **D-11:** **Override = eigener, expliziter Satz für dieses Release.** Eine überschriebene Release-Version trägt ihren eigenen, vollständigen Mitwirkenden-Satz (release-spezifische `anime_contributions`-Einträge mit gesetztem `release_version_id`). **Akzeptierte Konsequenz:** Spätere Änderungen am Projekt-Team fließen **nicht automatisch** in bereits überschriebene Releases — diese sind „eigen" und müssen ggf. neu editiert werden. Nicht-überschriebene Releases ziehen weiterhin live mit dem Projekt-Team mit. (Genaues Storage — materialisierter Snapshot vs. Delta-Auflösung — ist Researcher/Planner-Detail, solange dieses sichtbare Verhalten erfüllt ist.)

### Kandidaten-Pool & Konsistenz
- **D-12:** **Kandidaten-Pool = nur die aktuelle Gruppe.** Auswählbar sind nur Mitglieder der Fansub-Gruppe, in deren Cockpit man sich befindet — auch wenn das Release eine Collab mehrerer Gruppen ist (`release_version_groups` mit >1 Gruppe). Mitglieder von Partner-Gruppen werden hier (V1) nicht zugeordnet (bewusste Grenze, siehe Deferred).
- **D-13:** **Notizen/Media konsistent gekoppelt.** Die Notizen-/Media-Maske einer Release-Version zeigt genau den dort gültigen Mitwirkenden-Satz (Override oder Projekt-Default); nur diese Personen erscheinen und dürfen in ihrer Rolle schreiben/hochladen. Konsequent zu D-01.

### UI-Pflicht (aus Phase 82 / gefoldete Todos)
- **D-14:** Ausschließlich `@/components/ui`-Primitives + bestehende geteilte Komponenten (Button, Select, FormField, Modal/Drawer, Table, Badge …). **Kein** handgebautes natives `<select>/<input>/<textarea>` oder Eigen-Markup. Das schließt die Behebung des bestehenden nativen `<select>` in `AnimeContributionModal.tsx` und die Angleichung von `ReleaseVersionBreakdown.tsx` ein (siehe gefoldeter Todo). Referenz/Showcase: `/dev/ui-system`. (Hartes Constraint.)
- **D-15:** **Benennung „Mitwirkende"** (nicht „Beiträge") UI-weit konsistent — passt zur öffentlichen Anzeige „X Mitwirkende". (Aus gefoldetem Credits-UI-Todo; finale Label-Wahl beim Bau bestätigen, aber „Mitwirkende" ist gesetzt.)

### Constraint / zu verifizieren
- **D-16:** **Löschen durch Leader = Soft-Delete.** Wenn ein Leader Beiträge (Notizen/Media/Contributions) löscht, ist der Datensatz **nicht** physisch aus der Datenbank entfernt; echtes (Hard-)Löschen kann nur der **Plattform-Admin**. Researcher/Planner prüfen, inwieweit Soft-Delete im betroffenen Pfad bereits existiert; falls nicht, ist das ein Constraint/Risiko (kein Vollausbau einer neuen Soft-Delete-Infrastruktur in dieser Phase erzwingen — ggf. Folgearbeit).

### Claude's Discretion
- Konkretes Storage-/Auflösungs-Modell des Overrides (materialisierter Roster-Snapshot vs. Delta gegenüber Projekt-Default), solange D-10/D-11-Verhalten erfüllt ist.
- Genaue `CanForReleaseVersion`-Refaktorierung (Query-/Join-Struktur über `anime_contributions` + `release_version_groups`), Caching, Backfill-Reihenfolge.
- Exakte Badge-Texte/Layout der Cockpit-Übersicht (innerhalb der ruhigen Admin-Optik aus Phase 82).

### Folded Todos
- **`2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md`** — Credits-UI in „Anime & Veröffentlichungen" konsolidieren + Benennung „Beiträge"→„Mitwirkende"; Teil B (Permission-Brücke) ist durch D-01..D-05 dieser Phase entschieden (Nutzer wählte aktive Rechte-Kopplung statt reiner Anzeige). Fließt in D-13/D-14/D-15 ein.
- **`2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md`** — natives `<select>` in `AnimeContributionModal.tsx` durch `Select`+`FormField` ersetzen, `ReleaseVersionBreakdown.tsx` an Primitives/Tokens angleichen. Fließt in D-14 ein.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-eigene Vorgaben
- `.planning/phases/83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc/83-SEED.md` — Design-Seed: gelockte Richtung, offene Fragen, verifizierte Referenzen.
- `.planning/phases/82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri/82-CONTEXT.md` — Vorgänger-Entscheidungen (members.id-Anker, Cockpit, katalog-getriebene Rollen, UI-Pflicht).
- `.planning/todos/pending/2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` — gefoldet (Konsolidierung/Benennung/Permission-Brücke-Diskussion).
- `.planning/todos/pending/2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md` — gefoldet (UI-Primitives-Migration der Contribution-Fläche).

### Permissions (Kern-Umbau D-01..D-05)
- `backend/internal/permissions/permissions.go` — `roleMatrix` (Rolle→Aktionen), `CanForReleaseVersion` (Z. ~63–146, 240–244): heute Gruppen-Mitgliedschaft + `fansub_group_member_roles`; muss auf Contribution-Auflösung umgebaut werden.
- `backend/internal/handlers/admin_content_release_version_notes.go` — Notizen-Handler (Permission-Check + Mitwirkenden-Anzeige, D-13).
- `backend/internal/handlers/admin_content_release_version_media.go` — Media-Handler (analog).

### Datenmodell (Migrationen)
- `database/migrations/0091_anime_contributions_release_version.up.sql` — `release_version_id`-Spalte (NULL=anime-weit) + 4-Spalten-UNIQUE `NULLS NOT DISTINCT` + partieller Index. Grundlage für D-02/D-10/D-11.
- `database/migrations/0086_anime_contributions.up.sql` — Contributions-Basis (members.id-Anker, Tabellen-Kommentar „historisches Faktum").
- `database/migrations/0085_anime_contribution_roles_catalog.up.sql` — `anime_contribution_roles` + `role_definitions` (mehrere role_code pro Contribution → D-09).
- `database/migrations/0035` (release_version_groups), `0064` (release_version_notes), `0059` (release_version_media) — Release-Struktur + scoped Contributor-Inhalte.

### Frontend (Cockpit + Editor + Override-Drawer)
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — Cockpit/Releases-Tab, Mitwirkende-Einstieg, Tab-Logik.
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` — bestehende Mitwirkenden-Zuordnung (Quelle/Wiederverwendung; natives `<select>` zu ersetzen, D-14).
- `frontend/src/components/anime/ReleaseVersionBreakdown.tsx` — Release-Versions-Aufschlüsselung (an Primitives angleichen, D-14).
- `frontend/src/components/anime/GroupContributionBlock.tsx` — Gruppen-Contribution-Block.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` — Version-Editor (Tab-/Capability-Logik Z. ~113–127, 281–377); Kontext für Notizen/Media-Konsistenz (D-13).
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx`, `ReleaseVersionMediaSection.tsx` — Notizen-/Media-Masken (D-13).
- `frontend/src/components/ui/` (+ `/dev/ui-system`) — Pflicht-Primitives (D-14).
- `frontend/src/lib/api.ts` — Contribution-/Member-/Notes-/Media-API-Helper (Contract-Prüfung, keine Roh-Fetches).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@/components/ui` Primitives (Button, Select, FormField, Modal, Drawer, Table, Badge, Input, Textarea) — Pflicht für den neuen Override-Drawer (D-14).
- `AnimeContributionModal` als Vorlage für die Mitwirkenden-/Rollen-Auswahl (auf Primitives umstellen).
- Phase-82-Cockpit (Abdeckungs-Matrix, aufklappbare Projektkarten, Status-Badges) als Container für den Pro-Release-Einstieg.
- `roleMatrix` (Rolle→Aktionen) ist bereits vorhanden — wird für die Contribution-getriebene Rechteauflösung wiederverwendet, nicht neu gebaut.

### Established Patterns
- Rollen-Katalog `role_definitions` (`contexts @> 'anime_contribution'`) als Single Source of Truth; `anime_contribution_roles` mit mehreren `role_code` pro Contribution → mehrere Rollen/Personen ohne Schema-Änderung (D-09).
- `anime_contributions` 4-Spalten-UNIQUE `NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)`: derselbe Member kann je Release-Version einmal UND anime-weit (NULL) einmal eingetragen werden — exakt das Fundament für Projekt-Default + Release-Override.
- API-Aufrufe gebündelt über `frontend/src/lib/api.ts`; keine Roh-/Auth-Fetches.

### Integration Points
- **`CanForReleaseVersion`** ist der zentrale Umbaupunkt (D-01..D-05): von gruppenrollen-basiert → contribution-basiert (Projekt-Default + Release-Override), mit Leader-Ausnahme. Sicherheits-Tests erforderlich.
- Notizen-/Media-Handler + -Masken: Mitwirkenden-Liste und Schreibrecht aus demselben aufgelösten Satz speisen (D-13).
- `release_version_groups` für die Bestimmung der beteiligten Gruppe(n) eines Releases (Kandidaten-Pool D-12; in V1 nur aktuelle Gruppe).

</code_context>

<specifics>
## Specific Ideas

- Konkreter Override-Drawer (Nutzer-Vorgabe, wörtlich): Klick auf „Mitwirkende" bei z. B. Episode 2 → rechts öffnet ein Panel mit „Vom Projekt geerbtes Team" oben; darunter die Rollen genau dieser Episode; pro Rolle eine Person mit Entfernen/Neu-Vergeben; Person aus der Fansub-Gruppe hinzufügen + Rolle geben; Rolle umhängen erst nach Entfernen bei der bisherigen Person; unten Speichern/Abbrechen.
- Mentales Modell der Vererbung (wörtlich sinngemäß): „Auf Projektebene ordne ich Member + Rollen zu, das gilt für jede Release-Version. Als Leader kann ich bei einem einzelnen Release sagen: hier warst du nicht dabei, oder die Rollen anders verteilen — dann gilt nur für dieses Release der abweichende Satz, andere Releases bleiben beim Projekt-Team."

</specifics>

<deferred>
## Deferred Ideas

- **Schicht B — member-zentrischer `/me`-Einstieg** zum Mitwirken an Releases (eigener `/me/releases/...`-Bereich, der bestehende Medien-/Notizen-Komponenten in einem Member-Shell wiederverwendet). Klar getrennt vom `/admin`-Namespace. Folge-Phase, nicht Teil von 83.
- **Collab-übergreifende Zuordnung:** Mitglieder von Partner-Gruppen an Collab-Releases (`release_version_groups` mit >1 Gruppe) zuordnen. V1 beschränkt auf die aktuelle Gruppe (D-12); Erweiterung als spätere Phase möglich.
- **Soft-Delete/Hard-Delete-Infrastruktur:** Falls der Soft-Delete-Pfad (D-16) im betroffenen Bereich noch nicht existiert, eigenständige Folgearbeit statt Mitbau in 83.

</deferred>

---

*Phase: 83-Pro-Release-Mitwirkenden-Zuordnung (release_version_id) im Cockpit*
*Context gathered: 2026-06-11*
