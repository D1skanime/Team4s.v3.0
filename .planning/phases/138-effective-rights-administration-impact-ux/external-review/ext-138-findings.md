---
phase: 138-effective-rights-administration-impact-ux
type: external-review
status: advisory
---

# Phase 138 — External Planning Pack: Cross-Check Findings

## Was ist das hier?

`external-review/` enthält ein vollständiges, extern (ChatGPT) erzeugtes Planungspaket für Phase 138
(`ext-138-01-plan.md` … `ext-138-08-plan.md`, plus `ext-138-context.md`, `ext-138-research.md`,
`ext-README-EXECUTION.md`).

**Dieses Paket ist NICHT der Phasenplan.** Die Dateien sind bewusst `ext-*-plan.md` benannt (nicht
`138-NN-PLAN.md`), damit GSD sie nicht als ausführbare Pläne einliest. Sie dienen ausschliesslich als
**Gegenprüfung** für die GSD-Pläne: als zweite Meinung zum Wave-Schnitt und als Checkliste, ob beide
Seiten dieselben Lücken haben.

Autoritativ bleiben: `138-CONTEXT.md` (D-01…D-35), `138-RESEARCH.md` (GSD-Research, live gegen Code
und `team4s_v2` verifiziert), `138-VALIDATION.md` und die daraus erzeugten `138-NN-PLAN.md`.

---

## Verifizierter Stand (2026-08-23, gegen den echten Code auf team4s-linux geprüft)

### Was am externen Paket belastbar ist

Alle referenzierten Pfade existieren — keine halluzinierten Dateien. Stichprobenartig direkt geprüft:

- `backend/cmd/server/admin_routes.go:267-269` — die drei Phase-137-Routen stimmen wörtlich:
  `GET /admin/fansubs/:id/app-members/:appUserId/effective-rights`,
  `PUT …/capability-overrides`, `GET …/capability-overrides/history`.
- `frontend/src/types/admin-capability.ts` — `EffectiveRightState` (112), `CapabilityOverrideAuditItem`
  (157), `CapabilityOverrideMutationResult` (169), `CapabilityOverrideMutationRequest` (178);
  Felder `non_deniable` (117), `granting_roles` (119), `decisive_source` (127), `user_overridable` (14).
- `backend/internal/handlers/admin_capability_handler.go:182/257` — generische Erfolgsantwort
  `{"message": "Capability erfolgreich zugewiesen."}`; ReloadCache-Fehler wird auf 168/243 nur geloggt.
  **Der CAP-10-Kernbefund des externen Pakets ist korrekt.**
- Weitere geprüfte Referenzen existieren alle: `authz_capability_mutations.go`, `admin_users_tab_repository.go`,
  `permissions/effective_rights.go`, `RoleMasterList.tsx`, `RoleCapabilityDetail.tsx`,
  `FansubAppMembersOverview.tsx`, `ClaimManagementPanel.tsx`, `scripts/phase135-green-gate.sh`,
  `api.auth-refresh.test.ts`, `getAdminUserGroupRights` (`api.ts:3738`).

Brauchbar übernehmbar sind ausserdem:

- der **Wave-Schnitt** (Shell/IA → Contracts → zwei kanonische Mutations-Workflows → Integration → Gate),
- die **Boundary-Liste** aus `ext-README-EXECUTION.md` (kein zweiter Resolver; keine Autorisierung aus
  Rollen-Labels; HTTP 200 ist kein Beweis für aktiven Cache; kein Phase-139-Vorgriff; zentraler
  refresh-fähiger API-Client statt Komponenten-Token),
- die Selbstbeschränkung „`getAdminUserGroupRights` verliert den Kanon-Status, bleibt aber vorerst
  in `api.ts` für andere Consumer" (`ext-138-03-plan.md`, Task 1).

### Defekte — hier weicht das externe Paket von der Realität ab

