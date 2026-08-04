# Phase 120: Öffentliches Memberprofil visuell harmonisieren und Ladeperformance optimieren - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-04
**Phase:** 120-öffentliches-memberprofil-visuell-harmonisieren-und-ladeperformance-optimieren
**Areas discussed:** Profilkopf, Desktop-Flächen und Abschnittsrhythmus, Badge-Erfassbarkeit, Lade- und Rendering-Verhalten

---

## Profilkopf

| Entscheidung | Alternativen | Auswahl |
|---|---|---|
| Hintergrundwirkung | ruhiger Akzent / dezente Fläche / entfernen | Upload vollflächig sichtbar, lokale Lesbarkeitszone |
| Informationshierarchie | Name dominant / Punkte gleichwertig / Punkte später | Name dominant, Status daneben, Punkte kompakt darunter |
| Aktionen | Werkzeugleiste / im Hero / unter Hero | zurückhaltende Werkzeugleiste oberhalb |
| Mobile | kompakt / groß / minimal | kompakt, einspaltig, überlauffrei |
| Sketch | Hero A / B / C | Hero B |

**Notes:** Der Nutzer stellte klar, dass jedes Member ein helles oder dunkles Hintergrundbild selbst hochlädt und zuschneidet. Eine zunächst zu starke Abdunklung und fehlerhafte Mobile-Vorschau wurden verworfen und im Sketch korrigiert.

---

## Desktop-Flächen und Abschnittsrhythmus

| Entscheidung | Alternativen | Auswahl |
|---|---|---|
| Flächennutzung | gemischt / einspaltig / zweispaltig | Vollbreite plus verwandte Zweispalten-Paare |
| Paarung | Geschichte+Mitgliedschaft und Beiträge / gemischt / nur erstes Paar | verwandte Paare |
| Hierarchie | einheitliche H2/H3 / nach Wichtigkeit / reduzierte Labels | einheitliche H2 und H3 |
| Rhythmus | großzügig / kompakt / Hintergrundbänder | Sketch 004 Rhythmus C |

**Notes:** Auf Nutzerwunsch wurde die globale weinrote Linie der bestehenden Team4s-UI geprüft und als `--ui-line: #82122c` identifiziert. Der Gesamtseiten-Sketch verwendet echte aktuelle Badge-Assets; der zuvor gewählte Hero B bleibt unverändert.

---

## Badge-Erfassbarkeit

| Entscheidung | Alternativen | Auswahl |
|---|---|---|
| Kategorien | alle sichtbar / Sprungnavigation / Accordion | alle untereinander sichtbar |
| Stufenfokus | große aktuelle plus Leiste / gleichwertig / nur aktuell+nächste | große aktuelle plus vollständige kompakte Leiste |
| Sofortinfo | Rang+Wert+Ziel+Rest / reduziert | alle vier Informationen |
| Orientierung | Titel+Zähler / nur Titel / Vorschauleiste | Titel plus `n von m` |

**Notes:** Keine zweite Navigationsschicht oder Positionspunkte. Phase 118/119 bleiben verbindlich.

---

## Lade- und Rendering-Verhalten

| Entscheidung | Alternativen | Auswahl |
|---|---|---|
| Initial sichtbar | Hero+erstes Paar / Überschriften / alles | Werkzeugleiste, Hero, Geschichte, Mitgliedschaft |
| Wartezustand | reservierte Skeletons / Hinweis / unsichtbar | strukturgleiche reservierte Skeletons |
| Carousel | SSR-Inhalt, Interaktion spät / alles spät / alles sofort | SSR-Inhalt, Interaktion kurz vor Sichtbarkeit |
| Bildpriorität | Avatar+Hero / nur Avatar / plus Projekt | Avatar und Hero |
| Bildauslieferung | Originale direkt / responsive Derivate | WebP-Derivate; Originale nur als Arbeitsquellen |
| Badge-Größen | eine Größe / einsatzbezogene Größen | ca. 128–160 px klein und 512–640 px groß |

**Notes:** Der Nutzer verlangt ausdrücklich keinerlei Ruckeln oder Layoutsprünge auf Mobile, Tablet oder Desktop. Badge-WebP muss Alpha, Farben und saubere Kanten verlustfrei beziehungsweise visuell verlustarm bewahren; Hero, Avatar und Projekte erhalten eigene responsive Größenstufen.

---

## the agent's Discretion

- Fetch-Deduplizierung, Cache-Seam, responsive `sizes`, Intersection-Schwellen und konkrete Skeleton-Komponenten innerhalb der gelockten UX-Ergebnisse.

## Deferred Ideas

None.
