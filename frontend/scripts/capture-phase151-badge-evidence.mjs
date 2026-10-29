#!/usr/bin/env node

/**
 * STILLGELEGT (seit Quick-Task 261029-d3k, Storybook-Einführung).
 *
 * Dieser Collector war das einmalige Phase-151-Werkzeug zur visuellen
 * Regressionserhebung der Erfolgsbadge-Galerie: er navigierte gegen die
 * In-App-Dev-Route `/dev/ui-system/achievements`, maß Layout/Container-Queries/
 * Zoom/Motion/Stress an der dort gerenderten `AchievementBadgeShowcase` und
 * schrieb Kontaktbögen plus ein Freigabe-Protokoll. Phase 151 ist seit
 * 2026-09-08 abgeschlossen (siehe `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/`,
 * insbesondere `151-VERIFICATION.md` und `151-05-SUMMARY.md`) — die damit
 * erhobene Evidenz liegt bereits vollständig und abgenommen vor.
 *
 * Die Zielroute wurde im Zuge der Storybook-Einführung absichtlich entfernt;
 * dieselbe Komponente lebt jetzt unverändert als `Showcases/AchievementBadgeShowcase`
 * in Storybook (`frontend/src/components/showcases/AchievementBadgeShowcase.tsx`).
 * Dieses Skript NICHT auf die Storybook-URL ummappen: es verließ sich zusätzlich
 * auf `/members/type` als echte, same-origin Produktionsroute für den
 * Profil-Vergleichsabschnitt — ein Setup, das es nur in der echten Next.js-App
 * gab und das Storybooks eigenständiger, routenloser Katalog nicht nachbilden
 * kann, ohne eine andere Prüfung zu simulieren als die, die Phase 151
 * tatsächlich abgenommen hat.
 *
 * Die ursprüngliche Mess-/Capture-Logik (Container-Query-Matrix, Zoom-Reflow,
 * Motion-/Karussell-Interaktion, 100/200-Item-Stresstest, Kontaktbögen) ist
 * nicht verloren — sie bleibt vollständig in der Git-Historie dieser Datei
 * nachvollziehbar (siehe `git log --follow -- frontend/scripts/capture-phase151-badge-evidence.mjs`,
 * Commit `f4b8b5603` und folgende). Dieses Skript bricht hier bewusst sofort
 * mit einer klaren Meldung ab, statt stillschweigend gegen eine 404-Seite zu
 * laufen und mit einer irreführenden "Galerie nicht gefunden"-Assertion zu
 * scheitern — und ohne ~300 Zeilen nicht mehr ausgeführter Mess-Logik aktiv
 * im Skript-Verzeichnis liegen zu lassen.
 */

console.error([
  'STILLGELEGT: capture-phase151-badge-evidence.mjs zielte auf die entfernte Route',
  '/dev/ui-system/achievements. Phase 151 ist abgeschlossen; die Evidenz liegt bereits',
  'unter .planning/phases/151-erfolgsbadge-karussell-konsolidierung/ vor.',
  'Die Galerie-Komponente lebt jetzt unveraendert in Storybook als',
  'Showcases/AchievementBadgeShowcase. Dieses Skript ist nur noch historischer',
  'Beleg (siehe Kommentar am Dateianfang) und wird absichtlich nicht mehr ausgefuehrt.',
].join(' '))
process.exitCode = 1
