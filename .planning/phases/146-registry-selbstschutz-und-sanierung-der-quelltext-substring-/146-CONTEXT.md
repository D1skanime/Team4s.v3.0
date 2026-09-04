# Phase 146: Registry-Selbstschutz und Sanierung der Quelltext-Substring-Tests - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning
**Source:** Orchestrator-synthetisiert aus dem `/gsd-plan-phase 146`-Aufruf des Nutzers — kein separater
`discuss-phase`-Lauf. Der Nutzer hat die Entscheidungen bereits in der gleichen Tiefe wie ein
discuss-phase-Ergebnis geliefert und ausdrücklich als "getroffen, nicht neu zu verhandeln" markiert.

<domain>
## Phase Boundary

Zwei Blöcke in einer Phase, in dieser Reihenfolge geplant und umgesetzt:
- **Block 1** (Kriterien 1–4): Registry-Selbstschutz — schließt eine reale Absturzschleife im
  Backend-Start, auslösbar durch reguläre Admin-UI-Bedienung ohne Datenbankzugriff.
- **Block 2** (Kriterien 5–8): Sanierung der sicherheitsrelevanten Quelltext-Substring-Tests, plus
  ein automatischer Guard gegen Neuzugänge und ein dokumentierter, benannter Restbestand.

Requirements sind bewusst TBD — additive Nacharbeit aus `145-REVIEW.md` und Altlast WR-02 aus
`144-REVIEW.md`, kein v1.4-Requirement-Mapping, kein Milestone-Reset. Die 8 Erfolgskriterien aus
`.planning/ROADMAP.md` (Zeilen 889–898) sind der einzige Vertrag dieser Phase.

</domain>

<decisions>
## Implementation Decisions

### Block-Reihenfolge
- **D-01:** Block 1 (Registry-Selbstschutz, Kriterien 1–4) wird zuerst geplant/umgesetzt — kleiner,
  dringender, betrifft live ausgelieferten Code. Block 2 (Testsanierung, Kriterien 5–8) folgt danach.

### Block 1 — Registry-Selbstschutz
- **D-02:** `CountRolesWithAction` in `backend/internal/repository/authz_capability_mutations.go`
  (~Zeile 334) zählt per `SELECT COUNT(DISTINCT role_code) ... WHERE action_code = $1` ALLE Rollen
  mit dieser Action — nicht nur die reservierte Pseudo-Rolle. Der Fix muss den Lockout-Guard so
  korrigieren, dass er beim Entfernen einer der drei Baseline-Actions von der reservierten
  Pseudo-Rolle tatsächlich greift, während er für alle anderen Rollen unverändert funktionsfähig
  bleibt (Kriterium 1 verlangt ausdrücklich Bestandsschutz für den bestehenden Guard).
- **D-03:** Kriterium 1 verlangt einen Test, der den Mutationspfad DURCHSPIELT (echter Aufruf,
  Prüfung von Statuscode/Response-Body) — kein Quelltext-Substring-Test, der die Ablehnung aus dem
  Quelltext erschließt.
- **D-04:** `ListGroupHistoryRoleDefinitions` bekommt denselben `NOT reserved`-Filter wie seine drei
  Geschwisterabfragen aus Phase 145. Kriterium 3 verlangt einen Test gegen echtes Postgres, der für
  alle VIER Abfragen (die drei aus Phase 145 plus diese) belegt, dass die reservierte Pseudo-Rolle
  in keiner auftaucht.
- **D-05:** Die drei Baseline-Action-Codes (`fansub_group.members.view`, `fansub_group_media.view`,
  `fansub_group_media.upload`) sind aktuell dreifach hartkodiert: Migration, Go-Validator
  (`validateMembershipBaselineRegistryPresence` in `backend/internal/permissions/`), TS-Filter
  (`membershipBaselineCodes` in `RoleCapabilityDetail.tsx`). Kriterium 4 verlangt eine einzige
  autoritative Quelle; verbleibende Verwendungen leiten sich davon ab oder sind durch einen
  Anti-Drift-Test gesichert.
- **D-06:** UI-Vertrag für Kriterium 2 ist bereits fertig und verbindlich in `146-UI-SPEC.md`
  (6/6 abgenommen) — NICHT neu verhandeln. Zusammenfassung: die 3 Baseline-Switch-Zeilen der
  reservierten Pseudo-Rolle bleiben interaktiv (kein `disabled`), bekommen `Badge variant="info"` +
  `Lock`-Icon + sichtbaren Text „Geschützt" plus eine `visually-hidden`-Beschreibung, verdrahtet über
  `aria-describedby` am `Switch`. Die Ablehnung läuft über den bereits vorhandenen
  `mutationError`-Pfad in `RoleCapabilityImpactPreviewModal.tsx` — dort KEINE Codeänderung nötig.
- **D-07:** Der Phase-145-Test in `RoleCapabilityDetail.test.tsx` mit dem Namen
  „keine Sonderbehandlung" behauptet heute das Gegenteil dessen, was Kriterium 2 baut, und muss
  umgeschrieben werden.

