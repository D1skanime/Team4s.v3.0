# Phase 82: Mitwirkende projektweit zuordnen + Projekt-Cockpit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 82-Mitwirkende projektweit zuordnen + Projekt-Cockpit
**Areas discussed:** Dedup ohne Claim, Standard-Team, Rollen-Spalten, Rollen-Seeding, Einordnung Anime-Einblicke

---

## Dedup ohne Claim

| Option | Description | Selected |
|--------|-------------|----------|
| Verknüpfen + Hinweis | Verdacht „möglicherweise dieselbe Person", Leader verschmilzt per Aktion; kein stiller Merge | |
| Strikt: Claim zuerst | Person muss erst verknüpft/geclaimt sein, bevor buchbar | |

**User's choice:** Out of scope für die Anime-Veröffentlichungen — der Claim (historisch ↔ eingeloggter User) ist eine Aufgabe im Fansub-Members-Bereich und dort bereits integriert.
**Notes:** Phase 82 konsumiert nur die vereinheitlichte Personenliste; kein Merge-/Claim-UI in der Mitwirkenden-/Matrix-Oberfläche.

---

## Standard-Team

| Option | Description | Selected |
|--------|-------------|----------|
| Feste Crew pro Gruppe | Stamm-Besetzung Rolle→Person je Gruppe; „Team übernehmen" füllt leere Projekte | ✓ |
| Von Projekt kopieren | Crew eines Projekts auf ein anderes übertragen | |
| Beides anbieten | Feste Crew + Kopier-Aktion | |

**User's choice:** Feste Crew pro Gruppe.
**Notes:** Wichtig — eine Person kann mehrere Rollen haben (Rolle↔Person many-to-many), kein 1:1.

---

## Rollen-Spalten

| Option | Description | Selected |
|--------|-------------|----------|
| Konfigurierbar pro Gruppe | Gruppe wählt sichtbare Katalog-Rollen; Rest im Popover | ✓ |
| Feste Kern-Rollen | Fixe Standard-Spalten für alle Gruppen | |

**User's choice:** Konfigurierbar pro Gruppe.

---

## Rollen-Seeding

| Option | Description | Selected |
|--------|-------------|----------|
| Nur operative als Default | Operative Rollen vorausgefüllt; Leadership nicht automatisch | ✓ |
| Alle Gruppen-Rollen | Auch Leadership als Anime-Credit | |
| Kein Auto-Default | Rollen immer manuell | |

**User's choice:** Nur operative Rollen als Default.

---

## Einordnung Anime-Einblicke

| Option | Description | Selected |
|--------|-------------|----------|
| Eigene Folgephase 83 | Phase 82 Cockpit-Gerüst + Mitwirkende; Phase 83 Einblicke einstecken | |
| In Phase 82 zusammenlegen | Ein Cockpit-Feature: Mitwirkende + Einblicke + Status + Filter + Routing | ✓ |
| Cockpit-Scaffold zuerst trennen | Gerüst als eigene Vorphase, dann 82/83 einstecken | |

**User's choice:** In Phase 82 zusammenlegen.
**Notes:** Verbindlicher Auftrag als `82-EINBLICKE-AUFTRAG.md` abgelegt.

## Projektleiter (project_lead)

| Option | Description | Selected |
|--------|-------------|----------|
| Hervorgehobene Einzelrolle, max. 1 | project_lead pro Projekt genau einer Person, in Matrix hervorgehoben | |
| Normale Rolle wie andere | project_lead = normale Katalog-Rolle, mehrfach möglich, keine Sonderdarstellung | ✓ |
| Eigenes Feld am Projekt | Separates Leitungsfeld statt Mitwirkenden-Credit | |

**User's choice:** Normale Rolle wie andere.
**Notes:** Bewusst nicht zu eng schnüren — es können später Co-Projekt-Lead-Rollen dazukommen (Katalog-Insert). Projektleiter ist projektbezogen und unabhängig vom Gruppen-Fansub-Leader.

---

## Claude's Discretion

- Migrationsreihenfolge & Backfill-Sicherheit der bestehenden anime_contributions.
- Cockpit-Komponenten-/Scaffold-Struktur und exakte Badge-Texte (ruhige Admin-Optik).

## Deferred Ideas

- Person-zentrische Zweitsicht (eine Person → alle Projekte) — ggf. kleiner Folge-Slice, falls Phase zu groß.
- Gruppenübergreifendes/globales Leader-Dashboard — außerhalb dieser Phase.