**F-01 — Contract-Fork bei der Impact-Preview (blockierend, wenn übernommen).**
`ext-138-04-plan.md` Task 1 will `RoleCapabilityImpactPreview` neu einführen. Es existiert aber bereits
ein vertraglich gelockter Typ aus Phase 136 — `CapabilityOverrideImpactPreview` /
`CapabilityOverrideImpactItem` in `backend/internal/handlers/capability_policy_contract.go:122-131`,
heute mit **null Producern** (nur Contract-Parity-Tests referenzieren ihn). Der bestehende Typ ist die
Zielform; er darf erweitert werden (die Rollen-Sicht braucht zusätzlich Rolleninhaber-Zahl und
gain/lose/retain-Aufschlüsselung für D-19), aber es darf kein zweiter, konkurrierender Preview-DTO
danebengestellt werden. Das verletzt D-35 (Contract-Kette) und die eigene Regel des Pakets
(„do not fork equivalent types").

**F-02 — Reale Capability-Kategorien fehlen.**
Live gegen `team4s_v2` sind es exakt 7 Kategorien / 35 Actions: `gruppe` (14), `gruppenmedien` (3),
`gruppenseite` (4), `projekt` (1), `rechteverwaltung` (1), `release` (9), `review` (3).
Das externe Paket schreibt korrekt „per canonical metadata, nie per Prefix", kennt die realen Werte
aber nicht. Nebenbefund aus dem GSD-Research: `capabilityCategories.ts` `CATEGORY_LABEL_MAP` mappt nur
`gruppe`/`projekt`/`release`; die übrigen vier laufen in den `capitalizeFirst`-Fallback — funktioniert,
sollte aber eine bewusste Label-Entscheidung werden statt ein Zufall.

**F-03 — Der Beiträge-Fix (D-29) greift zu kurz.**
`ext-138-07-plan.md` Task 3 fasst nur `UserContributionsTab.tsx` an („remove
release_version_id-as-version presentation"). Das entfernt das falsche Label, liefert aber nie die
fachlich korrekte Form `Buddy Complex · Episode 1 · Version 1`. Der reale Fix-Ort liegt laut
GSD-Research im Backend: `admin_users_tab_repository.go` `ListUserContributions` selektiert heute nur
`release_versions.id`. Nötig ist ein additiver JOIN auf `release_versions.version` und
`episodes.episode_number` (über `fansub_releases`) plus Durchreichen in Go-Model → `admin-users.ts` →
Komponente. Keine Migration nötig, kein Phase-139-Vorgriff.

**F-04 — Ein live existierender Blocker fehlt komplett.**
`PlatformAdminGate` unmountet seine Children beim Token-Refresh (bekanntes, unpatchtes Live-Finding,
siehe `.planning/notes/live-uat-ux-findings.md` und GSD-Research Pitfall 6). Genau die neuen
Impact-/Override-Dialoge sind davon betroffen: ein Admin verliert mitten in einer offenen
Bestätigung seinen Zustand. Das externe Paket erwähnt es an keiner Stelle.

### Abdeckungslücken gegen 138-CONTEXT.md

- **D-22** — Impact Preview bei `Rolle zuweisen` / `Rolle entfernen` für einen einzelnen Benutzer:
  in keinem der acht externen Pläne enthalten. `ext-138-06-plan.md` liefert nur die Rollen-Analysesicht
  und Cross-Navigation, keine Auswirkungs-Vorschau auf die Zuweisung selbst.
- **D-24** — Claim-Genehmigung mit Rechte-Auswirkungs-Vorschau: fehlt in den `must_haves.truths` von
  `ext-138-07-plan.md`. (GSD-Research Pitfall 4 weist zusätzlich darauf hin, dass die Annahme
  „Claim-Genehmigung ändert automatisch effektive Rechte" gegen den echten Code zu prüfen ist —
  D-24 ist also zu erfüllen, aber ehrlich, nicht als angenommene Automatik.)
- **D-06** — Gruppenansicht mit eigenen Tabs `Benutzer | Rollen | Claims | Änderungen`: auf Cross-Links
  in `FansubAppMembersOverview.tsx` reduziert, keine Tab-Struktur.
- Umfang generell: 8 Pläne. Vergleichswerte im selben Repo: Phase 137 = 14 Pläne, Phase 136 = 31.

---

## Wie die GSD-Pläne dagegen zu prüfen sind

Nach `plan-phase` gegen diese Liste abgleichen:

1. Nutzen die Pläne `CapabilityOverrideImpactPreview` (erweitert) statt eines neuen Typs? → F-01
2. Kommen die 7 realen Kategorien vor, nicht die Beispielliste aus D-12? → F-02
3. Enthält der D-29-Fix den Backend-JOIN, nicht nur das Entfernen des Badges? → F-03
4. Ist der `PlatformAdminGate`-Remount adressiert oder bewusst als Risiko dokumentiert? → F-04
5. Sind D-22, D-24 und D-06 jeweils einem Plan zugeordnet?
6. Sind die Boundary-Regeln aus `ext-README-EXECUTION.md` inhaltlich abgedeckt?

Findet der Abgleich Lücken auf GSD-Seite, sind sie über den normalen Planner-/Checker-Loop zu
schliessen — nicht durch Übernahme der externen Plandateien.
