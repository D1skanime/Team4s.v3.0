# Phase 109: Ranglisten und Punkteprojektionen - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 109 leitet aus dem bestehenden append-only Punktebuch (`point_ledger_entries`)
**ausschließlich die Netto-Gesamtpunktzahl pro Member** ab und stellt sie serverseitig
bereit — eine Zahl pro `members`-Identität, absteigend sortierbar. Das ist das gesamte
Backend-Fundament für die spätere Ranglisten-UI und die Badges.

Phase 109 **bucht nichts**. Die Punkte liegen bereits als Ledger-Zeilen vor (geschrieben
im Bestätigungspfad der Phasen 106–108). Diese Phase liest nur und summiert.

**Bewusst NICHT in dieser Phase** (per Nutzerentscheidung, siehe D-03/D-04):
- keine Gruppen-, Kategorie- oder Zeitraum-Ranglisten
- keine Auflistung/Aufschlüsselung, wofür ein Member Punkte bekommen hat
- keine UI, kein Einstiegspunkt, keine Anzeige am Member-Profil, keine Badges

</domain>

<decisions>
## Implementation Decisions

### Was Phase 109 liefert
- **D-01:** Im Kern ist eine Rangliste einfach: **Netto-Punktsumme pro Member,
  absteigend sortiert.** Netto heißt: Summe über `point_value` inklusive der negativen
  Reversal-Buchungen (append-only, nichts wird gelöscht). Empfänger ist immer die
  `members`-ID, nie der bestätigende Akteur/`app_user`.
- **D-02:** Es entsteht keine neue Schreib-Logik im Buchungspfad. Phase 109 ist rein
  ableitend/lesend über dem vorhandenen Ledger.

### Bewusste Scope-Reduktion (Nutzerentscheidung)
- **D-03:** Für Phase 109 wird **nur das globale Allzeit-Total** gebaut. Gruppen-,
  Kategorie- und Zeitraum-Schnitte werden ausdrücklich **nicht** umgesetzt. Begründung
  des Nutzers: „das braucht es sicher noch nicht". Nebeneffekt: die `effective_at`-vs-
  `recorded_at`-Falle (historische Arbeit heute erfasst darf nicht als heutige Aktivität
  zählen) entsteht gar nicht erst, weil es keinen Zeitraum-Schnitt gibt.
- **D-04:** Es wird **keine Detail-Historie/Aufschlüsselung** pro Member gebaut („wofür
  gab es die Punkte"). Diese Rohdaten stehen ohnehin im Ledger und können bei Bedarf
  später direkt aus der DB gezogen werden.

> **Divergenz zur ROADMAP.md:** Der Roadmap-Zieltext und die Success Criteria von
> Phase 109 nennen zusätzlich gruppenbezogene, kategoriale und zeitbezogene Ranglisten
> sowie Voraggregation/Lasttests. Diese sind per D-03/D-04 bewusst zurückgestellt.
> **Dieser CONTEXT ist für die Planung maßgeblich** — der Planner baut nur das globale
> Allzeit-Total. Die Roadmap sollte entsprechend nachgezogen werden (offener Punkt).

### Claude's Discretion
- **Berechnungsart:** Ob die Summe je Anfrage live aus dem Ledger gerechnet
  (`SUM(point_value) GROUP BY member_id`) oder als vorgehaltene Summe bereitgestellt wird,
  ist reine Bauentscheidung und wird beim Planen/Implementieren festgelegt. Vom Nutzer
  ausdrücklich an den Builder delegiert.
- **Bauhygiene:** Die Ableitung so schreiben, dass spätere Filter (Gruppe/Kategorie/Zeit)
  ohne Umbau ergänzt werden können — kostet nichts extra, ist aber kein Feature dieser Phase.
- Exakte Endpunkt-/DTO-Benennung und Repository-Aufteilung, solange kein zweites
  Punktebuch und keine zweite Member-Identität entsteht.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Verbindlicher Phase-Kontext
- `.planning/ROADMAP.md` — Phase-109-Grenze; durch D-03/D-04 dieses Kontexts auf das
  globale Allzeit-Total reduziert.
- `.planning/REQUIREMENTS.md` — GAM-01…GAM-05 (Member-zentrierte, versionierte,
  append-only Punkte).
- `.planning/phases/106-member-gamification-punktefundament/106-CONTEXT.md` — Member-zentriertes,
  versioniertes, append-only Punktefundament (Empfänger = `members`).
- `.planning/phases/108-bestehende-beitragsquellen-anbinden/108-CONTEXT.md` — Buchungs-,
  Storno- und Idempotenzsemantik; Netto-Summe inkl. Gegenbuchungen.

### Code-Seams
- `backend/internal/repository/point_ledger_repository.go` — Ledger-Struktur und -Spalten,
  über die summiert wird (`member_id`, `point_value`, `entry_kind`, `effective_at`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/repository/point_ledger_repository.go`: append-only Ledger. Award-Zeilen
  tragen positive, Reversal-Zeilen negative `point_value`; eine reine `SUM(point_value)
  GROUP BY member_id` ergibt bereits die korrekte Netto-Summe.

### Established Patterns
- Punkte gehören `members`; `app_users` sind nur optionale Akteure — die Projektion keyed
  immer auf `member_id`.
- Korrekturen sind Gegenbuchungen, keine Updates/Deletes — daher ist die Summe stets
  vollständig aus dem Ledger rekonstruierbar.
- API-Änderungen ziehen Backend, `shared/contracts/openapi.yaml`, Frontend-Typen und
  `frontend/src/lib/api.ts` gemeinsam nach.

### Integration Points
- Ein lesender Endpunkt liefert „Member → Netto-Gesamtpunkte" (sortiert). Konsument ist
  die Phase-110-UI/Badges.

</code_context>

<specifics>
## Specific Ideas

- Mentales Modell des Nutzers: „am Ende muss doch einfach das Total an Punkten angezeigt
  werden. fertig." Alles Weitere steht im Ledger und kann bei Bedarf später aus der DB
  gezogen werden.

</specifics>

<deferred>
## Deferred Ideas

Diese Punkte kamen in der Diskussion auf und gehören **in Phase 110**
(„Member-Badges, Ranglisten-UI und E2E-Abnahme") — nicht verlieren:

- **Ranglisten-UI-Einstieg:** Wie kommt ein ganz normaler User auf die Ranglisten-Ansicht
  (Navigation/Einstiegspunkt)?
- **Punkte am Member:** Wo werden die Punkte beim Member selbst angezeigt (Profil)?
- **Badges/Auszeichnungen:** Wofür gibt es Badges — z. B. „X Punkte auf Beiträge"? Die in
  Phase 109 bereitgestellte Punktsumme ist die Grundlage dafür.
- **Zusätzliche Ranglisten-Schnitte:** Gruppe, Kategorie und Allzeit-vs-aktueller-Zeitraum
  bleiben zurückgestellt, bis die UI sie wirklich braucht (dann inkl. der `effective_at`-
  vs-`recorded_at`-Zeitsemantik).

</deferred>

---

*Phase: 109-ranglisten-und-punkteprojektionen*
*Context gathered: 2026-07-26*
