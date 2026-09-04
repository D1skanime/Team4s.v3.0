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

### Block 1 — Zusatzbefund aus dem Research: 38-gegen-3-Anzeige und fehlender Grant-Guard
(Nutzerentscheidung nach Research, 2026-09-04 — verbindlich, ersetzt die ursprüngliche Rahmung des
Research-Berichts)

**Korrektur der Rahmung (verbindlich für alle Pläne, Tasks, Testnamen und Threat-Model-Abschnitte):**
- **D-13:** `backend/internal/permissions/permissions.go` (~Zeile 534 und ~Zeile 623) enthält einen
  bedingungslosen Plattform-Admin-Bypass VOR jeder Rollenprüfung
  (`if actor.IsPlatformAdmin { return Result{Allowed: true, ReasonCode: ReasonPlatformAdmin ...} }`),
  festgeschrieben durch Phase 136 Erfolgskriterium 1: der IdP-eigene Plattform-Admin-Bypass ist durch
  Gruppen-Kontrollen nicht verweigerbar. Ein Plattform-Admin, der die Capability-Matrix bearbeitet,
  nutzt genau die Befugnis, für die die Oberfläche gebaut wurde — das ist **keine Rechte-Eskalation
  und keine Sicherheitslücke**. Der Bypass wird in dieser Phase NICHT angetastet, nicht eingeschränkt
  und nicht mit zusätzlichen Prüfungen umstellt. Diese Rahmung ersetzt die im ursprünglichen
  `146-RESEARCH.md` verwendete Formulierung „stille plattformweite Rechteausweitung" — letztere ist
  fehlerhaft und darf in keinem Plan-Artefakt wiederholt werden.
- **D-14:** Tatsächlich zu behebende Probleme sind (1) **Betriebssicherheit** — eine erlaubte Aktion
  darf nicht den nächsten Backend-Start unmöglich machen und die Reparatur-Oberfläche mit sich
  reißen (unveränderter Kern der Kriterien 1–4), und (2) **Konsistenz** — jede normale Rolle wird in
  `RoleCapabilityDetail.tsx` gefiltert dargestellt, die als `reserved` markierte Pseudo-Rolle aktuell
  nicht, obwohl sie als eingeschränkt konzipiert ist.

**Antwort auf Frage 1 — 38-gegen-3 wird in dieser Phase behoben, keine eigene Phase:**
- **D-15:** In `RoleCapabilityDetail.tsx` bekommt der `isReservedBaseline`-Zweig von
  `configurableActions` einen Filter auf `membershipBaselineCodes`, statt `role.actions` ungefiltert
  durchzureichen. Die Badge- und `aria-describedby`-Verträge aus `146-UI-SPEC.md` bleiben unverändert
  gültig und gelten für genau die 3 verbleibenden Zeilen — keine Neuverhandlung der UI-SPEC, nur die
  bereits vorausgesetzte Prämisse „genau 3 Zeilen" wird jetzt tatsächlich wahr.

**Antwort auf Frage 2 — Backend-Guard auch beim Granten, ja:**
- **D-16:** Der Server lehnt zusätzlich das Zuweisen (Grant) einer Nicht-Baseline-Action an
  `group_member` ab, nicht nur das Entziehen (Revoke) einer Baseline-Action. Beide Richtungen mit
  sprechender deutscher Meldung, korrekten Umlauten, kein roher Serverfehler. Damit ist der Zustand
  der reservierten Rolle serverseitig auf genau die drei Grundrechte festgelegt; die Oberfläche
  (D-15) ist die zweite Verteidigungslinie, nicht die einzige.

**Drei nachgemessene Zusatzfakten (2026-09-04, live gegen `team4s_v2`):**
- **D-17:** (vierte betroffene Abfrage + Falle) `GrantCapability` UND `RevokeCapability` in
  `backend/internal/handlers/admin_capability_handler.go` (~Zeile 170 bzw. ~Zeile 235) benutzen
  denselben Guard `permissions.IsCapabilityBearingRole`, gespeist aus `capabilityRoleCatalog`,
  gefüllt von `LoadCapabilityRoles` in `backend/internal/repository/authz_permissions.go`
  (~Zeile 470). Dessen Query filtert nur auf `'fansub_group' = ANY(contexts)` und
  `code <> 'founder'` — ihm fehlt der `NOT reserved`-Filter. Live gemessen: `group_member` steht als
  erster von 15 Einträgen in diesem Katalog, deshalb läuft der Grant-Pfad ungehindert durch. Das ist
  eine VIERTE betroffene Abfrage, die der ursprüngliche Roadmap-Befund nicht kennt.
  **Falle, ausdrücklich zu vermeiden:** `NOT reserved` einfach in `LoadCapabilityRoles` zu ergänzen
  ist NICHT die Lösung — da Grant und Revoke sich denselben Guard teilen, würde die Pseudo-Rolle
  dadurch komplett uneditierbar (beide Pfade würden mit 422 und der generischen, hier inhaltlich
  falschen Meldung „Diese Beitrags- oder historische Rolle kann keine Standardrechte erhalten"
  antworten). Das bricht Kriterium 2, das interaktive Switches und eine sprechende, zutreffende
  Meldung verlangt. Der neue Guard muss **action-spezifisch** sein (welche Action ist an dieser Rolle
  erlaubt), nicht rollen-pauschal über `IsCapabilityBearingRole`. Die Planung muss ausdrücklich
  behandeln, ob/wie `LoadCapabilityRoles` angefasst wird, und Kriterium 4 (eine autoritative Quelle
  für die drei Baseline-Codes) so zuschneiden, dass sie diesen neuen Guard trägt.
- **D-18:** (Zahlen) `action_definitions` hat 38 Zeilen, `role_capabilities` für `group_member`
  genau 3. `role_definitions` für `group_member`: `assignable=false`, `reserved=true`,
  `contexts={fansub_group}`, `sort_order=-10`. Eine Action (`fansub_group.invitations.accept`) ist
  standalone und wird nicht als Switch gerendert — die ungefilterte Ansicht ergibt somit **37**
  Switches, davon **34** nicht gewährt (präzisiert gegenüber der ersten, grob gerundeten
  Research-Fassung).
- **D-19:** (UAT-/Test-Lücke, in dieser Phase zu schließen) Das `Accordion` mountet eingeklappte
  Kategorien nicht (`isMounted = isOpen || keepMountedIds?.has(id)`), der Phase-145-UAT-Prüfer hatte
  2 von 8 Kategorien offen und sah dort korrekt 3 Switches. Der bestehende Unit-Test in
  `RoleCapabilityDetail.test.tsx` füttert eine Fixture mit genau 3 Fake-Actions und übt die reale
  38-Actions-Form nie aus. Beide Lücken müssen in dieser Phase geschlossen werden: ein Test mit der
  realen Action-Menge, der belegt, dass für die reservierte Rolle über ALLE Kategorien hinweg genau
  3 Switches erscheinen.

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
