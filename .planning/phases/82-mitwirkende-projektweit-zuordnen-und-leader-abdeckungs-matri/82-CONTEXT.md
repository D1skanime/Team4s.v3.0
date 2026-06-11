# Phase 82: Mitwirkende projektweit zuordnen + Projekt-Cockpit (Anime & Veröffentlichungen) - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Der Tab „Anime & Veröffentlichungen" (`tab=releases`) in `/admin/fansubs/[id]/edit` wird zum **Projekt-Cockpit** für Fansub-Leader. Zwei zusammengelegte Stränge (Nutzer-Entscheidung „in Phase 82 zusammenlegen"):

1. **Mitwirkende projektweit zuordnen** — Anime-Beiträge lassen sich für jede Person der Gruppe gleichwertig zuordnen (App-Member UND historische Member), verankert auf `members.id`. Leader-Abdeckungssicht (Projekt × Rolle) mit Inline-Zuweisung und Standard-Team.
2. **Anime-Einblicke integrieren** — der separate Main-Tab „Anime-Einblicke" (`tab=anime-projekte`) wird in dieses Cockpit überführt: pro Projekt Status-Badges (inkl. Einblick vorhanden/fehlt), Inline-Einblick im aufgeklappten Projektbereich, Routing/Legacy-Redirect, Entfernen des separaten Tabs.

**In Scope:** gemeinsames Projekt-Cockpit (Status-Badges, aufklappbare Projektkarte mit Projektstatus-Kopf, Filterchips), Mitwirkenden-Zuordnung über `members.id`, Daten-Vereinheitlichung (members-Backfill, Rollen-FK), Anime-Einblicke-Integration + Tab-Merge + Routing.
**Out of Scope:** Claim-/Dedup-UI für historisch↔App (liegt im Fansub-Members-Bereich, bereits integriert); Änderungen an Release-/Media-Domainlogik außerhalb dieses UI-Slices; neue Domain-APIs ohne Contract-Prüfung.

</domain>

<decisions>
## Implementation Decisions

### Anker & Identität (gelockt aus Design-Diskussion)
- **D-01:** `anime_contributions` ankert künftig auf `members.id` (Person) + Gruppe statt auf `hist_fansub_group_members.id`. App- und historische Member sind gleichwertig buchbar.
- **D-02:** Jeder App-Member bekommt eine `members`-Zeile (Backfill bestehender `fansub_group_members` ohne `member`; künftig Auto-Anlage + Self-Claim beim Gruppenbeitritt). `members.id` ist der universelle Anker. (Self-Claim = triviale Verknüpfung Account↔eigene members-Zeile; NICHT zu verwechseln mit dem Claim historischer Einträge.)

### Dedup / Claim (Scope-Klärung)
- **D-03:** Das Verknüpfen historischer Einträge mit eingeloggten Usern (Claim) ist Aufgabe des **Fansub-Members-Bereichs** und dort bereits integriert — NICHT der Anime-Veröffentlichungen. Phase 82 **konsumiert** nur die vereinheitlichte Personenliste; es wird KEIN Merge-/Claim-UI in der Mitwirkenden-/Matrix-Oberfläche gebaut. Mögliche Doppelpersonen werden im Members-Bereich aufgelöst, nicht hier.

### Standard-Team
- **D-04:** „Team übernehmen" speist sich aus einer **festen Stamm-Crew pro Gruppe** (Rolle→Person), die der Leader pflegt. Füllt leere Projekte.
- **D-05:** Die Crew-/Zuordnungs-Modellierung MUSS **mehrere Rollen pro Person** zulassen (Rolle↔Person many-to-many — eine Person kann z.B. translator UND timer sein). Kein 1:1 Rolle=Person. (Das Datenmodell unterstützt das bereits: `anime_contribution_roles` mit mehreren `role_code` pro Contribution.)

### Abdeckungs-Matrix / Cockpit
- **D-06:** Rollen-Spalten der Matrix sind **pro Gruppe konfigurierbar** (Gruppe wählt sichtbare Katalog-Rollen; Rest im Zuweisungs-Popover). Skaliert mit wachsendem Rollen-Katalog.
- **D-07:** Rollen sind katalog-getrieben (`role_definitions`, `contexts @> 'anime_contribution'`, `sort_order`); Matrix-Spalten werden aus dem Katalog generiert. Neue Rolle = Katalog-Insert.
- **D-08:** `fansub_group_member_roles.role` (heute hartkodierter CHECK, 0073/0074) wird auf FK `role_definitions(code)` umgestellt — Katalog als einzige Rollen-Wahrheit.

