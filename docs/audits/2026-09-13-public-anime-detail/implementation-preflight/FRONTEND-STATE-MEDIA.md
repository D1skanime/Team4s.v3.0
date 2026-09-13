# Phase-2-Preflight: Clientzustand, Navigation und Medien

Stand: 2026-09-13. Baseline `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`. Vorher nur Auditordner und `frontend/scripts/shot2.mjs` untracked. Keine Produktänderung, kein Build, Commit oder Datenänderung in diesem Teilauftrag. [VERIFIED: git status --short, git log -1, docker compose ps]

## User Constraints

Ausschließlich zweite der genau zwei angeforderten GSD-Phasen; Ausführung erst nach technischer Verifikation von Phase 1. Aktive Gruppe, Gridnavigation, echtes Bildbudget und begrenztes Manifestsharing reparieren. Kein Rewrite, keine umfassende Audio-/Videoänderung, globale Shelloptimierung, Kommentar-Pagination, neue Anime-Slugroute oder Migration. Keine DB-Fixtures in der laufenden VM. Human-UAT 156/157 bleibt offen und getrennt. [VERIFIED: aktueller Nutzerauftrag]

## Project Constraints (from AGENTS.md)

- Canonical Linux `/home/d1sk/team4s` via SSH; ausschließlich Docker/Compose-Runtime; GSD über `./scripts/gsd-linux.sh`. Windowskopie nicht verändern. [VERIFIED: AGENTS.md]
- Vor Änderungen Git/Compose prüfen; fremde Änderungen, `.env`, `media/`, DB/Volumes erhalten. Große Artefakte/Builds auf Dockerplatte, beispielsweise Container-`/tmp`. [VERIFIED: AGENTS.md]
- Bestehende Komponenten/Helpers zuerst suchen; Contract/DTO/APIhelper gemeinsam pflegen; Auth-/Refreshlogik bleibt zentral. [VERIFIED: AGENTS.md; docs/engineering/implementation-contract.md; docs/api/api-contracts.md; docs/frontend/auth-api-client.md]
- Keine neue Medienregistry oder vermischte Ownership. Globale Tokens, korrekte Umlaute, responsive Verhalten beim zuständigen Besitzer und shared Browserverifikation. [VERIFIED: AGENTS.md; docs/frontend/ui-system.md; docs/agent-guidelines-ui.md]
- Keine automatische Human-UAT-Freigabe; dauerhafte Artefakte statt verstecktem Agentwissen. [VERIFIED: AI-HANDOFF.md]

## Ergebnis und Verantwortung

Alle vier Clientbefunde bestehen unverändert: getrennte Gruppenstates/200ms-Poll, Navigation über alten Gridkontext und Stateclosure, unbeschränkte Manifest-PromiseMap, roher Coverpfad in vier Darstellungen. [VERIFIED: FansubVersionBrowser.tsx:36-59,123-141; ActiveFansubStory.tsx:21-74; AnimeEdgeNavigation.tsx:49-124; AnimeMediaProvider.tsx:11-25; app/anime/[id]/page.tsx:124-161; AnimeBackdropRotator.tsx:29, jeweils unter frontend/src]

**Empfehlung:** vorhandenen FansubVersionBrowser zum einzigen Statebesitzer machen; Navigation separat absichern; Medienresolver und Manifestcache getrennt planen, gemeinsame Dateien serialisieren. Backend-/Contractarbeit bleibt ein weiterer Plan derselben Phase.

| Fähigkeit | Besitzer | Wiederverwendung |
|---|---|---|
| Aktive Gruppe | FansubVersionBrowser Client | Story wird kontrolliertes Blatt, vorhandene SSR-Summary-/Episodendaten. [VERIFIED: page.tsx:285-297] |
| Gridnachbarn | AnimeEdgeNavigation Client | animeGridContext-Builder und getAnimeList. [VERIFIED: Komponente/Imports] |
| Bilddelivery | bestehende animeBackdrops.ts-/Medienseams | Providerwidth, Nextoptimizer für lokale Dateien. [VERIFIED: next.config.mjs; backend/internal/handlers/fansub_admin.go] |
| Manifestsharing | bestehender AnimeMediaProvider | Drei Contextconsumer ohne eigene Fetches. [VERIFIED: Provider/Rotator] |
| Requestabbruch | zentraler APIhelper | additive Signaloptionen, keine Authneuerfindung. [VERIFIED: frontend/src/lib/api.ts:1527-1631] |

