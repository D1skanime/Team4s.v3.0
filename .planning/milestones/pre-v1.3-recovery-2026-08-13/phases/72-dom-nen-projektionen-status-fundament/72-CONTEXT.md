# Phase 72: Domänen-Projektionen & Status-Fundament - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend-/Contract-Fundament für Meilenstein v1.2. Phase 72 liefert:
1. **Lese-Projektionen/DTOs**, die für eine Fansub-Gruppe und für ein Member-Profil
   **Gruppenmitglied vs. externer Mitwirkender vs. historische Nennung** als
   getrennte, klar typisierte Mengen liefern (eine Release-/Contribution-Beteiligung
   erzeugt NIE einen Mitglieds-Eintrag).
2. **Übergreifende Statusfelder** als Schema (append-only Migrationen):
   - `memorial` als Member-Profilstatus (Wert existiert; Verhalten/Setter erst Phase 74)
   - Contribution-**Konflikt-Dimension** getrennt vom inhaltlichen Status
   - Medien-/Contribution-**Sichtbarkeit** (über `visibilities`-Lookup) + separater
     **Review-/Lebenszyklus-Status**
   - Medien-**Owner/Kategorie/Sichtbarkeit/Review**-Metadaten in einer von UI-Surfaces
     (73–80) konsumierbaren Projektion.
3. **Contract-/Typen-Abgleich**: OpenAPI (ggf. admin-content) + `frontend/src/lib/api.ts`-Typen.

**Explizit NICHT in Phase 72:** keine Public-/Admin-UI, keine Schreib-Aktionen
(memorial setzen, dispute öffnen/auflösen, Review freigeben kommen in den nutzenden
Phasen 74/76/78/80). Keine Umstellung bestehender Runtime-Authority/öffentlicher
Anime-Reads.

</domain>

<decisions>
## Implementation Decisions

### Contribution-Konflikt-Status (Punkt 1)
- **D-01:** Der Konflikt aus „Das war ich nicht" wird als **separate Dimension**
  modelliert (z. B. `dispute_state`: none/open/resolved) **neben** dem bestehenden
  inhaltlichen Contribution-Status (draft/proposed/confirmed). Der inhaltliche Status
  bleibt beim Bestreiten erhalten — eine `confirmed` Contribution kann gleichzeitig
  einen offenen Konflikt tragen; Review (Phase 78) löst den Konflikt, ohne den Status
  zu zerstören. Genau **eine** aktive Konflikt-Dimension pro Eintrag (keine eigene
  Dispute-Historien-Tabelle in v1.2).
- **D-02:** „Das war ich" (Bestätigung einer Zuordnung) ist Contribution-Logik, NICHT
  Claim-Logik — strikt getrennt (Lock H). „Das war ich nicht" löscht nichts, setzt nur
  `dispute_state=open` (Lock E).

### Sichtbarkeits-/Status-Modell (Punkt 2)
- **D-03:** **Zwei orthogonale Achsen**, einheitlich für Medien UND Contributions:
  - Achse 1 **Sichtbarkeit** über die bestehende `visibilities`-Lookup-Tabelle
    (intern ↔ öffentlich).
  - Achse 2 **Review-/Lebenszyklus-Status** als separates Feld
    (in Prüfung / freigegeben / abgelehnt / archiviert / entfernt).
  - Begründung: „intern aber bereits geprüft" und „öffentlich UND freigegeben" müssen
    ausdrückbar/abfragbar sein; vermeidet die Vermischung „wer darf sehen" vs.
    „Bearbeitungszustand".

