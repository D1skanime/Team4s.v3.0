# Public Member: Projektcover vollständig darstellen

Datum: 14.09.2026. Route: `/members/qc`. Ausgangscommit: `d7c197bc0b6cfec3a5fed213cd3f4f7be8e7f036`.

## Ursache und Änderung

Die Projektkarte verwendet CSS Grid mit `align-items: stretch`. Dadurch wurde der Coverrahmen trotz `aspect-ratio: 2 / 3` auf die Höhe des danebenstehenden Inhalts gezogen. `object-fit: cover` beschnitt das Artwork entsprechend stark.

Die Änderung betrifft ausschließlich `frontend/src/components/profile/MemberCurrentProjectsSection.module.css`: `align-self: start` erhält das Posterformat unabhängig von der Kartenhöhe; `object-fit: contain` zeigt das gesamte Artwork; `max-width: 100%` begrenzt das Bild auf den Rahmen. Der vorhandene ResponsiveImage-Pfad sowie Kartenbreiten und Breakpoints bleiben bestehen. Kleine freie Flächen durch abweichende Originalproportionen sind beabsichtigt.

## Browserbelege

Live-Prüfung im Codex-Browser bei 390 × 844: Cover 68 × 102 px, vollständiges Bild, `object-fit: contain`, kein horizontaler Dokumentüberlauf. Anschließend unabhängige Chromium-Prüfungen auf dem Linux-Frontend, jeweils mit neuem Browser und Höhe 1024 px:

| Viewportbreite | Dokumentbreite | Coverrahmen | Bild geladen | Darstellung |
| --- | --- | --- | --- | --- |
| 360 | 360 | 68 × 102 | ja | contain |
| 390 | 390 | 68 × 102 | ja | contain |
| 768 | 768 | 90 × 135 | ja | contain |
| 1440 | 1440 | 90 × 135 | ja | contain |

Messwerte: `viewport-*.json`. Screenshots: `viewport-*.png`; Mobile, Tablet und Desktop visuell geprüft. Alle zeigen das vollständige Buddy-Complex-Cover. Die Screenshots enthalten teilweise den vorhandenen Next-Dev-Indikator.

Reproduktion: `/members/qc` öffnen, zum Abschnitt „Fansub-Projekte“ scrollen, die obigen Viewports einstellen und `ul[class*="projectList"] [class*="cover"]` sowie dessen Bild vermessen. Erwartet: Rahmenproportion 2:3 unabhängig von Kartenhöhe, berechnetes `object-fit: contain`, geladenes Bild und `document.documentElement.scrollWidth <= innerWidth`.

Die ersten kombinierten Browserläufe hatten Timeouts; zeitweise stockte auch SSH. Deren Ursache wurde nicht belegt. Die danach einzeln ausgeführten Prüfungen aller vier Breiten bestanden. Keine Dienste wurden neugestartet; eigene temporäre Build-/Browserverzeichnisse wurden entfernt. Ein Human-UAT-Sign-off wird nicht behauptet.

## Checks

- `docker exec -w /app team4sv30-frontend npm test -- src/components/profile/MemberCurrentProjectsSection.test.tsx`: 11/11 Tests bestanden.
- `docker exec -w /app team4sv30-frontend npm run typecheck`: bestanden.
- `docker exec -w /app team4sv30-frontend npm run lint -- --format json`: 13 Fehler / 331 Warnungen, gleiche Anzahl wie im unmittelbar vorherigen Anime-Abschluss. Die Änderung enthält keine ESLint-relevanten Quelldateien. Keine globale Lintbereinigung durchgeführt.
- Isolierter `npx next build --webpack` in einer temporären Frontend-Kopie mit vorhandenen Container-Abhängigkeiten: Webpack-Kompilierung erfolgreich; vollständiger Build scheitert weiterhin am unveränderten, ungültigen Page-Export `formatEditLoadError` in `src/app/admin/anime/[id]/edit/page.tsx`. Der Container lieferte außerdem eine Warnung zum nicht standardmäßigen `NODE_ENV`. Der laufende Devserver-Build wurde nicht überschrieben.
- `git diff --check`: bestanden.

Keine neue Testdatei für die drei CSS-Deklarationen; vorhandene Komponententests und echte Browsermessungen prüfen den relevanten Umfang. Rohlogs liegen lokal im gleichen Verzeichnis; kompakte Check- und Viewportdaten sowie Screenshots sind versioniert.

Keine API-, Routing-, Auth-, Datenbank-, Produkt- oder Medien-Datenänderungen. Die bestehende unversionierte Datei `frontend/scripts/shot2.mjs` wurde weder verändert noch verwendet. Bestehende GSD- und Human-UAT-Zustände bleiben unverändert.
