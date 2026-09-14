# Ergebnis: Profil-Karussells an Anime-Projekte ausgerichtet

14.09.2026; Ausgangscommit `f40eb8a8`; öffentliche Routen `/members/qc` und `/members/type`.

## Änderung

Die 720px-Begrenzung und zentrierte Vorschau machten Rollen- und Beitragskarten schmaler als Anime-Projekte. Das vorhandene globale `FocalCarousel` besitzt jetzt zusätzlich `presentation="full-width"`: eine volle Karte, Navigation unterhalb und keine seitlichen Zentrierungsabstände. `MemberBadgeChain` verwendet diese Darstellung für seine Karussells; seine alten Breitenüberschreibungen entfallen. Andere Consumer behalten standardmäßig `focal`.

Artwork, Texte, Rollenfarben, Schwellen, Zähler und Stufen behalten ihre bestehenden Komponenten und Daten. Die gemeinsame `achievement-card`-Geometrie richtet nun auch die tatsächlichen Medaillen aus. Schmale Container bleiben vertikal, breite zeigen Artwork links und Information rechts. Kein neuer State, Request, API-Vertrag oder Layout-Breakpoint.

Geänderte Produktdateien:
- `frontend/src/components/ui/FocalCarouselInternals.tsx`: optionale Darstellungsvariante.
- `frontend/src/components/ui/FocalCarousel.module.css`: volle Breite, Pfeile unter der Karte, Zentrierungsspacer entfallen nur für diese Variante.
- `frontend/src/components/profile/MemberBadgeChain.tsx` und `.module.css`: Verwendung der Variante, alte Breitenvorgaben entfernt.
- `frontend/src/components/ui/FocalCarousel.test.tsx`: bestehender Einzelkarten-Vertrag für beide Varianten geprüft.
- `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.tsx`: vorhandenes Stressbeispiel nutzt die Variante.
- `docs/frontend/ui-system.md`: Variante dokumentiert.

## Sichtprüfung und Browsermessungen

Live im Codex-Browser bei 1280px vor der Änderung: Rollen/Beiträge x=280.5, Breite 720; Anime-Projekte x=77, Breite 1127. Danach alle drei x=77 und Breite 1127. Desktop und 390px Mobile visuell geprüft; temporäre Viewport-Vorgabe zurückgesetzt.

Zusätzliche Chromium-Prüfungen mit dem tatsächlichen Linux-Frontend:

| Viewport | Gemeinsame Kartenbreite | Medaillenposition x | Medaillengröße |
| --- | --- | --- | --- |
| 390 | 308 | 99 | 192 × 192 |
| 768 | 646 | 78 | 216 × 216 |
| 1440 | 1286 | 102 | 240 × 240 |

UI-System-Galerie `/dev/ui-system/achievements`: 100-Einträge-Stresstest geöffnet, auf Eintrag 2 gewechselt; aktive Karte und Track jeweils 585px breit (`playground.json`).

Werte gelten jeweils übereinstimmend für aktive Rollen-, Beitrags- und Anime-Projektkarte. Dokumentbreite überschreitet bei keiner Prüfung die Viewportbreite. Screenshots `roles-*.png` wurden visuell geprüft. Kartenhöhen und fachliche Textauszeichnung bleiben wie bisher verschieden.

Bestanden: Pfeile vor/zurück, Home/End, Aufklappen und Rückkehr einschließlich Fokuswiederherstellung, Beitragswechsel; zusätzlich Pointer-Drag und einzelnes Rollenprofil Type ohne Navigationspfeile. Lange deutsche Rollenbezeichnung passt in die 288px-Textspalte. Einbettung in einen 390px-Container bei 1440px-Viewport bleibt vertikal. Grenzen 561/562/563 und 657/658/659px schalten nur die vorhandenen gemeinsamen Artwork-/Spaltenregeln. Reflow mit CSS-Zoom 200% ohne Root-Überlauf; dies ist keine native Browserzoom-Messung.

## Technische Checks

- Relevante Vitest-Suiten: **134/134 bestanden** (40 FocalCarousel, 94 MemberBadgeChain). Vorhandene act()-Warnungen im Wheel-Test sind dokumentiert, kein Testfehler.
- Lint: **13 Fehler /331 Warnungen**. Diagnostik inklusive Datei, Regel, Schwere und Meldung entspricht exakt dem vorherigen Cover-Fix; siehe `lint-baseline.json`.
- Typecheck: Exit 2 wegen `.next/dev/types/app/anime/page.ts` / `AnimePageProps.searchParams`. Isolierter Vergleich mit denselben generierten Typen vor und nach dieser Änderung liefert **identische Diagnostik**. In der isolierten Kopie wurden ausschließlich die aktuell geänderten Frontenddateien für den Vergleich auf HEAD-Inhalte gesetzt und anschließend wiederhergestellt; der kanonische Arbeitsbaum blieb unberührt. Siehe `isolated-checks.json`.
- Produktionsbuild mit `NODE_ENV=production`, Webpack und vorhandenen Container-Abhängigkeiten in einer eigenen temporären Kopie: Kompilierung bestanden; vollständiger Build scheitert am bekannten ungültigen Page-Export `formatEditLoadError` in `src/app/admin/anime/[id]/edit/page.tsx`. Die temporäre Kopie wurde entfernt; der laufende Devserver-Build wurde nicht überschrieben.
- `git diff --check`: bestanden.

Reproduzierbar: `docker exec -w /app team4sv30-frontend npm test -- src/components/ui/FocalCarousel.test.tsx src/components/profile/MemberBadgeChain.test.tsx`; entsprechend `npm run typecheck` und `npm run lint -- --format json`. Browser: `docker exec -i team4sv30-frontend node < docs/audits/2026-09-14-member-carousel-alignment/browser-check.cjs` sowie `browser-supplement.cjs`; sie geben Messwerte und bei der Hauptprüfung Base64-Screenshots als JSON aus. Browserfixtures für Einbettung/Label/Zoom verändern ausschließlich den jeweiligen temporären DOM, keine gespeicherten Daten.

Zwei frühe Prüfläufe scheiterten im Hilfsskript: falscher expect-Import und ein Klick vor der vorhandenen Near-Viewport-Aktivierung. Nach Korrektur des Prüflaufs bestanden die aufgeführten Fälle; keine Produktlogik wurde dafür angepasst.

## Grenzen

Kein pauschaler Typecheck-/Build-PASS. Keine Datenbank-, Medien-, API-, Auth- oder Routingänderungen; keine neuen fachlichen Entscheidungen. Keine Human-UAT-Freigabe behauptet; bestehende GSD-UAT-Punkte bleiben unverändert. Unversioniertes `frontend/scripts/shot2.mjs` bleibt unangetastet. Native Browserzoom- und physische Touch-Geräte-Prüfung wurden nicht durchgeführt.
