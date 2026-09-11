# Fansub-Projektseite: Exakte gemessene Zahlen

Begleitdokument zu [REPORT.md](REPORT.md). Route `/fansubs/new-subs/fansubprojekt/buddy-complex`.
Vorher = Commit `b68d4c61` (letzter Stand vor 155-01). Nachher = Endstand dieser Phase, live
gemessen. Siehe [REPRODUCE.md](REPRODUCE.md) für die exakten Befehle.

## 1. Serverseitige Backend-HTTP-Aufrufe pro erfolgreichem SSR-Request (aus Quelltext abgezählt)

| # | Aufruf | Vorher (`b68d4c61`) | Nachher | Delta |
| --- | --- | :---: | :---: | --- |
| 1 | Slug-Auflösung (`getPublicFansubProfileBySlug` / `resolveFansubProject`) | 2× | 1× | −1 |
| 2 | `getGroupDetail` | 1× | 1× | 0 |
| 3 | `getAnimeByID` | 1× | 1× | 0 |
| 4 | `getGroupAssets` | 1× | 1× | 0 |
| 5 | `getAnimeFansubs` | 1× | 1× | 0 |
| 6 | `getGroupReleases(per_page:100)` | 1× (+1 bei Retry) | 0 | −1 (Erfolgspfad), −2 (Fehlerpfad) |
| 7 | `getGroupReleaseCount` | 0 (existierte nicht) | 1× | +1 |
| 8 | `getGroupReleaseListCursor` (Latest, limit:1) | 1× | 1× | 0 |
| 9 | `getGroupReleaseDetail` (Latest-Detail) | 1× | 1× | 0 |
| 10 | `getGroupContributors` | 1× | 1× | 0 |
| 11 | `getGroupThemes` | 1× | 0 | −1 |
| 12 | `getGroupReleaseMedia` | 1× | 0 | −1 |
| 13 | `getGroupProjectNote` | 1× | 1× | 0 |
| **Summe (Erfolgspfad)** | | **13** | **10** | **−3 (−23 %)** |
| **Summe (Fehlerpfad, `getGroupReleases` schlägt fehl)** | | **15** | **10** | **−5 (−33 %)** |

## 2. SQL-Query-Kosten, nur für bereits gepinnte/gemessene Konstanten (keine Schätzungen)