### Review-Politik / Auto-Freigabe (Punkt 2)
- **D-04:** **Nur Fremd-Vorschläge und Konflikte** landen automatisch „in Prüfung".
  Leader-/Admin-**eigene** Uploads und Einträge werden automatisch „freigegeben"
  (Capability bedeutet Vertrauen) — kein zusätzlicher manueller Schritt über die
  ohnehin nötige Owner-/Kategorie-Auswahl hinaus. Die Review-Queue (Phase 78) füllt
  sich ausschließlich aus registrierten Nicht-Berechtigten-Vorschlägen (Phase 76) und
  aus Konflikten. Deckt Lock 6 („nichts Öffentliches ohne Review") ohne Alltagslast.

### Phasengrenze 72 — Reads vs. Writes (Punkt 3)
- **D-05:** Phase 72 = **Schema (Migrationen) + Read-Projektionen + Contracts/Typen**.
  ALLE Schreib-Aktionen (memorial setzen, dispute öffnen/auflösen, Review freigeben,
  Sichtbarkeit ändern) baut jeweils die Phase, die ihre UI hat. Keine endpunktlosen
  Writes in 72.

### Memorial-Durchsetzung (Punkt 4)
- **D-06:** In Phase 72 existiert nur der **Statuswert** `memorial` (kein Verhalten).
  Der **Setter** („memorial setzen", nur Plattform-Admin) UND die **Claim-Sperre**
  („claim ablehnen wenn Ziel memorial") landen **gemeinsam in Phase 74** — Schutz und
  Setzbarkeit shippen zusammen, damit kein Fenster entsteht, in dem memorial setzbar
  aber ungeschützt ist. Konsistent mit D-05.

### Claude's Discretion
- Konkrete Spaltennamen/Enum-Werte, Migrationsnummern, ob neue Lookup-Tabelle vs.
  Enum-Spalte je Statusfeld, Repository-/Projektions-Schichtung (eigener Query-Layer
  vs. Erweiterung bestehender Repos) — Researcher/Planner entscheiden, solange D-01..D-06
  und die Locks eingehalten werden.
- Wiederverwendung der vorhandenen `media_assets`/`media_files`-Status-Spalten (Phase
  34/35) und `media_assets.owner_member_id` (Phase 70) vs. additive Felder — Planner-Entscheid.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meilenstein-Entscheidungen (LOCKED — gelten für alle v1.2-Phasen)
- `.planning/milestones/v1.2-DISCUSSION.md` — verbindliche Entscheidungen A–K,
  Media-Ownership-Matrix, Nicht-Ziele, Phasen-Mapping 72–80. **MUST read.**

### Systeminventar / Ownership / Runtime-Authority
- `docs/architecture/current-system-inventory.md` — Routen/API/DB/Ownership-Karte,
  Media Ownership Matrix, Duplication Traps. Insb. Abschnitte „Core Ownership Rules",
  „Media Ownership Matrix", „Important DB groups".
- `docs/architecture/db-runtime-authority-map.md` — legacy-first vs. normalized-first;
  keine Read-Umstellung ohne Authority-Entscheid.
- `docs/architecture/db-schema-fansub-domain.md` — Domänenregeln Fansub/Release.

### Contracts (Lock K — Pflicht vor Endpoint-/DTO-Änderungen)
- `shared/contracts/openapi.yaml` — Umbrella-Contract.
- `shared/contracts/admin-content.yaml` — falls admin-content-Projektionen betroffen.
- `docs/api/api-contracts.md` — Contract-Regeln.
- `frontend/src/lib/api.ts` — zentraler API-Client/Typen (kein ad-hoc-Fetch, Lock K).

### Bestehende relevante Tabellen/Felder (Wiederverwendung statt Neubau)
- `anime_contributions`, `anime_contribution_roles`, `release_member_roles` —
  Contribution-/Rollen-Modell (bestehender Status draft/proposed/confirmed).
- `fansub_group_members`, `fansub_group_member_roles`, `hist_fansub_group_members`,
  `hist_group_member_roles` — Mitglieds- vs. historische Quellen (Trennung D-01-Kontext).
- `members`, `member_badges`, `media_assets.owner_member_id` — Member-Profil/Medien.
- `media_assets`, `media_files` (Status-Spalten aus Phase 34/35), `visibilities`
  (Lookup, Migration 0037).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `visibilities`-Lookup-Tabelle (Migration 0037) → Achse 1 der Sichtbarkeit (D-03),
  nicht neu erfinden.
- `media_assets`/`media_files` haben bereits Status-Spalten (Phase 34/35) und
  `owner_member_id` (Phase 70, Migration 0089) → Basis für Owner/Review-Metadaten (D-03),
  prüfen ob erweiterbar statt additiv.
- Bestehender Contribution-Status (draft/proposed/confirmed, Phasen 62/65) → bleibt der
  inhaltliche Status; Konflikt kommt als separate Dimension daneben (D-01).
- Bestehende Repository-/Handler-Schichtung pro Domäne (`backend/internal/repository/`,
  `backend/internal/handlers/`) → Projektionen dort einhängen; 450-Zeilen-Limit beachten.

### Established Patterns
- Append-only Migrationen unter `database/migrations/` (nächste freie Nummer prüfen;
  vgl. 0089/0091 bereits vergeben).
- Envelope-Konvention `{"data": ...}` (vgl. STATE-Decisions Phase 62 D3).
- Contract-zuerst (Lock K): OpenAPI + DTO + Repo + `api.ts`-Typen gemeinsam.

### Integration Points
- Lese-Projektionen speisen später die Public-Surfaces (73/74/75), das
  Beitragsdashboard (76), die Leader-Review (78) und `/admin/users` (80).
- Keine Schreib-Endpunkte in 72; nutzende Phasen verdrahten Writes gegen die hier
  definierten Felder/Contracts.

</code_context>

<specifics>
## Specific Ideas

- Konkreter Use-Case Konflikt (Grundlage D-01): Leader trägt historischen Credit
  „Yuna – Übersetzung" ein (`anime_contributions`, confirmed); die echte (geclaimte)
  Yuna bestreitet via „Das war ich nicht" → `dispute_state=open`, Eintrag bleibt,
  Leader/Admin entscheidet in Phase 78 (recht geben / belegen / Rolle korrigieren),
  alles auditierbar.

</specifics>

<deferred>
## Deferred Ideas

- **Schreib-Flows** für memorial/dispute/review/visibility → jeweils nutzende Phasen
  (74/76/78/80).
- **Memorial-Setter + Claim-Sperre** → Phase 74 (D-06).
- **Mehrfach-/parallele Anfechtungen mit eigener Historie** (eigene Dispute-Tabelle,
  Option C) → bewusst NICHT in v1.2; nur eine Konflikt-Dimension (D-01). Falls später
  Bedarf, eigener Slice.
- **Public-Darstellung** der Trennung Mitglied/Mitwirkender und der Sichtbarkeitsregeln
  → Phasen 73/74/75.

</deferred>

---

*Phase: 72-Domänen-Projektionen & Status-Fundament*
*Context gathered: 2026-06-03*