### Block 2 — Testsanierung
- **D-08:** Erste Aufgabe von Block 2: die Filterregel festnageln, die entscheidet, welche
  Testdateien „sicherheitsrelevant" sind (Kriterium 5/6 Zähler). Ausgangslage laut frischer Messung
  (`.planning/notes/2026-09-04-messung-substring-tests.md`, Skript
  `.planning/notes/measure-substring-tests.py`): Roadmap nennt 17, die Messung mit einem
  Dateiname+Dateikopf-Filter (permission, authz, capability, preview, 403, forbidden,
  effective_right, whitelist, delegation, role_catalog, reserved) findet 20 Kandidaten (davon 4 mit
  `contains=0`). Die 20 Kandidatendateien stehen namentlich in der Messnotiz. Ohne festgenagelte
  Regel sind Kriterium 5 und 6 nicht messbar — Kriterium 6 verlangt exakt 17 Abgänge (von 53 auf
  höchstens 36 verbleibende Dateien).
- **D-09:** Die gewählte Filterregel muss identisch mit der sein, die der Guard aus Kriterium 7
  durchsetzt (eingefrorene, nur schrumpfende Ausnahmeliste nach dem Vorbild von
  `LEGACY_NO_RESTRICTED_SYNTAX_FILES` in `frontend/eslint.config.mjs`).
- **D-10:** Kriterium 5 erlaubt Quelltextsuche weiterhin für: (a) Abwesenheitsprüfungen (ein
  Bezeichner darf NIRGENDS in der Datei vorkommen) und (b) Dateien, die selbst der geprüfte
  Gegenstand sind (z. B. SQL-Migrationen). Diese Ausnahmen entsprechen der `CLAUDE.md`-Teststil-
  Konvention.
- **D-11:** Kriterium 8 verlangt, den nach Sanierung bewusst stehen gelassenen Restbestand mit Grund
  je Datei zu dokumentieren — kein stillschweigender Verzicht.
- **D-12:** Backend-Tests, die eine Datenbank brauchen, laufen gegen echtes Postgres, nach dem Muster
  bestehender Repository-Tests (nicht gemockt).

### Claude's Discretion
- Exakte Filterregel-Implementierung (Dateiliste vs. Namens-/Inhalts-Heuristik) für den Guard aus
  Kriterium 7, solange sie identisch mit der Kriterium-5/6-Zählregel ist und nur schrumpfen kann.
- Reihenfolge und Gruppierung der final festgelegten sicherheitsrelevanten Testdateien über mehrere
  Pläne/Waves.
- Exakter deutscher Wortlaut jenseits des durch UI-SPEC bereits festgelegten „Geschützt"-Textes und
  des `mutationError`-Ablehnungspfads.

</decisions>

<specifics>
## Specific Ideas

- Auslösbarkeit des Bugs: „mit zwei Klicks in der regulären Admin-Oberfläche, ohne Datenbankzugriff"
  — das ist der Kern der Dringlichkeit von Block 1.
- Migrationen sind append-only; die nächste freie Nummer nach 0160 verwenden.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap-Vertrag
- `.planning/ROADMAP.md` Zeilen 874–901 (Phase 146) — Goal, Ausgangsbefund, alle 8 Erfolgskriterien
  wörtlich, Zuschnitt in zwei Blöcke

### UI-Vertrag (Kriterium 2)
- `.planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-UI-SPEC.md`
  — abgenommener Interaktionsvertrag für die geschützten Baseline-Switch-Zeilen; keine
  Neuverhandlung

### Messgrundlage (Kriterien 5–8)
- `.planning/notes/2026-09-04-messung-substring-tests.md` — frische Bestandsaufnahme, Definitionsfrage
  17 vs. 20 sicherheitsrelevante Dateien, vollständige Dateiliste
- `.planning/notes/measure-substring-tests.py` — reproduzierbares Messskript

### Vorarbeit / Nacharbeits-Quelle
- `.planning/phases/145-mitgliedschafts-grundausstattung-in-die-rechte-registry-berf/145-REVIEW.md`
  — Ursprung des Registry-Befunds
- `.planning/notes/2026-09-02-altlasten-cr01-wr02.md` — WR-02, ältere (durch die frische Messung
  überholte) Schätzung zu den Substring-Tests

### Code-Fundstellen (aus dem Ausgangsbefund, am Code gegenzuprüfen statt zu übernehmen)
- `backend/internal/repository/authz_capability_mutations.go` (~Zeile 334) — `CountRolesWithAction`
- `backend/cmd/server/main.go` (~Zeile 138) — `log.Fatalf` bei `LoadCache`-Abbruch
- `backend/internal/permissions/` — `validateMembershipBaselineRegistryPresence`
- `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` — `membershipBaselineCodes`
- `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` — Test „keine Sonderbehandlung"
- `frontend/src/app/admin/roles/RoleCapabilityImpactPreviewModal.tsx` — bestehender
  `mutationError`-Pfad
- `frontend/eslint.config.mjs` — Vorbild `LEGACY_NO_RESTRICTED_SYNTAX_FILES` für den Guard aus
  Kriterium 7

</canonical_refs>

<deferred>
## Deferred Ideas

None — der Phasenumfang ist vollständig durch die 8 Erfolgskriterien in ROADMAP.md begrenzt; keine
zusätzlichen Ideen sind bei der Kontextaufnahme aufgetaucht.

</deferred>

---

*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Context gathered: 2026-09-04 (orchestrator-synthetisiert aus dem Nutzer-Brief, kein separater
discuss-phase-Lauf)*
