# Phase 158: Frontend-Reparaturen und Routing

Baseline: 7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85, 2026-09-13. Keine Produktänderungen bei dieser Bestandsaufnahme.

## Wiederverifizierte Ursachen
- `frontend/src/components/fansubs/FansubVersionBrowser.module.css:103` setzt weißen Kartenhintergrund ohne eigene Textfarbe. Header erbt Weiß von Animepage. Vorhanden: --color-text-primary #1c1c1e, --color-white #fff. Farbe am Kartenbesitzer setzen, nicht globale Registry ändern.
- `frontend/src/components/anime/AnimeContributionsSection.module.css:6` setzt dunkles --color-text-primary auf dunkler Animepage. Heading und Statusbereich brauchen vorhandene helle Farbe am lokalen Besitzer.
- `frontend/src/app/anime/[id]/page.module.css`: rein dekorativer heroBanner erlaubt overflow visible; bannerImage ragt links/rechts40px heraus, blur20px, scale1.1. Nur diesen dekorativen Container clippen; Heroaktionen/Slider/Fokus nicht global abschneiden.
- `CommentForm.tsx` und `WatchlistAddButton.tsx` prüfen nur Access beim Mount. `frontend/src/lib/useAuthSession.ts` liefert hasAccessToken, hasRefreshToken, displayName, isClientInitialized und reagiert auf Fokus, Storage, AUTH_SESSION_CHANGED_EVENT und visibilitychange. Reuse, keine lokalen Token-/Cookiezugriffe.
- WatchlistButton wird repositoryweit nur von AnimeDetailpage gerendert. Page lädt SSR-Status nur mit Accesscookie und reduziert abgelehnten Request zu false. Empfohlener eindeutiger Besitzer: zentralen getWatchlistStatus-Aufruf in den Button verlegen; page entfernt Cookie-/SSR-Watchlistpfad. Sessionobject als Abhängigkeit erkennt auch relevanten Authwechsel mit unveränderten Token-Bools. Ergebnisse an Anime und Session binden, alte Requests ignorieren/abbrechen. Unbekannt/laden/Fehler getrennt von bekannt absent/present; nur dokumentierte Nichtvorhanden-Antwort zu false. Kein Add/Delete solange unbekannt, Retry für Statusfehler, Actionfehler auch mit Customclass sichtbar.
- Contributions verschluckt catch und rendert beim Laden null. Explizite Statusanzeige, fachlich leer erst nach Erfolg, sichtbarer Fehler plus Retry. Bestehende Karten/Styles behalten.
- Page nutzt parseInt und normale Fehleransicht statt notFound, ohne Metadaten. Bewertung7.8 und Animeview_count werden als echte Kennzahlen gerendert. Entfernen, Episodenzahl erhalten. Emby22mapping unverändert.

## Strikte ID / tatsächliche HTTP404
Vollständig positive dezimale Ganzzahl plus Number.isSafeInteger validieren. Page und generateMetadata teilen einen request-memoisierten Anime-Lader (bestehendes React cache), damit keine neue doppelte Animeabfrage entsteht. ApiError404 über notFound behandeln; Backend5xx/Netzfehler nicht zu fachlichem404 umlabeln. Erfolgsmetadata: echter Titel, numerischer Canonical ohne Gridquery; unbekannt/invalid: noindex und keine Anime1-Metadaten.

Next16 dokumentiert: notFound nach Streamingbeginn hat HTTP200. Der aktuelle Baum besitzt sowohl `app/anime/loading.tsx` als auch `app/anime/[id]/loading.tsx`; bloß notFound in page genügt daher nicht. Rootlayout hat keinen expliziten Suspensewrapper um children. Verifikation muss mit normalem Browser-Useragent echte Statuscodes prüfen.

Kleinste vorgesehene Korrektur: vorhandene Loadingkomponenten unter Nicht-Konventionsnamen erhalten, automatische Suspenseboundary im Anime-Detailvorfahren entfernen; Anime-Liste behält ihre Ladeanzeige mittels expliziter Suspense um ihren asynchronen Inhalt. Detail validiert ID und Existenz VOR ihrer expliziten Content-Suspenseboundary. Keine neue URL, kein globaler Proxy, kein globales htmlLimitedBots-Tuning. Falls Next im realen Test trotzdem streamt, Ursache weiter beweisen und gezielt korrigieren, nicht HTTP404 behaupten.

Quellen: https://nextjs.org/docs/app/api-reference/file-conventions/not-found und https://nextjs.org/docs/app/api-reference/file-conventions/loading (offizielle Docs geprüft13.09.2026).

## Abnahme und Baseline
- Vollständige Nutzerfallmatrix ist bindend; Tests dürfen Auth zentral mocken, Requestintegration muss Refresh-single-flight bewahren. Keine echte Session/DBmutationen für Fixtures.
- `baseline-typecheck.log`: Exit2, ausschließlich zwei TS2344 im generierten Typ der numerischen GroupStoryPageProps (params PlainObject|Promise statt Promise). Separat bestehend; bei notwendigem kleinem Routevertragfix Ursache und Consumer dokumentieren, keine globale Typebereinigung.
- `baseline-lint.log`: Exit1, 13Errors331Warnings, identisch Audit. Gegen PHASENbaseline vergleichen, nicht gegen letztes Plancommit.
- Build in Kopie innerhalb Frontendcontainer/tmp mit vorhandenen Dependencies; nicht live/app/.next überschreiben. Backend nicht neustarten (Startup führt Migrationslauf aus).
- 156GAP02/157human-verify bleiben offen. Kein Human-Signoff durch automatisierte Browserchecks.