## Vollständige Consumer-Matrix

Die folgenden Consumer wurden repositoryweit mit `git grep` über `frontend/src` und Scripts geprüft. [VERIFIED: ausgeführte Symbolinventur]

| Symbol | Consumer | Folgerung |
|---|---|---|
| FansubVersionBrowser | nur Animepage | um bestehende Storysummaries erweitern; keine künstliche Kompatibilität für unbekannte Consumer |
| ActiveFansubStory | Animepage und eigener Test | kontrollierte Props; Produktcaller in Browserkomposition verlagern |
| onActiveFansubChange | nur Deklaration und Aufruf im Browser, nirgends übergeben | kann Eventcallback bleiben, kein zweiter Statebesitzer |
| AnimeEdgeNavigation | nur Animepage | `{anime,page}` als Target |
| AnimeMediaProvider | Animepage und eigener Test | vorhandene Map weiterentwickeln |
| useAnimeMediaManifest | Rotator, TitleLogo, InfoBanner | Contextvertrag nullable behalten, kein Consumerfetch |
| normalizeBackdropImageURLs / normalizeThemeVideoURLs | nur Rotator | Bilddelivery ändern, Videoverhalten erhalten |
| resolveInfoLogoURL / resolveInfoBannerURL | nur Providerblätter | gemeinsame Bildauflösung |
| getAnimeBackdrops | MediaProvider; releaseDetailPageData.tsx:64 | optionales Signal additiv; SSRreleasecaller bleibt funktionsfähig |
| getAnimeList | Anime-Liste, EdgeNavigation, AdminAnimeOverviewClient, useAnimeBrowser, useJellyfinSyncImpl, Admin-Episodespage, APIwrapper bei api.ts:9579 | Options additiv; Cache/Revalidate/Adminauth unverändert |
| getCoverUrl | zahlreiche Public-/Admincaller | keine globale Semantikänderung; begrenzten Detail-Displayresolver in vorhandener Anime-Mediennaht |
| resolvePublicApiUrl | globale URLauflösung plus Tests | Queryfunktion nicht global verändern; Deliveryfähigkeit im Animebildresolver unterscheiden |

## F-11: ein gemeinsamer Auswahlbesitzer

### Konkrete Empfehlung

1. FansubVersionBrowser erhält vorhandene `fansubStoryGroups` und rendert ActiveFansubStory in Fragment unmittelbar vor seiner bisherigen Section. DOM-Reihenfolge Story → Filter → Episoden bleibt. Page entfernt ihren separaten Story-Aufruf.
2. Story erhält `activeFansubGroupID` und `fansubGroups`; sie berechnet nur die Gruppe und `buildFansubStoryPreview`. Storagehelper, State und Poll dort entfernen.
3. Browser initialisiert aus validen deduplizierten Props rein mit Primär-/erstem Fallback. Kein window/localStorage im Initializer: SSR und erster Hydrationsrender identisch.
4. Bestehenden Key `anime:${animeID}:fansub-filter` nach Mount einmal sicher lesen. Bereits Zugriff auf localStorage, getItem, JSONparse und Validierung gehören in try/catch. Nur positive sichere Integer aus aktuellen Options akzeptieren; sonst Fallback. Null nur bei null Optionen.
5. Nur explizite Auswahl persistieren. Kein Mount-Schreibeffect, der Zweitgruppe vor dem Lesen überschreibt. setItem-Fehler dürfen lokale Auswahl nicht verhindern.
6. Multitabsemantik festlegen: letztes gültiges persistiertes Event übernimmt Auswahl in allen Tabs desselben Anime. Nur eigener Key oder clear-Event (`key === null`); fremde Animekeys ignorieren. Entfernen, ungültiges JSON oder entfernte ID → Fallback. Externe Events nicht zurückschreiben.
7. `key={anime.id}` erhalten; bei Optionsänderung bestehende ID gegen aktuelle Optionen validieren. Späte Mountcallbacks bei IDwechsel/Unmount ignorieren. Story/Filter/Versionsliste dürfen nie verschiedene IDs beziehen.
8. Dateilokaler Parser reicht. Keine neue globale Registry, Provider oder allgemeine Hook-API.

