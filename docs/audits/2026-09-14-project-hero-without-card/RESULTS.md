# Projektkopf ohne sichtbare Kartenhülle

14.09.2026. Ausgangscommit: `4bb02ad0`. Route: `/fansubs/new-subs/fansubprojekt/buddy-complex`.

## Ziel und Änderung

Die im Nutzer-Screenshot beanstandete graue, abgerundete Karte war eine reine dekorative Glashülle um Banner, Titel und Projektkennzahlen. Entfernt wurden Hintergrundfarbe, Border, Radius, Backdrop-Filter und Box-Shadow aus `.heroCard`. Der bestehende Wrapper organisiert weiterhin das Layout; kein Inhalt oder Request wurde entfernt.

Ohne Glashülle war der bisher abgedunkelte Hintergrund für die dunklen Beschriftungen zu kontrastarm. Deshalb verwendet der vorhandene, weich auslaufende Hero-Backdrop nun einen hellen Verlauf aus dem bestehenden `--surface-canvas`-Token. Die zusätzliche Abdunklung entfällt. Das Banner behält seine eigene Bildgestaltung. Keine neue Karte, Farbregistry oder responsive Regel.

Geänderte Produktdateien: `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` und die dazugehörige `page.test.tsx`. Im vorhandenen CSS-Vertrag wurde ausschließlich die bewusst entfernte Helligkeitsabsenkung aus der Erwartung genommen. Keine neue Testdatei für diese kleine CSS-Korrektur.

## Verifikation

Live im Codex-Browser geprüft; ergänzende Chromium-Screenshots und Messwerte bei 390, 768 und 1440px in `hero-*.png`/`browser.json`. Banner, Titel und Projektkennzahlen sichtbar. Bei allen drei Breiten: transparenter Wrapper, Border 0, Radius 0, Shadow none, Backdrop-Filter none. Dunkler Titel verwendet weiterhin `rgb(28,28,30)` auf nun hellem Hintergrund. Mobile und Desktop visuell mit dem Referenz-Screenshot verglichen.

- Relevante Tests: **28/28 bestanden**, vier Dateien (Projektseite, Pretty-Route, ProjectStats, Mobile-Hero-Vertrag).
- Erster Testlauf: eine erwartete Abweichung der alten CSS-Erwartung für `brightness(0.72)`; nach Anpassung an die neue Darstellung vollständig grün.
- Typecheck: unveränderte bekannte Diagnose in `.next/dev/types/app/anime/page.ts` zu `AnimePageProps.searchParams`. Ausgabe exakt wie beim vorherigen Auftrag; dort zusätzlich gegen den unveränderten Ausgangscode isoliert belegt.
- Lint: unverändert 13 Fehler und 331 Warnungen. Datei/Regel/Schwere/Meldung entsprechen exakt dem vorherigen Stand, siehe `baseline-checks.json`.
- Isolierter Produktionsbuild mit `NODE_ENV=production` und Webpack: Kompilierung erfolgreich; vollständiger Build scheitert weiterhin am bekannten ungültigen Page-Export `formatEditLoadError` in `src/app/admin/anime/[id]/edit/page.tsx`. Ergebnis in `build.json`. Eigene temporäre Kopie im Frontend-Container anschließend entfernt; laufender Devserver unberührt.
- `git diff --check`: bestanden.

## Vorbestehende Grenze

Bei 1440px meldet der Dokument-Root 1556px Breite. Ein isolierter Browservergleich mit den exakten vorherigen `.heroCard`-/`.heroBackdrop`-Deklarationen ergibt ebenfalls 1556px (`overflow-baseline.json`). Der Desktop-Overflow des bestehenden Full-Bleed-Hintergrunds ist damit keine neue Regression dieses Styling-Fixes. Er wurde nicht nebenbei umgebaut; der vorhandene Test verlangt ausdrücklich einen ungeclippten weichen Backdrop. Mobile 390/768px haben keinen Root-Überlauf.

Keine Datenbank-, API-, Auth-, Medien-Daten- oder Routingänderungen. Numerische und Pretty-Route verwenden weiterhin denselben Hero. Keine Human-UAT-Freigabe behauptet, keine GSD-Phasen verändert. Unversioniertes `frontend/scripts/shot2.mjs` blieb unangetastet.

## Checks reproduzieren

Aus dem kanonischen Repository: `docker exec -w /app team4sv30-frontend npm test -- src/app/fansubs/__tests__/publicProjectHeroMobileContract.test.ts 'src/app/anime/[id]/group/[groupId]/page.test.tsx' 'src/app/anime/[id]/group/[groupId]/sections/ProjectStats.test.tsx' 'src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.test.tsx'`. Entsprechend `npm run typecheck` und `npm run lint -- --format json`. Browser: Route in den dokumentierten Breiten öffnen, `.heroCard` vermessen und berechnete Dekorationswerte prüfen. Rohlogs liegen lokal im gleichen Verzeichnis.
