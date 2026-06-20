# Quick Task 260620-qog: Bestätigte Projektrollen pro Anime gruppieren (Folge-Rolle-Aufschlüsselung) - Context

**Gathered:** 2026-06-20
**Status:** Ready for planning

<domain>
## Task Boundary

Die „Bestätigte Projektrollen"-Liste auf `/me/contributions` von **einer Karte pro Beitrag** auf **eine Karte pro Anime** umstellen. Pro Anime werden die Rollen und der Umfang aggregiert; release-version-spezifische Mitwirkungen werden als „Folge X" (bzw. zusammengefasste Bereiche „Folge X–Y") je Rolle aufgeschlüsselt, eine Ebene tiefer (inline aufklappbar). Dafür muss das Backend pro Beitrag die `episode_number` (+ Sortier-Index) ausliefern — aktuell liefert die API nur eine opake `release_version_id`.

Ziel: skaliert (Naruto 220 Folgen ⇒ 1 Karte, nicht 220), gute Übersicht, kein Claim-/Rechte-Text. Keine funktionalen Flows entfernen.
</domain>

<decisions>
## Implementation Decisions

### UI / Gruppierung
- **Eine Karte pro Anime.** Zähler zählt Animes („Bestätigte Projektrollen (N Animes)" — Wortlaut nach Discretion, knapp).
- Pro Karte: Anime-Titel, aggregierte Rollen-Badges, dezente Umfang-Chips (z. B. „anime-weit", „N Release-Versionen").
- **Detail-Ebene: inline aufklappbar (Accordion)** — genau wie der gezeigte Mockup. Aufgeklappt: Liste „Folge X–Y: Rolle" (bzw. „Folge X: Rolle" bei Einzelfolge; „anime-weit: Rolle" für Beiträge ohne release_version_id), je mit „Arbeitsfläche öffnen"-Link auf `/me/releases/[release_version_id]/workspace`.
- **Folgen-Bereiche bilden:** aufeinanderfolgende Folgen derselben Rolle (nach `episode_sort_index` sortiert) zu „Folge X–Y" zusammenfassen; einzelne Folge → „Folge X". Frontend-Aggregation.
- **Kein Claim-/Rechte-/Historik-Text.** Nur Anime, Rolle, Folge/Umfang, Aktion.
- Bestehende Funktionalität (Sichtbarkeits-Dropdown bei bestätigten, Arbeitsfläche-Link) erhalten.

### Backend (Daten-Voraussetzung)
- Endpoint: `GET /api/v1/me/anime-contributions` → Handler `ContributionsMeHandler.Listn` (backend/internal/handlers/contributions_me_handler.go) → Repo-Methode **`ListByMemberIDWithProposalFields`** (in anime_contributions_member_repository.go bzw. proposal_repository.go — die vom Handler genutzte Query).
- Diese Query um die **Episode-Auflösung** erweitern (LEFT JOIN, da release_version_id NULL sein kann):
  ```sql
  LEFT JOIN release_versions rv      ON rv.id = ac.release_version_id
  LEFT JOIN fansub_releases  fr      ON fr.id = rv.release_id
  LEFT JOIN episodes         ep      ON ep.id = fr.episode_id
  ```
  und zusätzlich selektieren: `ep.episode_number` (string, nullable) und `ep.sort_index` (int, nullable) — Letzteres als `episode_sort_index` für stabile Sortierung/Bereichsbildung. Ggf. auch `rv.version` als Label (optional).
- Achtung GROUP BY: die Query aggregiert Rollen via ARRAY_AGG. Die neuen Spalten (episode_number, sort_index) sind pro Beitrag 1:1 (eine release_version → genau eine Folge) — in GROUP BY aufnehmen bzw. MIN()/MAX() nutzen, damit keine Zeilen-Vervielfachung entsteht. Join ist 1:1 (rv.release_id → fansub_releases → episodes).
- Row-Struct + DTO/Mapping um die Felder erweitern; JSON-Keys `episode_number` und `episode_sort_index`.
- **OpenAPI-Contract** in shared/contracts/ für diesen Response um die zwei Felder ergänzen.
- **Backend ist Docker (:8092)** → nach Codeänderung `docker compose up -d --build team4sv30-backend`, sonst erscheint das neue Feld nicht (stale Binary). Danach gegen :8092 verifizieren.

### Frontend
- `MeAnimeContribution`-Typ (frontend/src/types/contributions.ts) um `episode_number?: string | null` und `episode_sort_index?: number | null` erweitern.
- `MyContributionsSection.tsx`: nach `anime_id` gruppieren (Rollen sammeln, release-version-Beiträge nach Rolle gruppieren, Folgen-Bereiche via sort_index bilden). Rendering der gruppierten Karte + Accordion. Evtl. neue Sub-Komponente, Dateien ≤450 Zeilen.

### Verifizierte DB-Fakten (echte Daten)
- release_version 1 → fansub_releases → episodes ⇒ episode_number = "1", sort_index = 1, anime_id = 1 (Naruto).
- ao-leader (member_id 2): Beitrag id 17 = anime-weit (release_version_id NULL, episode_number NULL); id 31 = release_version 1 (episode_number "1"). Beide Rolle project_lead, Anime Naruto ⇒ nach Umbau EINE Naruto-Karte mit „anime-weit: Projektlead" + „Folge 1: Projektlead".
- `episodes` hat: episode_number (text), sort_index (int), number/number_decimal/number_text, anime_id. `fansub_releases` hat: id, episode_id, release_date. `release_versions` hat: id, release_id, version, title.

### Claude's Discretion
- Konkreter Wortlaut der Labels/Chips (knapp, neutral, korrekte Umlaute ä/ö/ü/ß).
- Genaue Komponenten-Aufteilung (Karte + Accordion), solange ≤450 Zeilen/Datei.
- Ob `rv.version`-Label zusätzlich angezeigt wird (nur wenn es Mehrwert bringt, sonst weglassen).
</decisions>

<specifics>
## Specific Ideas

- Mockup-Referenz: eine Karte pro Anime, Rollen-Badges + Umfang-Chips, „Versionen"-Accordion mit „Folge X–Y" + „Arbeitsfläche öffnen".
- CLAUDE.md: @/components/ui-Primitives Pflicht; korrekte Umlaute; Dateien ≤450 Zeilen.
- Tests: anime_contributions_member_repository-Test (Backend) für die erweiterte Query/Felder; Frontend MyContributionsSection/ContributionCard-Tests an Gruppierung anpassen; bestehende Tests grün halten.
- Live-Verifikation gegen Dev-Server :3000 mit ao-leader (Passwort 123) nach Backend-Rebuild.
</specifics>

<canonical_refs>
## Canonical References

- Episode-Auflösungs-Vorbild: backend/internal/repository/anime_contributions_release_lookup_repository.go (rv→fansub_releases→episodes Join + ORDER BY sort_index)
- Backend-Rebuild: `docker compose up -d --build team4sv30-backend` (Memory: stale Docker-Backend → API-404/altes Schema)
- shared/contracts/ (OpenAPI für /me/anime-contributions)
</canonical_refs>