Bestehende Lint-/React-Analogie: `useCancellableSlugState.ts:52-85` schreibt asynchrone Ergebnisse, nicht synchronen Effectstate; `useDebouncedSearch` besitzt kontrollierten Props-/URL-Stateabgleich. [VERIFIED: genannte Dateien]

### Testplan

Neue `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`: zwei Gruppen/mehrere Varianten, Primary, gespeicherte Zweitgruppe, ungültige/entfernte ID, keine Gruppe, blockiertes getItem/setItem, Storageevent/Fremdkey/Clear, Animewechsel, entfernte Option. Storytext, aria-pressed und sichtbare Varianten gemeinsam prüfen. StrictMode darf gespeicherte Zweitgruppe nicht überschreiben. Serverrender + hydrateRoot bei voreingestelltem Storage auf Hydrationsfehler prüfen. Bestehenden Storytest auf kontrollierte Props umstellen. Fetchspy bleibt bei Gruppenwechsel unverändert. [VERIFIED: vorhandenes Markup/Storytest; vorgeschlagene Abnahme]

## F-13: Nachbar plus Gridseite und awaitbares Ergebnis

- Ergebnis: `{ previous: {anime,page}|null, next: {anime,page}|null }`.
- Loader gibt Promise dieses Ergebnisses zurück. `inFlightRef` teilt sie zwischen Hover, Focus, Touch und Klick. handleNavigate verwendet direkt awaitetes Ergebnis statt alter Stateclosure.
- Randnachbar speichert tatsächliche Seite. Zielquery über `buildAnimeGridQuery({...gridParams,page:target.page})`, dann `buildAnimeDetailHref`. Filter/per_page erhalten.
- Kontextkey aus Anime-ID + normalisiertem gridQuery. Bei Änderung/Unmount aborten; alte Erfolge, Fehler und finally dürfen neuen Kontext nicht ändern. Laden ohne gültigen Kontext unterlassen.
- AnimeListRequestOptions additiv um `signal?: AbortSignal`; Durchreichung an vorhandenes RequestInit. getSearch-Signalhandling als Analogie.
- Status idle/loading/ready/error statt geladen-Ref vor Antwort. Pendingrequest auf Hover darf nachfolgenden ersten Klick nicht per disabled verschlucken; Klick übernimmt Promise. Erst fertiges Ergebnis deaktiviert nicht vorhandene Richtung. Previewrichtung sofort merken, Inhalt kommt nach Ergebnis. Fehler muss erneute Interaktion erlauben.

`useCancellableSlugState` ist geprüft, aber liefert State statt einer direkt awaitbaren imperativen Promise. Kein breit genutzter Hook muss für diesen lokalen Fall umgebaut werden; Abort-/Kontextschutz als Muster übernehmen. [VERIFIED: useCancellableSlugState.ts:14-25,60-95; AnimeEdgeNavigation.tsx:49-124]

Tests: neues AnimeEdgeNavigation.test.tsx mit drei Seiten, Anfang/Ende vorwärts/rückwärts, erster Klick bei deferred Promise, Hover/Focus/Touch plus Klick, deduplizierter Request, Rerenderabort, später alter Erfolg/Fehler/finally, fehlende currentID, Fehlerretry, kein Initialrequest. Router-URL samt page und Filtern prüfen. animeGridContext-Roundtriptest und API-Signal-Fetchtest ergänzen. [VERIFIED: vorhandene API/Builder; vorgeschlagene Abnahme]

## F-09: Bildbudget für sämtliche Coververwendungen

### Bestehende Deliverypfade