| Block | Vorher | Nachher | Quelle |
| --- | :---: | :---: | --- |
| Slug-Auflösung (2× volles Profil à ~8 SQL vorher; 1× Resolver nachher) | ~16 | 2 | Vorher: `docs/audits/2026-09-09-public-member-performance/REPORT.md` (Tabellenzeile „Profile-SQL inklusive Zugriff", Gruppe `new-subs` = 8). Nachher: `155-01-SUMMARY.md`, `phase155ProjectResolverConstantQueryBudget = 2` |
| Release-Vollliste (Erfolgspfad) vs. Release-Count | 2 | 1 | `155-02-SUMMARY.md`, `group_repository.go:165-178` (Vorher-Zählquery), `GetGroupReleaseVersionCount` (Nachher) |
| Contributors (unverändert, auch bei 30-50 Mitwirkenden) | 2 | 2 | `155-03-SUMMARY.md`, `phase155ContributorsConstantQueryBudget = 2`, gemessen an 2/2 und 30/20 Mitwirkenden |
| **Summe der drei gepinnten Blöcke** | **≥20** | **5** | — |

Für `getGroupDetail`, `getAnimeByID`, `getGroupAssets`, `getGroupReleaseListCursor`,
`getGroupReleaseDetail`, `getGroupProjectNote`, `getAnimeFansubs`, `getGroupThemes`,
`getGroupReleaseMedia` existiert keine in dieser oder einer Vorphase gepinnte SQL-Konstante — hier
wird bewusst KEINE Zahl behauptet (Scope Fence: keine Beschleunigungsversprechen ohne Messbeleg).

## 3. Themes-/Media-Requests (Erfolgspfad, pro SSR-Request)

| | Vorher | Nachher |
| --- | :---: | :---: |
| `getGroupThemes` | 1 | 0 |
| `getGroupReleaseMedia` | 1 | 0 |
| Summe toter Fetches | 2 | 0 |

## 4. Release-bezogene Requests (Erfolgspfad, pro SSR-Request)

| | Vorher | Nachher |
| --- | :---: | :---: |
| `getGroupReleases(per_page:100)` | 1 | 0 |
| Duplikat-Retry (Fehlerpfad) | bis zu 1 zusätzlich | 0 (kein Retry mehr) |
| `getGroupReleaseCount` | 0 | 1 |
| `getGroupReleaseListCursor` (Latest) | 1 | 1 |
| `getGroupReleaseDetail` (Latest) | 1 | 1 |
| Summe release-bezogener SSR-Aufrufe | 3 (4 im Fehlerpfad) | 3 |

Anmerkung: Die Summe release-bezogener Aufrufe bleibt bei 3, weil `getGroupReleaseCount` den
entfernten `getGroupReleases`-Aufruf ersetzt (1-zu-1-Tausch) — der eigentliche Gewinn liegt nicht
in der Aufrufzahl dieser Kategorie, sondern darin, dass der ersetzte Aufruf eine bis zu
100-zeilige Vollliste plus interne COUNT-Query war (2 SQL, s. Tabelle 2) statt einer einzelnen
COUNT-Query (1 SQL), und dass der Duplikat-Retry-Fehlerpfad vollständig entfällt.

## 5. Browserseitige Messung (Playwright/CDP, live gegen den Endstand dieser Phase)

Quelle: `AUDIT_LABEL=phase155-after`, `AUDIT_ROUTES=fansubs/new-subs/fansubprojekt/buddy-complex`,
Rohdaten unter `/tmp/phase155-project-audit/` im Frontend-Container (siehe REPRODUCE.md).

| Metrik | Cold | Warm |
| --- | ---: | ---: |
| TTFB | 248,5 ms | 237,3 ms |
| DOMContentLoaded | 412,7 ms | 457,7 ms |
| Load | 1.315,6 ms | 746,9 ms |
| Requests gesamt (browserseitig) | 11 | 11 |
| Bytes transferiert gesamt | 4.393.417 | 3.849.942 |
| Längster Long Task | 195 ms | 170 ms |
| React-Commits | 14 | 12 |
| Heap nach Scroll+GC | 19.112.644 Bytes | 19.114.580 Bytes |
| Console-Fehler | 2 | 2 |

### Vollständige Requestliste (Cold-Lauf)

| Methode | Status | URL | Bytes transferiert | Typ |
| --- | :---: | --- | ---: | --- |
| GET | 200 | `/fansubs/new-subs/fansubprojekt/buddy-complex` (Document/SSR-HTML) | 40.192 | Document |
| GET | 200 | `/_next/static/css/app/layout.css` | 14.378 | Stylesheet |
| GET | 200 | `.../api/v1/media/image?...kind=banner...` (Anime-Banner) | 131.344 | Image |
| GET | 200 | `/_next/static/css/.../fansubprojekt/.../page.css` | 23.280 | Stylesheet |
| GET | 200 | `/_next/static/chunks/webpack.js` | 29.036 | Script |
| GET | 200 | `/_next/static/chunks/main-app.js` | 2.564.118 | Script |
| GET | 200 | `/_next/static/chunks/app-pages-internals.js` | 57.663 | Script |
| GET | 200 | `/_next/static/chunks/app/layout.js` | 534.910 | Script |
| GET | 200 | `/_next/static/chunks/app/fansubs/.../fansubprojekt/.../page.js` | 586.354 | Script |
| GET | 200 | `/media/profile/11/avatar/.../original.webp` | 412.142 | Image |
| GET | (client, im Log unvollständig erfasst) | `.../api/v1/anime/1/group/1/release-list?limit=5` | 0 | Fetch (clientseitig, `OlderReleasesList.tsx`, unverändert durch diese Phase) |

9 von 11 Requests sind statische Next.js-Build-Assets, unverändert durch diese Phase. Kein Request
in dieser Liste stammt aus `getGroupThemes`, `getGroupReleaseMedia` oder dem entfernten
`getGroupReleases(per_page:100)`-Aufruf, weil diese serverseitig liefen und ohnehin nie im Browser
sichtbar waren — ihre Entfernung zeigt sich hier nicht als Requestzahl-Delta, sondern nur in der
Vorher/Nachher-Quelltextzählung (Tabelle 1) und den SQL-Konstanten (Tabelle 2).