### Rollen-Seeding
- **D-09:** Beim Hinzufügen werden **nur operative** Gruppen-Rollen (translator/timer/typesetter/…) als Default in die Anime-Rollen übernommen; Leadership (`fansub_lead`/`founder`) NICHT automatisch als Anime-Credit. Überschreibbar pro Projekt.

### Projektleiter / Rollen-Granularität
- **D-15:** „Projektleiter" ist die **projektbezogene** Rolle `project_lead` (Katalog-Kontext `anime_contribution`), klar getrennt vom **Gruppen**-Status `fansub_lead`. Der Projektleiter kann der Fansub-Leader sein, muss aber nicht — er wird pro Projekt einer Person zugewiesen und ist NICHT automatisch der Gruppen-Leader.
- **D-16:** `project_lead` wird als **normale Katalog-Rolle** behandelt — KEINE „max. 1 pro Projekt"-Sperre und KEIN dediziertes Sonderfeld. Bewusst offen gehalten, weil künftig weitere Lead-Varianten (z.B. `co_project_lead`) dazukommen können; diese sind dann reiner Katalog-Insert (`role_definitions`) ohne Schema-Änderung. Projektleiter-Erkennung erfolgt über die Rolle, nicht über eine eigene Spalte/Struktur.

### Anime-Einblicke-Integration (siehe 82-EINBLICKE-AUFTRAG.md — verbindlich)
- **D-10:** Einblicke pro Anime-Projekt direkt im aufklappbaren Projektbereich (Projektstatus-Kopf + Abschnitt „Projekt-Einblick" mit Text+Bearbeiten oder Empty-State+„Einblick hinzufügen"). Bestehende Releases/Episoden bleiben darunter sichtbar.
- **D-11:** Pro Projekt Status-Badges (z.B. `220 Folgen`, `Mitwirkende 6/6` / `Mitwirkende fehlen`, `Einblick vorhanden` / `Einblick fehlt`, `N offene Punkte`), ruhig/admin-tauglich. Aktionen: bestehender `Mitwirkende`-Button bleibt + `Einblick`/`Einblick bearbeiten` + bestehende Detail-/Release-Aktion.
- **D-12:** Filterchips (`Alle` / `Mitwirkende fehlen` / `Einblick fehlt` / `Offene Punkte`) NUR, wenn die Datenlage einen Status zuverlässig liefert; sonst nur UI-Struktur vorbereiten, **kein Fake-Status**. Nicht berechenbare Status ehrlich als `unbekannt`/`nicht gepflegt`.
- **D-13:** Routing: separater Main-Tab „Anime-Einblicke" entfernen (wenn Integration vollständig); Legacy `?tab=anime-projekte` → `tab=releases`; Readiness-/Sprungmarken auf `releases` umstellen.
- **D-14:** Bestehende API-Helper/DTOs wiederverwenden — keine zweite API-Logik, keine manuelle Auth/Bearer-Fetches, keine erfundenen API-Felder. Contract-Prüfung vor Bau (siehe Auftrag).
- **D-17:** Der TipTap-/Rich-Text-Editor für Projekt-Einblicke nutzt weiterhin den **geteilten `RichTextEditor` aus `@/components/editor`** (read-only via `RichTextRenderer`). KEINE Sonder-/Einzellösung oder neuer Editor für diesen Bereich — beim Einbetten in die Projektkarte/Cockpit den bestehenden Editor wiederverwenden. Gilt analog für ALLE Controls: ausschließlich `@/components/ui`-Primitives + bestehende geteilte Komponenten, kein Eigen-Markup. (Hartes Constraint, vom Nutzer ausdrücklich betont.)