- getCoverUrl begrenzt nichts. shouldUseUnoptimizedImage hält `/api/v1/media/` pauschal für bereits optimiert; ohne width stimmt dies für den Providercover nicht. [VERIFIED: frontend/src/lib/utils.ts:16-54; page.tsx:124-161]
- Poster, CSS-Reflexion, Hero-CSS und Rotatorfallback brauchen denselben begrenzten Displaypfad. Nur Poster auf ResponsiveImage umzustellen lässt den Originaltransfer in CSS bestehen. [VERIFIED: page.tsx:124-161; page.module.css:211; AnimeBackdropRotator.tsx:29]
- Providerproxy setzt maxWidth bei width. StaticFS und Next `/media/[...path]` transformieren width-/quality-Query nicht. [VERIFIED: backend/internal/handlers/fansub_admin.go, buildJellyfinImageProxyURL; frontend/src/app/media/[...path]/route.ts]
- Animeupload erzeugt ein echtes 300px-thumb. MediaRepository.GetMediaFileVariantURL existiert. 300px genügt nicht automatisch Desktop/DPR; Animeposter-Pfadfallback hat nicht durchgängig media_files-Einträge. Keine `original`→`thumb`-Stringersetzung. [VERIFIED: Backend-Preflight: media_upload_image.go; media_upload.go:32; media_repository.go:312]
- ResponsiveImage nutzt immer Nextoptimizer und hat keinen Originalfallback nach Fehler. Nextconfig erlaubt lokale `/media/anime/**`, `/covers/**` und konfigurierte `/api/v1/media/**`, nicht beliebige Hosts/Pfade. Produktionsoptimierung lokaler IP ist außerhalb explizitem Probe-Opt-in deaktiviert. [VERIFIED: ResponsiveImage.tsx; ResponsiveImage.test.tsx; ResponsiveImage.config.test.ts; next.config.mjs]

### Konkrete Empfehlung

In bestehender `frontend/src/lib/animeBackdrops.ts` eine fokussierte gemeinsame Bilddeliveryfunktion ergänzen. Vorhandene Logo-/Banner-/Backdropresolver ebenfalls darüber führen. Bestehende URLauflösung verwenden; Transformation nur für bekannte unterstützte Klassen:

1. **Provider `/api/v1/media/image`:** echten width/quality-Parameter verwenden. Für Cover zunächst gemeinsam genutzten maximal 512px breiten Displaypfad als technische Budgetentscheidung; bei 160–260px CSSbreite mit DPR1/2 messen und visuell prüfen. Kein roher Pfad in einem der vier Consumer. Andere Slots besitzen eigene passende Größen.
2. **Lokale `/media/anime/**` und `/covers/**`:** vorhandener Nextoptimizer. `getImageProps` liefert bereits generierten optimierten src oder geeignetes image-set für CSS. Keine selbst zusammengesetzte Optimizer-URL. Alle Coverstellen erhalten denselben Display-src. Bereits optimierten src nicht nochmals durch ResponsiveImage optimieren; vorhandenes Next Image kann ihn als fertige begrenzte Quelle anzeigen. Wiederverwendung liegt im bestehenden Optimizer und gemeinsamen Resolver.
3. **Andere konfigurierte API-Mediadateien:** nur zulässigen vorhandenen Optimizerpfad verwenden. `/api/v1/media/files` ist nicht automatisch ein Resizeendpoint. Produktionsprobe auf VM gesondert dokumentieren; keine Lockerung `dangerouslyAllowLocalIP` im Produkt.
4. **Unbekannte externe Quelle:** keine fake width-Parameter und keine pauschale remotePatterns-Freigabe. Konkrete existierende Quellen inventarisieren; ohne erlaubten begrenzten Pfad vorhandener Platzhalter statt unbounded Escape. Fehlende optionale Manifestbilder können entfallen.

512px ist eine vorgeschlagene Engineeringgrenze, kein im Audit bewiesenes universelles Qualitätsoptimum. Falls DPR-/Sichtprüfung Anpassung verlangt, Grenze nachvollziehbar mit Messung ändern; keinen Originalfallback einschalten. Videoresolver, Audiointeraktionen und Rotationstakt bleiben unverändert.

