# Phase 67: Release- und Episode-Credits - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 67-release-episode-credits
**Areas discussed:** FK-Modell & Granularität, Verhältnis zu release_member_roles, Anime-Seiten-Darstellung, Eingabe/Pflege

---

## Entscheidungshilfe: release_member_roles-Strategie

Befund: Zwei parallele Credit-Modelle (anime_contributions vs. älteres release_member_roles, genutzt in 3 Prod-Repos). Nutzer bestätigte: DB enthält nur Testdaten, kein Sicherungsbedarf.

| Option | Beschreibung | Auswahl |
|--------|-------------|----------|
| Weg A — Fokussiert | Nur anime_contributions erweitern; release_member_roles als abzulösen markieren, eigene Cleanup-Phase | **✓** |
| Weg B — Konsolidierend | Auch release_member_roles ablösen (Repos umstellen, Tabelle droppen) | |

---

## FK-Modell & Granularität

Klarstellung des Domain-Owners: Episode = reine Anime-Metadaten; Fansub-Arbeit hängt immer an einer Release-Version. Code-Prüfung bestätigte: `fansub_releases.episode_id` ist NOT NULL → release_version impliziert Episode → episode_id redundant.

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| FK-Modell | Zwei nullable Spalten / Join-Tabelle(n) | **Nur release_version_id (kein episode_id)** |
| Ebenen | Genau eine Ebene / kombinierbar | **Anime-weit (NULL) oder release-version-spezifisch** |
| episode_id | redundant | **Entfällt; P67-SC1 angepasst** |

---

## Anime-Seiten-Darstellung

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Darstellung | Gruppe → aufklappbare Versionen / feste Versions-Sektionen | **Gruppe → aufklappbar** |
| Misch-Fälle | Allgemein + Versions-Detail / nur zeigen was da ist | **Allgemein + Versions-Detail** |
| Sortierung | Episode-Nr→Version / Version→Episode | **Episode-Nr, dann Version** |

---

## Eingabe/Pflege

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Eingabe-Ort | Nur Leader-Admin / Leader + Member-Vorschlag | **Leader + Member-Vorschlag** |
| Auswahl-UX | Abhängiges Dropdown (gruppen-gefiltert) / freie Auswahl | **Abhängiges Dropdown** |
| Nachträglich | Bearbeitbar / nur bei Anlage | **Bearbeitbar** |

---

## Claude's Discretion

- ON-DELETE-Verhalten + Constraint-Form für release_version_id
- Konsistenzprüfung (Gruppe∈release_version_groups) als DB-Constraint vs. Handler
- Erweiterung der Public-Query ohne Bruch der anime-weiten Anzeige
- Handler/Repo-Aufteilung unter 450-Zeilen-Limit

## Deferred Ideas

- Ablösung von release_member_roles → eigene Cleanup-Phase (Weg A)
- episode_id als direkter FK — verworfen (redundant)
- n:m-Verknüpfung Contribution↔mehrere Versionen — verworfen für V1
- Todos profile-hub-redesign & contributor-owned-media — reviewed, nicht gefoldet
