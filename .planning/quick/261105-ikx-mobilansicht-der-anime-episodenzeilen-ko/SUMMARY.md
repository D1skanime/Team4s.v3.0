---
id: 261105-ikx-mobilansicht-der-anime-episodenzeilen-ko
kind: quick
status: complete
completed_at: 2026-11-05
---

# Quick 261105-ikx: Mobile Ansicht der Anime-Episodenzeilen korrigieren

## Ergebnis

`EpisodeGlassCard` nutzt für ihre bestehende Kopfzeile nun die globale
`Cluster.growFirstChild`-Fähigkeit. Der Titel- und Klassifikationsblock erhält
dadurch den verbleibenden Platz und kann bei schmalem Container umbrechen,
während der Versionszähler als feste, sichtbare zweite Spalte erhalten bleibt.

## Änderungen

- `EpisodeGlassCard.tsx` aktiviert ausschließlich `growFirstChild` am bereits
  vorhandenen Kopf-`Cluster`; es wurde kein lokales Layout-CSS ergänzt.
- `EpisodeGlassCard.stories.tsx` dokumentiert `Cluster.growFirstChild` und den
  responsiven Fall mit langem Titel und Versionszähler in der Story `Langer Titel`.

## Live-Sichtprüfung

- Vorher, `/anime/13` bei `390x844`: Lange Episodentitel und der Versionszähler
  überlappten sichtbar in der Kartenkopfzeile.
- Nachher, `/anime/13` bei `390x844`: Titel und Metadaten umbrechen im linken
  Bereich; der Versionszähler bleibt vollständig sichtbar, ohne horizontalen
  Seitenüberlauf.
- Nachher, `/anime/13` bei `1440x900`: Die einzeilige Kopf-Anordnung mit
  Titelblock links und Versionszähler rechts bleibt erhalten.

## Verifikation

- Live-Browser-Sichtprüfung über die laufende Frontend-Instanz auf
  `http://127.0.0.1:3000/anime/13` bei `390x844` und `1440x900`.
- `git diff --check`

Keine Tests, Testsuiten oder Layout-Purity-Guards wurden gemäß Quick-Plan
hinzugefügt oder ausgeführt.

## Abweichungen

Keine. Der Quick-Plan wurde innerhalb der festgelegten Dateien umgesetzt.