### Claude's Discretion
- Migrationsreihenfolge & Backfill-Sicherheit der bestehenden `anime_contributions` (hist→member_id), Reihenfolge ggü. members-Backfill — technisches Detail für Researcher/Planner.
- Konkrete Komponenten-/Scaffold-Struktur des Cockpits und exakte Badge-Texte (innerhalb der ruhigen Admin-Optik).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-eigene Vorgaben
- `.planning/phases/82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri/82-EINBLICKE-AUFTRAG.md` — verbindlicher Auftrag für die Anime-Einblicke-Integration (UX, Routing, Tests, Nicht-Tun).
- `.planning/phases/82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri/82-SEED.md` — Design-Seed (gelockte Entscheidungen, Scope, Referenzen).

### Datenmodell (Migrationen)
- `database/migrations/0086_anime_contributions.up.sql`, `database/migrations/0091_anime_contributions_release_version.up.sql` — Contribution-Anker + Unique-Key.
- `database/migrations/0085_anime_contribution_roles_catalog.up.sql` — `role_definitions` (Katalog, contexts, FK-Retrofit).
- `database/migrations/0073_fansub_group_app_memberships.up.sql`, `database/migrations/0074_expand_fansub_group_member_roles.up.sql` — App-Member + Rollen-CHECK (auf FK umzustellen).
- `database/migrations/0082_*`, `0083_*` (hist. Member + Rollen), `0044_*` (`members`), `0081_*` (`member_claims`).

### Frontend
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — Tab-Logik, Mitwirkende-Button, `openAnimeContributions`, Releases-Tab, Tab `anime-projekte` (~Z.197/238/3281).
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` — Mitwirkende-Modal.
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` — bisheriger Anime-Einblicke-Inhalt.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` — bestehende Klassen/Patterns.
- `frontend/src/lib/api.ts` — Contribution-/Member-/Einblick-API-Helper (Contract-Prüfung).

### Backend
- `backend/internal/handlers/fansub_anime_contributions_handler.go`, `fansub_contributions_validation.go` — Contribution-Handler/Validierung.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Globale UI-Primitives `@/components/ui` (Button, Badge, Table, Input, Select, FormField, Card) — Pflicht.
- `AnimeContributionModal` (Mitwirkende-Zuordnung) und `AnimeProjectNotesSection` (Einblicke) — als Quellen/zu integrierende Bausteine.
- `FansubEdit.module.css` lokale Patterns; bestehende Release-/Projektkomponenten im Releases-Tab.

### Established Patterns
- Rollen-Katalog `role_definitions` mit FK aus `anime_contribution_roles` / `hist_group_member_roles` — Katalog ist Single Source of Truth.
- `anime_contribution_roles`: mehrere `role_code` pro Contribution (Unique je (contribution, role_code)) → Mehrfachrollen pro Person bereits modelliert.
- API-Aufrufe gebündelt über `frontend/src/lib/api.ts`; keine Roh-Fetches.

### Integration Points
- Releases-Tab-Render in `page.tsx`; Tab-Routing/`activeMainTab`; Legacy `anime-projekte`-Case.
- `anime_contributions` (Anker-Migration); `members` (Backfill); `fansub_group_member_roles` (Rollen-FK).
- Öffentliche Projektion (Anime-Seite, Member-Profil), die heute auf den hist-Anker joint → auf `member_id` umstellen.

</code_context>

<specifics>
## Specific Ideas

- Leader-Cockpit als Abdeckungs-Matrix (Projekt-Zeilen × Rollen-Spalten), leere Projekte hervorgehoben, Inline-Zuweisung per Zellklick, „Standard-Team übernehmen". Mockup-Konzept wurde mit dem Nutzer abgestimmt (Status-Badges, Filter „Ohne Mitwirkende"/„Einblick fehlt"/„Offene Punkte").
- Badges ruhig/admin-tauglich, keine Marketing-Optik. Beispiele: `220 Folgen`, `Mitwirkende 6/6`, `Einblick fehlt`, `2 offene Punkte`.

</specifics>

<deferred>
## Deferred Ideas

- Person-zentrische Zweitsicht (eine Person → alle Projekte) ist Teil des Cockpit-Gedankens; sofern sie die Phase überlädt, kann sie als kleiner Folge-Slice abgespalten werden (Planung entscheidet nach Größe).
- Gruppenübergreifendes/globales Leader-Dashboard (mehrere Gruppen) — bewusst außerhalb dieser Phase.

</deferred>

---

*Phase: 82-Mitwirkende projektweit zuordnen + Projekt-Cockpit*
*Context gathered: 2026-06-10*
