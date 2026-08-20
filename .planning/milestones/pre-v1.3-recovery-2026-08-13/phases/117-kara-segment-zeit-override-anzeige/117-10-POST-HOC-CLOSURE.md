---
phase: 117-kara-segment-zeit-override-anzeige
note-type: post-hoc-closure
executed-via: quick-task
quick-task-ref: .planning/quick/260819-lm5-phase-117-geteilte-karaoke-segmente-uebe/
date: 2026-08-19/20
---

# Phase 117 — Post-Hoc Closure Note (Quick Task 260819-lm5)

## Warum diese Datei existiert

Plan `117-09-PLAN.md` in diesem Verzeichnis sollte Phase 117 mit einer vollständigen
Regressionsprüfung und Live-UAT abschließen — es existiert dafür jedoch **kein
`117-09-SUMMARY.md`**. Der Plan wurde nie ausgeführt. Unabhängig davon blieb ein Teil der in
117-01 bis 117-08 bereits gebauten Backend-/Frontend-Verdrahtung für D-03 (geteiltes,
pro-Release-Version zuweisbares Kara-Segment) und D-01 (Per-Folge-Zeit-Override) **für Admins
faktisch unerreichbar**: Ein Segment wurde nie "shared", weil der einzige Weg dahin (Zuweisung)
selbst hinter `is_shared === true` versteckt war (Henne-Ei-Problem), und die Vorschlag-Übernahme
legte ein Duplikat-Segment an statt zuzuweisen.

Diese Lücke fiel erst beim Durchtesten am 2026-08-19 auf und wurde außerhalb der formalen
GSD-Phasen-Ausführung als Quick-Task `260819-lm5` geschlossen (Details, Commit-Historie und
Runden-für-Runde-Live-UAT-Protokoll siehe
`.planning/quick/260819-lm5-phase-117-geteilte-karaoke-segmente-uebe/260819-lm5-SUMMARY.md`).

## Was der Quick-Task tatsächlich geschlossen/ergänzt hat

- **D-03 nutzbar gemacht:** Vorschlag-Übernahme (`adoptSuggestion`) weist jetzt statt zu
  duplizieren (`assignSegment` statt `create`). Eine Zuweisungs-Zeile mit Folgen-Chips
  (Zuweisen/Entfernen) ist jetzt für JEDES Segment erreichbar, nicht erst nachdem es zufällig
  bereits geteilt war.
- **D-03 erweitert (über die ursprüngliche 117-Spec hinaus):** Neue automatische
  Bereich-Auto-Zuweisung — `start_episode`/`end_episode` treiben jetzt beim Speichern (Create
  UND Update) additiv und idempotent die Zuweisung an alle Release-Versionen der Folgen in
  diesem Bereich (`AssignThemeSegmentToEpisodeRange`, gleiches Join-Muster wie
  `GetSegmentReleaseDuration`). Vorher hatte der Episodenbereich am Segment keinerlei Effekt auf
  Zuweisung/Playback.
- **D-01 nutzbar gemacht und vereinfacht:** Der bereits gebaute, aber unerreichbare
  Per-Folge-Override-Block in `SegmentEditPanel.tsx` ist jetzt erreichbar (Folge einer
  Zuweisung setzt `is_shared`) und wurde von zwei freien Zeitfeldern auf ein Start-only-Feld
  vereinfacht (Ende automatisch = Start + Basis-Dauer).
- **Korrektheits-Bug behoben:** Der "verschoben"-Indikator zeigte fälschlich das segmentweite
  `has_episode_override`-Flag auf JEDEM zugewiesenen Folgen-Chip statt eines Pro-Folge-Werts —
  neues `AdminThemeSegmentAssignmentEpisode.HasOverride`-Feld pro `release_version_id`.
- **Mobile-Härtung:** Segment-Edit-Drawer und Segmente-Tabelle (Karten-Layout <640px) ohne
  horizontalen Overflow.

Alle Punkte wurden über fünf Live-UAT-Runden auf `:3000` vom Nutzer bestätigt ("approved").

## Was diese Notiz NICHT abdeckt (bewusst offen gelassen)

`117-09-PLAN.md`s eigentlicher Scope war breiter als das, was Quick-Task 260819-lm5 verifiziert
hat. Folgende Punkte aus `117-VALIDATION.md` ("Manual-Only Verifications") wurden durch diesen
Quick-Task **nicht erneut geprüft** und sollten nicht als bestätigt gelten, falls sie nicht an
anderer Stelle bereits verifiziert wurden:

- Kein-Re-Encode-Beweis (D-01): mtime/Größe der Episoden-Quelldatei vor/nach Override-Speichern.
- Öffentliche Release-Detailseiten-Entdopplung (D-02): Span-Start-Badge, Unterdrückung auf
  Folgeepisoden.
- Volle Backend-Regressionssuite `go test ./internal/...` (der Quick-Task lief gezielt gegen
  `./internal/handlers/...` und `./internal/repository/...`, nicht das gesamte `internal/...`-Paket).

**Fazit:** Die admin-seitige Bedienbarkeit von D-01/D-03 (der eigentliche, beim Durchtesten
aufgefallene Blocker) ist geschlossen und live bestätigt. Die öffentliche Entdopplungsseite
(D-02) und der Re-Encode-Negativbeweis aus dem ursprünglichen 117-09-Scope bleiben ein offener
Punkt, falls sie nicht bereits separat verifiziert wurden.