Next dokumentiert getImageProps ausdrücklich für CSS-background/image-set sowie loader für tatsächlich skalierende Bilddienste. [CITED: https://nextjs.org/docs/app/api-reference/components/image; VERIFIED: Context7 CLI `/websites/nextjs`, 2026-09-13]

Beispiel aus dokumentiertem vorhandenen Frameworkmechanismus, ohne manuell gebaute Optimizerroute:

```tsx
const { props } = getImageProps({
  src: '/media/anime/1/poster/asset/original.jpg',
  alt: '', width: 256, height: 384, quality: 75,
})
// props.src ist die von Next erzeugte Quelle; dieselbe Quelle an die
// Coverdarstellung und dekorative CSS-Verwendungen übergeben.
```

Die konkrete Quelle muss aus dem DTO stammen; Beispielpfad ist keine neue Pfad-/IDheuristik. [CITED: Next Image-Dokumentation oben]

### Tests und Browserbelege

Neue animeBackdrops.test.ts: relative/absolute Providerquellen, Queryerhalt, tatsächliches width/quality, lokale Quelle ohne fake Query, erlaubte Optimizerquelle, unbekannte/ungültige/leere Quelle. Pageintegration: alle vier Coverstellen verwenden begrenztes Ergebnis. Bestehender page.performance.test.ts enthält exakte Rotator-JSX-Zeichenkette; sinnvoll auf Resolver-/SSRgrenze ändern, nicht nur neuen String spiegeln. [VERIFIED: page.performance.test.ts:10-15]

CDP bei 390×844 und 1440×900, DPR1/2: URL, Status, MIME, dekodierte Dimensionen, Transferbytes, Cachehit und vollständigen Abschluss erfassen. Kalter und warmer Kontext; lokale und Providerfixture; 404/500; kein Raworiginal-Refetch aus CSS oder Fehlerfallback. Identische URL in mehreren Darstellungen darf nicht künstlich mehrfach geladen werden. Video separat beobachten, keine neue Audioregel ableiten.

## F-10: begrenzter geteilter Manifestcache

### Technische Festlegung für Plan

Vorhandene Map im AnimeMediaProvider weiterentwickeln. Keine zweite Registry, Library oder allgemeiner Querycache. Empfohlene kleine Policy: **60s Freshness, höchstens 20 ungenutzte erfüllte Einträge via LRU**. Aktive/pending Einträge sind durch echte Providerreferenzen gebunden und dürfen nicht unter lebenden Consumern abgebrochen werden. Diese Werte sind vorgeschlagene technische Defaults, im Plan explizit festzuhalten.

Entry: Promise/Controller, erfüllter Wert, expiresAt/lastAccess und Provider-Referenzen/Abonnements. Drei Bildblätter lesen nur Context. `getAnimeBackdrops` erhält optionales Signal, SSRreleasecaller bleibt kompatibel.

- Acquire: frischen Erfolg oder InFlight teilen; abgelaufenen Eintrag erneut laden.
- Release: Pendingrequest erst nach letztem Provider abbrechen. Cleanup um Microtask verzögern und Refs erneut prüfen, damit StrictMode Cleanup/Setup nicht den Startrequest abbricht und dupliziert. Bestehender StrictMode-Einrequesttest bleibt Pflicht.
- Failure/Abort: Eintrag nur bei identischer Entryreferenz entfernen; alte Rejection darf neuen Eintrag derselben ID nicht löschen. Null nicht dauerhaft als Erfolg speichern.
- Innerhalb derselben Sitzung: erneuter Acquire und sichtbarer focus/visibilitychange revalidieren ausschließlich nach TTLablauf. Kein Intervall, kein permanentes Hintergrundpolling. Fokusburst teilt eine Promise.
- Identische erneute Manifestantwort behält Objektidentität, damit Rotator nicht unnötig Video/Shuffle neu startet. Geänderte Antwort aktualisiert Context. Keine generelle Audio-/Videoneudefinition.
- Manifeststate an Anime-ID binden; alte Daten dürfen auf Propswechsel nicht kurz unter neuem Anime erscheinen. Pagekey bleibt, Provider trotzdem mit Rerender testen.
- Abgelaufene/älteste unbenutzte Erfolge evicten. Aktive Abonnements nicht verlieren. Nach vielen sequentiellen Besuchen bleibt inaktive Retention innerhalb Limit. Referenzzählung/Timer nicht innerhalb React-Stateupdaters mutieren.

Keine bestehende Anime-Medienänderungs-Event-/Invalidierungsnaht wurde bei repositoryweiter Suche gefunden. TTL/Focus/Reacquire vermeidet neue Adminuploadänderungen und APIpolling. [VERIFIED: git grep media updated/changed, dispatchEvent media, invalidate media/anime]

### Tests

AnimeMediaProvider.test.tsx erweitern: drei Consumer/ein Request; zwei Provider/ein Request; StrictMode; ein Provider weg ohne Abort; letzter weg mit Abort; Fehler dann Retry; frisch wiederverwenden; TTL abgelaufen mit neuer Antwort in derselben SPA; Fokusburst; identische Antwort setzt Video nicht zurück; IDwechsel während Pending; alte Rejection vs neuer Entry; mehr als Limit sequentielle IDs. Fake Time und reale Mock-AbortSignals, keine reale Wartezeit. Bestehende Themevideo-Autoplayabnahme erhalten.

## Fixtures ohne Laufzeitdatenänderung

Vitest-DTOfixtures und deferred Promises decken Gruppen, Mehrseiten, Cache und Fehler. Browser `context.route()` erfüllt Client-JSON/Medien; `context.addInitScript()` setzt isolierten Browserstorage. Zwei Pages eines frischen Contexts prüfen tatsächliche Storageevents. SSRfetches werden nicht vom Browserrouting abgefangen: isolierte Nextinstanz mit vorhandener API_INTERNAL_URL auf GET-only Fixtureserver nutzen, nicht laufende API/DB ersetzen. [VERIFIED: bestehendes run-profile-image-probe.mjs; APIbase-Konvention; vorgeschlagener Ablauf]

Identitätskollision, Assignmentdivergenz und N+1-/Rowgrenzen gehören in den Backend-/Contractplan. Keine DB-INSERTs oder Seeds allein zur Herstellung der UIedgecases.

## Produktionsbuild ohne laufende .next zu überschreiben

Compose mountet Source auf `/app` und gemeinsames Volume auf `/app/.next`; Devserver läuft per `npm run dev -- --webpack`. Alte phase134/135-green-gate-Kommandos bauen direkt dort und sind für parallelen Livebetrieb ungeeignet. Dockerfile-builder baut dagegen in eigener Image-Stufe; .dockerignore schließt .next und node_modules aus. [VERIFIED: docker-compose.override.yml:38-59; scripts/phase134-green-gate.sh:325; phase135-green-gate.sh:34; frontend/Dockerfile:6-28; frontend/.dockerignore]

Empfohlener schmaler Weg je Phasenverifikation:

1. Innerhalb Frontendcontainer eindeutig benanntes `/tmp/team4s-anime-build-<phase>/frontend` anlegen.
2. Frontendsource, Publicassets und Konfiguration kopieren; `.next`, node_modules, `.env*`, Logs und tsbuildinfo ausschließen. Keine Hardlinks auf veränderbare Source.
3. `/app/node_modules` in isolierter Kopie verlinken. Benötigte Geschwister shared/backend/docs/.planning/infra nur auf vorhandene read-only Containerpfade verlinken. Keine neue Packageinstallation.
4. Ausschließlich dort `NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack`. Generierte Types, next-env, tsbuildinfo und .next bleiben auf Dockerplatte. Kein ignoreBuildErrors.
5. Bei Erfolg optional next start auf freiem isolierten Port; API_INTERNAL_URL reale Public-API oder GET-only Fixtureserver. MEDIA_BASE_PATH auf bestehendes `/media`, wenn gebraucht. Keine Compose-/Envdateiänderung.
6. Messungen/Screenshots in Container-/tmp; nur kleine Resultate/ausgewählte Evidenz dauerhaft kopieren. Eigenen Scratch erst nach Prüfung des exakten Zielpfades bereinigen; keine fremden Tempdirs/Volumes.

`run-profile-image-probe.mjs` ist die Analogie für Ports, GET-only Fixtureserver, Child-Teardown und explizites Probe-Opt-in. `verify-profile-image-delivery.mjs` erwartet noch einen inzwischen veralteten Originalfallback-Testtitel; nicht ungeprüft als vollständiges Pflichtkommando übernehmen. Seine MIME-/Maß-/Cacheprüfung kann gezielt genutzt werden. [VERIFIED: genannte Scripts; ResponsiveImage.test.tsx]

CDP-/Byte-/Bilddimensionenerfassung aus `audit-public-member-performance.mjs`, Lebenszyklusmuster aus `audit-public-member-navigation-retention.mjs`; keine profilspezifischen Selektoren blind übernehmen. Für diesen Scope keine schweren Heapdumps erforderlich. [VERIFIED: gelesene Scripts]

## Konfliktträchtige Dateien

| Datei | Reihenfolge / Verantwortung |
|---|---|
| app/anime/[id]/page.tsx | Phase1 Meta/Auth/Nav, Phase2 Auswahl/Cover; ein Integrator |
| FansubVersionBrowser.tsx | Phase1 Pretty-CTA, Phase2 State, Contractplan Varianten; nicht parallel editieren |
| lib/api.ts | Phase1 Watchlist/DTO, Phase2 Signal und grouped Contract; ein API-Integrator |
| animeBackdrops.ts | Bildresolver gemeinsam; Videos erhalten |
| AnimeMediaProvider.tsx | Bildblätter und Cache serialisieren oder Funktionen klar trennen |
| types/anime.ts, episodeVersion.ts, OpenAPI | Backend-/Contractplan besitzt DTOänderungen; Frontend konsumiert danach |

Vorhandene Infrastruktur: Vitest/jsdom/Testing Library, Playwright, npm typecheck/lint/build. package.json deklariert React 18.3.1, Next ^16.1.6, Vitest ^3.2.4, Playwright 1.55.0. Dies sind Projektdeklarationen, keine aktuelle Versions-/Upgradeempfehlung. Keine neue Library vorgeschlagen. [VERIFIED: frontend/package.json; vitest.config.ts]

Geplante schmale Checks: FansubVersionBrowser/Story, AnimeEdgeNavigation, animeGridContext, animeBackdrops, API-Signalvertrag, AnimeMediaProvider, ResponsiveImage + Config, Pageintegration/Performanceguard. Nach Implementierung typecheck/lint/build und git diff --check; neue Fehler von bestehenden getrennt dokumentieren.

## Runtime-State-Inventar

| Kategorie | Bestand / Aktion |
|---|---|
| Gespeicherte Daten | localStorage `anime:<id>:fansub-filter`; Key/Shape erhalten und validieren. Keine DB-/Mediendatenmigration. [VERIFIED: Browser/Story] |
| Live-Serviceconfig | Compose läuft; keine notwendige Liveconfigänderung. Produktionsprobe separat. [VERIFIED: compose ps/override] |
| OSregistrierung | Keine Umbenennung/Installation im Scope; untersuchte Pfade verwenden Browser-Events/Containerprozess. Keine globale OSinventur behauptet. [VERIFIED: betroffene Sources/Compose] |
| Secrets/Env | API_INTERNAL_URL/NEXT_PUBLIC_API_URL und Mediengrenzen erhalten; keine Tokenwerte lesen/ändern; .env nicht in Scratch kopieren. [VERIFIED: APIhelper/Nextconfig/Media-Route] |
| Buildartefakte | Gemeinsames /app/.next nicht überschreiben; Container-/tmp-Isolation. [VERIFIED: Compose/Dockerfile] |

## Quellen und Confidence

HIGH: genannte Source-, Test-, Workflow-, Composepfade direkt gelesen; Audit AUDIT.md vollständig gelesen; Symbolconsumer repositoryweit gesucht. Lokale Medienvarianten zusätzlich mit Backend-Preflight abgestimmt. Next getImageProps/loader via Context7 CLI `/websites/nextjs` und offizielle Image-Dokumentation verifiziert. [VERIFIED: ausgeführte Reads/Grep/Context7]

Recherche hat keine Produktprüfung als bestanden ausgegeben. Offene technische Verifikation: Coverbytes/Dimensionen unter DPR2, festzuschreibende Budget-/Cachedefaults, isolierter Produktionsbuild, Backend-Contract-/Rowbudgetintegration. Kein Human-UAT-Sign-off.
