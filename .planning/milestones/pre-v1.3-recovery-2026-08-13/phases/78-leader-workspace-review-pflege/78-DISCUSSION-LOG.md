# Phase 78: Leader Workspace – Review & Pflege - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 78-leader-workspace-review-pflege
**Areas discussed:** Review-Anordnung, Phase-76-Eingang, Medienprüfung, Offen-Filter+Readiness

---

## Review-Anordnung & Struktur

### Grundstruktur der Review-/Pflege-Flächen

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs erweitern (Reuse) | Bestehende Domänen-Tabs erweitern (claims/vorschlaege/media), kein neuer Tab; max. Reuse, getrennte Flows | ✓ |
| Review-Überblick + Sprungmarken | Zusätzlicher 'Review'-Tab als Überblick mit Sprungmarken in die Domänen-Tabs | |
| Du entscheidest | Planner wählt Anordnung unter Lock H/F | |

**User's choice:** Tabs erweitern (Reuse)

### Offene Contributions: Wo reviewt der Leader sie?

| Option | Description | Selected |
|--------|-------------|----------|
| ReviewQueue ausbauen | Bestehende `<ReviewQueue>` im 'vorschlaege'-Tab als kanonische Stelle | |
| Eigener Contributions-Tab | Dedizierter 'Offene Contributions'-Review-Tab, getrennt vom Proposal-Tab | |
| Du entscheidest | Researcher prüft Seam-Stand, Planner wählt — getrennt von Claims, nicht im Modal vergraben | ✓ |

**User's choice:** Du entscheidest
**Notes:** `AnimeContributionsTab.tsx` wurde gelöscht; Contribution-Detail-Pflege läuft heute über `AnimeContributionModal`. Seam-Stand zuerst prüfen.

### Externe Mitwirkende: Pflegeumfang

| Option | Description | Selected |
|--------|-------------|----------|
| Bestätigen/Ablehnen + Korrektur | Review + Rolle/Notiz-Korrektur über Contribution-Seams | |
| Nur Review (bestätigen/ablehnen) | Minimaler Umfang; Detail-Korrektur bleibt im Anime-Modal | ✓ |
| Du entscheidest | Planner bestimmt Umfang unter Entscheidung 3 | |

**User's choice:** Nur Review (bestätigen/ablehnen)

---

## Phase-76-Eingang

### Eingangsort der User-Vorschläge

| Option | Description | Selected |
|--------|-------------|----------|
| Nach Typ in Domänen-Tab | Jeder Vorschlagstyp in zuständigen Tab (Medien→media, Story→notes, Contribution→Contrib-Review) | ✓ |
| Ein getypter Eingang | Alle Vorschläge in einer getypten Eingangsliste, von dort verlinkt | |
| Du entscheidest | Planner routet typgerecht unter Lock H | |

**User's choice:** Nach Typ in Domänen-Tab

### Gruppenkontext-Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Strikt auf aktuelle Gruppe | Nur Vorschläge mit Zielkontext = aktuelle Gruppe, capability-gated | ✓ |
| Gruppe + zugeordnete Anime/Releases | Zusätzlich Vorschläge zu zugeordneten Anime/Releases | |
| Du entscheidest | Planner wählt Scope-Ableitung nach Ziel-/Owner-Feld | |

**User's choice:** Strikt auf aktuelle Gruppe

---

## Medienprüfung

### Aktionsumfang

| Option | Description | Selected |
|--------|-------------|----------|
| Sichtbarkeit + Reviewstatus | Status/Sichtbarkeit setzen, Owner nur flaggen — schreibend in korrekte Owner-Tabelle | ✓ |
| + Owner-Korrektur/Re-Kategorisierung | Zusätzlich falsch zugeordnete Medien umhängen/neu kategorisieren | |
| Du entscheidest | Planner legt Umfang unter Lock G fest | |

**User's choice:** Sichtbarkeit + Reviewstatus
**Notes:** Owner-Typ-Umhängen bewusst Phase 79 vorbehalten (berührt Ownership-Matrix).

### Ort der Medienprüfung

| Option | Description | Selected |
|--------|-------------|----------|
| An der jeweiligen Owner-Fläche | Gruppenmedien im media-Tab, Release-Version-Medien im Drawer, Theme im Theme-Bereich | ✓ |
| Zentrale Medienprüf-Ansicht | Gebündelte Prüfliste quer über Owner-Typen | |
| Du entscheidest | Researcher/Planner wählt Ort unter Lock G | |

**User's choice:** An der jeweiligen Owner-Fläche

---

## Offen-Filter & Readiness-Kopplung

### Darstellung offener Posten

| Option | Description | Selected |
|--------|-------------|----------|
| Offen zuerst + Filter-Toggle | Offene vorsortiert/oben + 'nur offene'-Toggle; erledigte bleiben einsehbar | ✓ |
| Reine Sortierung | Offene nur oben einsortiert, kein Filter | |
| Du entscheidest | Planner wählt Filter/Sortier-Detail je Tab | |

**User's choice:** Offen zuerst + Filter-Toggle

### Verhalten der Readiness-Sprungmarken

| Option | Description | Selected |
|--------|-------------|----------|
| Deep-Link auf offene Liste | Klick öffnet Ziel-Tab + setzt 'offen'-Filter/Scroll | |
| Nur Ziel-Tab öffnen | Sprungmarke öffnet nur den Tab; Leader filtert selbst | |
| Du entscheidest | Planner entscheidet Deep-Link-Tiefe; bestehende MainTab/?tab=-Navigation nutzen | ✓ |

**User's choice:** Du entscheidest

---

## Claude's Discretion

- **Contribution-Review-Ort** (ReviewQueue ausbauen vs. dedizierte Fläche) — Planner, getrennt von Claims (SC1), nicht im Modal vergraben; Researcher prüft Seam-Stand (AnimeContributionsTab gelöscht).
- **Readiness-Sprungmarken-Tiefe** (nur Tab öffnen vs. Deep-Link auf offene Liste) — Planner, bestehende `MainTab`/`?tab=`-Navigation nutzen, nicht duplizieren.
- **Phase-76-Scope-Feinheit** (nur Gruppe vs. Gruppe + zugeordnete Anime/Releases) — Planner nach tatsächlichem Ziel-/Owner-Feld.
- Tab-Beschriftung, Filter-UI, Empty-States, Toast-Texte, CSS-Struktur, Capability-Feinauflösung pro Aktion — Planner/Executor unter den v1.2-Locks.

## Deferred Ideas

- Owner-Typ-Umhängen / Re-Kategorisierung von Medien → Phase 79.
- Zentrale gruppenübergreifende Medienprüf-Ansicht → eher Phase 80 (`/admin/users`).
- Generischer Review-Posteingang/Überblick-Tab → verworfen (Lock H), ggf. eigene spätere Phase.
