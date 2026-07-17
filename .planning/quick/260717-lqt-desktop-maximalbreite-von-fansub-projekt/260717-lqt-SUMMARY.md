---
quick_task: 260717-lqt
status: complete
scope: Einheitliche Desktop-Maximalbreite für öffentliche Fansub-, Projekt- und Release-Seiten
completed_at: 2026-07-17
commits:
  - e5d8f7ae
---

# Quick Task 260717-lqt — Summary

## Ergebnis

Die öffentliche Fansub-, Fansub-Projekt- und Release-Detailseite teilen jetzt denselben zentralen Desktop-Breitenvertrag. Bei normalen Desktopbreiten liegt das äußere Maximum bei `1360px` mit insgesamt `48px` Gutter; ab `1600px` Viewport wechseln alle drei Oberflächen auf `1480px` und `64px`. Projekt und Release richten zusätzlich ihre sichtbaren Inhaltskanten am halben gemeinsamen Gutter aus. Das bestehende Layout bis einschließlich `768px` bleibt unverändert.

## Umsetzung

- `globals.css` definiert `--public-page-max-width` und `--public-page-gutter` als einzige Quelle für beide Desktopstufen.
- Die bestehende Fansubseite konsumiert die Tokens anstelle ihrer bisherigen lokalen `1360px`-/`1480px`-Literale; ihre berechneten Breiten bleiben identisch.
- Die Projektseite entfernt den bisherigen `1200px`-Deckel und nutzt den gemeinsamen Vertrag ausschließlich ab `769px`.
- Die Release-Detailseite entfernt den bisherigen `1180px`-Deckel und nutzt denselben Desktopvertrag.
- Der Projekt-Hero übernimmt auf Desktop die vollständige verfügbare Inhaltsbreite statt eines zusätzlichen `1200px`-Innendeckels.
- Ein fokussierter CSS-Quellvertragstest schützt Tokens, Verbraucher, Breakpoints, Inhaltskanten und das Entfernen der alten Seitendeckel.

## Geänderte Dateien

- `frontend/src/styles/globals.css`
- `frontend/src/app/fansubs/[slug]/page.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/page.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css`
- `frontend/src/app/fansubs/__tests__/publicPageWidthContract.test.ts`

## Checks

- Fokussierte Vitest-Suite: 2 Dateien, 17 Tests — grün.
- `npm run typecheck` — grün.
- Fokussiertes ESLint für den neuen Vertragstest — grün.
- `npm run build` — grün.
- `git diff --check` und `git diff --cached --check` — grün; nur bestehende Zeilenenden-Hinweise in fremden Planning-Dateien.
- Vollständiges `npm run lint` — weiterhin rot durch den bereits bestehenden `react-hooks/set-state-in-effect`-Fehler in `frontend/src/components/fansubs/FansubStorySection.tsx`; außerdem 321 bestehende Warnungen außerhalb dieses Tasks. Die geänderten Dateien führen keinen neuen Lintfehler ein.

## Live-UAT

Der GSD-Orchestrator hat die drei realen Pretty Routes im Codex-In-App-Browser geprüft. Die verfügbare Browserfläche lag bei `1280px`; in diesem echten App-Shell-Kontext hatten Fansub-, Projekt- und Release-`main` jeweils dieselbe Außenkante (`left: 40px`, `right: 1241px`, `width: 1201px`). Die sichtbaren inneren Inhaltskanten lagen bei allen drei Seiten ebenfalls identisch bei `64px` und `1217px` (`1153px`). Die Release-Seite renderte ohne Laufzeitfehler; im Browser-Log blieb nur eine bereits bestehende `next/image`-Seitenverhältniswarnung.

Die Maximalstufen `1360px` und `1480px` sowie der Wechsel ab `1600px` sind zusätzlich durch den fokussierten CSS-Vertragstest und den erfolgreichen Produktions-Build abgesichert. Eine separate `390×844`-Emulation war in der festen In-App-Browserfläche nicht verfügbar; die vorhandenen Mobile-Regeln wurden nicht verändert und der Vertrag wird für Projekt/Release ausschließlich ab `769px` aktiviert.

## Risiken

- Es wurden ausschließlich Layout-Tokens und die vier zugehörigen CSS-Verbraucher geändert; Routing, Daten, API, Auth und Media-Ownership blieben unangetastet.
- Der vollständige Repository-Lint bleibt wegen eines vorbestehenden Fehlers außerhalb dieses Quick Tasks rot.

## Commit

- `e5d8f7ae` — `fix(public): align desktop page widths`
