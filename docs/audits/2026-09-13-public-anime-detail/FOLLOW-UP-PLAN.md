# Folgeplan – öffentliche Anime-Detailseite

**Planungsartefakt zum Audit vom 13.09.2026. Nicht ausgeführt.** Baseline `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`; Befunde und Grenzen in [AUDIT.md](AUDIT.md). Dieser Plan ist keine automatisch gestartete neue GSD-Phase.

## Ziel und Arbeitsgrenzen

Die Anime-Seite soll ihre vorhandene Aufgabe verlässlich erfüllen: neutrale Animeinformationen und Episoden, nachvollziehbare Fansub-Einstiege, bewusst öffentliche Credits und Kommentare. Funktionsfehler zuerst, danach konkrete Daten-/Medienkosten reduzieren. Keine pauschale Neugestaltung, kein Austausch der gesamten Komponentenarchitektur, kein Löschen von Legacy-Routen oder fachlichen Release-/Segmentdaten.

Jeder Slice braucht vor Umsetzung einen aktuellen `git status`, Composezustand und Abgleich gegen die dann geltenden Phasenentscheidungen. Kanonisch ausschließlich `/home/d1sk/team4s`; bestehende fremde Änderungen bleiben unangetastet. Kein Reset/Reseed als implizite Vorbereitung. Benötigte Testfälle vorzugsweise isolierte Unit-/Contractfixtures; echte VM-Datenfixture nur als ausdrücklich eigener Auftrag.

**Gemeinsames read_first:** `AGENTS.md`, `AI-HANDOFF.md`, `docs/engineering/implementation-contract.md`, `docs/api/api-contracts.md`, `docs/frontend/auth-api-client.md`, `docs/architecture/db-schema-fansub-domain.md`, `docs/frontend/ui-system.md` sowie die jeweils unten genannten vorhandenen Analogdateien. Keine neue Komponente, DTO, API oder Mediafunktion ohne vorherigen Äquivalenzvergleich.

## Reihenfolge und Zuordnung

| Slice | Priorität / Findings | Abhängigkeit | Fertiges Ergebnis |
|---|---|---|---|
| S1 | P1/P2: F-01, F-03 | keine | Titel lesbar, kein horizontaler Überlauf |
| S2 | P1/P2: F-02, F-12 | keine | aktive Session korrekt; Fehler ehrlich und sichtbar |
| S3 | P2: F-04, F-05 | Produktwahl nur für ungesicherte Kennzahlen/Embyquelle | wahrheitsgemäße Kennzahlen und strikte Routenfehler |
| S4 | P2: F-06 | vorhandene autoritative Slugs/Vertrag klären | primärer Link nutzt Pretty-Projektresolver |
| S5a | P2: F-07 | Sichtbarkeits-/Existenzvertrag bewahren | Relations ohne Anime-Vollreload |
| S5b | P2: F-07, F-08, F-14 | nach Consumerinventar, gemeinsam mit Vertrag | begrenzter, dokumentierter Bedarf statt ungenutzter Datenarbeit |
| S6a/S6b | P2: F-11, F-13 | isolierte Mehrgruppen-/Mehrseitenfixtures | eine Gruppenwahl und verlässliche Gridnavigation |
| S7 | P2: F-09, F-10; Medienbeobachtungen | explizites Bild-/Audio-/Cacheverhalten | passendes Medienbudget und begrenzte Manifestlebenszeit |
| S8 | P3: F-16, F-17 | Informationsumfang/öffentlichen Drilldown festlegen | Kommentare/Genres/Credits konsequent erreichbar |
| S9 | P2, global: F-15 | eigener Shellscope, Authvertrag | schmaler Navigationsbedarf ohne Ownerprofil-Verlust |

S1/S2 sind fachlich unabhängig; S5a ist ein kleiner eigenständiger Serverfix. S5b, S7 und S9 sind keine Voraussetzung dafür, die sichtbaren Funktionsfehler zu korrigieren. S6a/S6b sind getrennte Änderungen und sollten getrennt überprüfbar bleiben. Eine große Sammel-PR würde die Abnahme unnötig erschweren.

## S1 – CSS-Komposition korrigieren

**read_first:**

- `frontend/src/app/anime/[id]/page.module.css`
- `frontend/src/components/fansubs/FansubVersionBrowser.module.css`
- `frontend/src/components/anime/AnimeContributionsSection.module.css`
- `frontend/src/components/anime/AnimeBackdropRotator.module.css`
- `frontend/src/styles/globals.css`
- Phase149-Verification; `evidence/layout.json` und vorhandene Initialscreenshots

**Arbeit:** die tatsächliche Text-/Flächenvererbung korrigieren und Hero-Bild innerhalb seines zuständigen Containers begrenzen. Nicht global alle Overflows verstecken und dadurch Slider/Dropdowns abschneiden. Dunkel/hell müssen eine kohärente Tokenkomposition erhalten; vorhandene Struktur, Abstände und Inhalte nicht neu entwerfen.

**Abnahme:** bei 360/390/767/768/1440px Titel sichtbar; Contributionheading gemäß Projektkontrastregeln lesbar; document.scrollWidth≤Viewportbreite und horizontaler scrollX bleibt0. Aufgeklappte Versionszeile, Logo/Banner und Relationsrail ebenfalls prüfen. Screenshots gegen Auditbelege vergleichen. Kein neues kosmetisches Redesign als Nebenprodukt.

## S2 – Session und Fehlerzustände

**read_first:**

- `frontend/src/components/watchlist/WatchlistAddButton.tsx`
- `frontend/src/components/comments/CommentForm.tsx`
- `frontend/src/components/anime/AnimeContributionsSection.tsx`
- `frontend/src/app/anime/[id]/page.tsx`
- `frontend/src/lib/useAuthSession.ts`, `frontend/src/lib/api.ts`
- `frontend/src/components/layout/AppShellClientWrapper.tsx` als funktionierende Access-ODER-Refresh-Analogie

**Arbeit:** bestehende Sessionnaht verwenden; kein lokaler Cookie-/Bearer-/Keycloakrefreshcode. Watchlist zwischen unbekannt/ladend, vorhanden, nicht vorhanden und Fehler unterscheiden. Custom-Styling darf Fehlermeldungen nicht entfernen. Contributions-500 darf nicht als leere fachliche Liste erscheinen. Sessionwechsel nach Mount muss reagieren; SSR-Snapshot darf eine erfolgreiche spätere Prüfung nicht überstimmen.

**Abnahme:** isolierte Fälle (a) Access fehlt/Refresh gültig, (b) Access abgelaufen/Refresh gültig, (c) beide fehlen, (d) Sessionevent nach Mount, (e)401/5xx/Netzfehler, (f) bestehender Watchlisteintrag. Zentraler Refresh nur einmal bei konkurrierenden Requests; kein versehentliches Add/Delete aus unbekanntem Zustand; echte leere Contributions und Fehler getrennt. Keine Credentials in Testlogs. Ein autorisierter Live-Authlauf muss die im Audit dokumentierten Middleware-Schreibeffekte berücksichtigen.

## S3 – Aussagekräftige Daten und strikte Anime-URL

**read_first:**

- `frontend/src/app/anime/[id]/page.tsx`
- `frontend/src/lib/emby.ts`, `frontend/src/types/anime.ts`
- `backend/internal/repository/anime_v2.go`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx` als aktuelle Routinganalogie
- bestehende APIverträge und `evidence/route-probes.json`

**Arbeit:** nur vollständige positive numerische IDs akzeptieren; unbekannte Ressourcen korrekt als nicht vorhanden behandeln. Seitentitel/Canonical/Error-Robots mit vorhandenen Next-Routenmustern konsistent machen. Fehlende Bewertung/Views nicht als erfundene Zahl ausgeben. Feste Emby-Testzuordnung von fachlichem Source-/Mediafeld unterscheiden.

**Vor Umsetzung zu entscheiden:** Soll Bewertung/Views überhaupt Teil dieses Produktumfangs sein? Gibt es dafür eine autoritative vorhandene Quelle? Soll ein Emby-CTA existieren, und aus welchem bestehenden Feld? Ohne Quelle ist das Weglassen einer ungesicherten Anzeige eine mögliche kleine Lösung; keine neue Ratingdatenbank oder Media-ID-Heuristik erfinden.

**Abnahme:** gültige ID weiterhin erreichbar; `1abc`, `1.5`,0, negative und unbekannte ID liefern keine fremde Animeansicht und keine indexierbare erfolgreiche Inhaltskopie. Streaming-/notFound-Semantik tatsächlich per HTTP und Dokumentmeta prüfen. Zwei isolierte Animefixtures zeigen keine kopierte 7.8; Sourcezuordnung unabhängig von Test-ID22. Numerische Anime-Route bleibt erhalten; Anime-Slugmigration ist ausdrücklich separater Umfang.

## S4 – Kanonischer Projekteinstieg

**read_first:**

- `frontend/src/components/fansubs/FansubVersionBrowser.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/page.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx`
- `frontend/src/lib/api.ts`, `frontend/src/types/anime.ts`, `shared/contracts/openapi.yaml`
- Phase155-CONTEXT/VERIFICATION und Resolver-/Navigationhelpers aus dem vorhandenen Loader

**Arbeit:** vorhandene autoritative Gruppen-/Animeslugs an der bestehenden schlanken Datennaht verfügbar machen und vorhandenen Pretty-Pfadbuilder nutzen. Anime-DTO liefert aktuell keinen anime_slug: niemals den Titel im Browser zu einem vermuteten Slug machen oder zur Linkbildung einen zweiten Vollprofilrequest ergänzen. Falls ein Feld ergänzt werden muss, bestehende Projektion/Contract gemeinsam erweitern; keine neue parallele Resolverlogik.

**Abnahme:** sichtbarer „Gruppenbereich“-Link führt zum identischen Anime-/Gruppenprojekt über kanonische Pretty-Route; navigation zur Projekt-Member-/Releaseansicht weiterhin richtig. Numerische gespeicherte URL weiterhin funktionsfähig und korrekt canonical. Slimresolver behält Phase155-Budget; kein Vollgruppenprofil allein zur neuen Linkauflösung. Fehlende/umbenannte Slugs und unzulässige Projektkombination gesondert testen.

## S5a – Kleiner Relations-Queryfix

**read_first:** `backend/internal/handlers/anime.go`, `backend/internal/repository/anime.go`, `anime_v2.go`, `anime_relations.go`, vorhandene enabled-Anime-Existenzprüfungen und öffentliche Relationsverträge.

**Arbeit:** vollständigen GetByID als Existenzprüfung durch eine vorhandene passende schmale Naht ersetzen. Unterschied zwischen nicht vorhanden und disabled bewahren; keinen Publiczugriff allein wegen billigerer Query erweitern.

**Abnahme:** aktiver Anime mit/ohne Relationen, unbekannter und disabled Anime liefern dieselbe fachliche Semantik. Erfolgreicher Relationspfad höchstens zwei Datenstatements (Existenz + Relations), statt acht. Bei ansonsten identischem ungecachtem Basispfad fällt das statische vollständige Grundbudget damit von38 auf höchstens32. Vorher/Nachher zusätzlich kontrolliert messen; keine zugesagte Millisekundenersparnis aus Queryzahl ableiten.

## S5b – Varianten-/Medienlookup und APIvertrag

**read_first:**

- `backend/internal/repository/episode_version_repository.go`
- `backend/internal/repository/episode_version_repository_read_helpers.go`
- `backend/internal/repository/anime_assets.go`, `anime_metadata.go`, `anime_v2.go`
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx`, `frontend/src/types/episodeVersion.ts`
- `shared/contracts/openapi.yaml`, `shared/contracts/admin-content.yaml`
- Phase155-Read-Model und Phase156-13/15-Summaries

**Arbeit:** zuerst repositoryweit alle Consumer der Felder/Optionen inventarisieren. Nicht angezeigte Segment-/Stream-/Timingfelder und redundante Count-/Metadatenqueries nur aus dem passenden Consumerpfad entfernen. Neutrale Episodefallbacks explizit erhalten oder bewusst durch einen gleichwertigen Fehlerzustand ersetzen. Wenn Segmentdaten gebraucht werden, vorhandene Assignment-Projektion nutzen; keine zweite Rangeautorität. `fansub_groups` und tatsächliche IDsemantik im kanonischen OpenAPI/TS/Backendvertrag angleichen.

**Entscheidungspunkt:** bei großen Serien vorhandene bounded Projektionen erweitern oder eine explizite kleinere Readprojektion schaffen? Erst nach Consumervergleich entscheiden und begründen. Keine pauschale Löschung von DTO-Feldern, alten Tabellen oder Streamcompatibility.

**Abnahme:** exakte Request-/DTO-Contracttests; includeVersions/includeFansubs-Varianten; leere Serie, neutrale Folge ohne Variante, mehrere Gruppen/Varianten, Range-/Assignmentdivergenz. Keine Query pro Episode/Contributor; dokumentierte Obergrenze für Rows/Payload des neuen öffentlichen Bedarfs. Variante und Releaseversion in Fixtures absichtlich mit unterschiedlichen IDs sowie IDkollision prüfen, bevor das polymorphe Relay umgestellt würde. Alle echten Consumer bleiben korrekt; kein zugrunde liegendes Release-/Segmentdatum löschen.

## S6a – Eine persistierte Gruppenauswahl

**read_first:** `ActiveFansubStory.tsx`, `FansubVersionBrowser.tsx`, `page.tsx`, bestehende Callback-/Storagehelper, `frontend/src/components/fansubs/__tests__/ActiveFansubStory.test.tsx`.

**Arbeit:** einen vorhandenen gemeinsamen Clientbesitzer/Callback statt zwei unabhängigen Booleans/IDs verwenden. SSR-deterministischer Erstzustand, danach kontrollierte Persistierung. Storagefehler abfangen; Multi-Tab-Verhalten bewusst definieren. Keine neue globale animeübergreifende Statewahrheit.

**Abnahme:** Primär-/Zweitgruppe, ungültige/entfernte gespeicherteID, blockierter Storage, Reload/Hydration, Wechsel fremder Tabs und Animewechsel. Story/Filter/Versionsliste bleiben synchron; kein wiederkehrendes Storagepolling; keine neuen Netzwerkrequests beim Auswahlwechsel. Cleanup und Screenreaderzustand prüfen.

## S6b – Nachbarnavigation

**read_first:** `frontend/src/components/anime/AnimeEdgeNavigation.tsx`, `frontend/src/lib/animeGridContext.ts`, `frontend/src/lib/api.ts`, bestehende Grid-Link-Consumer.

**Arbeit:** Zielanime und zugehörige Gridpage zusammen führen; Ergebnis des ersten asynchronen Loads direkt verwerten. Requestabbruch bzw. eindeutige Stale-Resultkontrolle auf vorhandener APInaht. Nicht zur Nachbarbestimmung die gesamte Animebibliothek laden.

**Abnahme:** erste/letzte Zeile, zwei oder mehr Gridseiten, Hin-/Zurück über Grenze, erster Klick bei langsamer API, Hover/Focus/Touch, Navigation während Request, nicht mehr vorhandene currentID. Ziel behält Filter/Sortierung und korrekte Page. Kein initialer Listenfetch ohne Gridinteraktion. Isolierte Fixture statt VM-ReSeed.

## S7 – Medienbudget, Manifestlebenszeit und Bewegung

**read_first:**

- `frontend/src/components/anime/AnimeMediaProvider.tsx`, `AnimeBackdropRotator.tsx`
- `frontend/src/lib/animeBackdrops.ts`, `frontend/src/lib/utils.ts`
- `frontend/src/components/ui/ResponsiveImage.tsx` und zugehörige Tests
- `backend/internal/handlers/fansub_admin.go`, `backend/cmd/server/main.go`
- `frontend/src/app/media/[...path]/route.ts`
- Phase153/154-Verifications und `evidence/runtime.json`

**Arbeit:** existierende responsive Bildpipeline passend zu tatsächlich gerenderter Breite/DPR verwenden. Für lokale Dateien reale Varianten wählen; Queryparameter an StaticFS nicht als Transformation behandeln. Anbieterproxy und Datei-Serving bleiben getrennte vorhandene Transportseams. Manifestsharing erhalten, aber begrenzte Lebensdauer/Invalidierung und Requestabbruch festlegen. Autorisierte Medienänderung muss bei erneutem Besuch sichtbar werden.

**Produktentscheidung vor Audioänderung:** Soll die Animeansicht ohne gezielte Medieninteraktion Video vorladen und auf einem beliebigen Klick Ton einschalten? Pause/Mute, reduzierte Bewegung, versteckter Tab und Mobile-Datenbedarf ausdrücklich definieren. Keine selbst erfundene globale Autoplaypolicy.

**Abnahme:** kalte und warme Browserkontexte, Mobile/Desktop/DPR, Original- und Providerbilder, fehlende Variante/404, Medienwechsel und längere SPA-Navigation. Für ein160px-Cover wird ein passender Bildkandidat geliefert; der ungebundene1000px-/740KB-Transfer entfällt. Byteziel aus vorhandenen Bildbudgetregeln festlegen und im Resultat messen. Genau ein Manifestrequest für drei Consumer; Cachegrenze/TTL/Invalidation testbar, keine stillen originalgroßen Fallbacks. Videobytes/Range separat vollständig messen,0 statt unbekannt nicht zulässig. Keine Upload-/Ownershipneuerfindung.

## S8 – Informationsumfang und kleine Wiederverwendung

**read_first:** `CommentSection.tsx`, `CommentForm.tsx`, `commentSectionState.ts`, `frontend/src/components/ui/Pagination.tsx`, `GroupContributionBlock.tsx`, `ReleaseVersionBreakdown.tsx`, `frontend/src/types/contributions.ts`, `page.module.css` und öffentliche Projektdrilldownhelpers aus155.

**Arbeit:** Kommentarübersicht gegen vollständige Historie bewusst entscheiden; vorhandene Pagination nutzen, falls Historie. Genreinformation auch mobil erreichbar halten. Contribution-Summary/Breakdown bei Bedarf begrenzen; Profil-/Projektlink nur bei tatsächlich erlaubtem und eindeutigem Kontext. Gleiche Personenzeile/Logoresolver/Relationtypen nur dort konsolidieren, wo Ownership und Semantik identisch sind. Lokale CSSreste vor Entfernung repositoryweit auf Consumer prüfen.

**Abnahme:**0/10/11Kommentare, neue Serverprops nach Refresh, optimistischer Kommentar ohne Duplikat; mobileGenres; öffentliche/historische/private Credits mit und ohne member_slug; Versions-only-Gruppe mit verborgenem Count; keine privaten Profilnavigationen und keine durch Zusammenlegung verlorenen Projektcredits. Keine erneute zweite Releasehistorie auf der Projekt-Memberseite einführen.

## S9 – Getrennter globaler Shell-Slice

**read_first:** `AppShellClientWrapper.tsx`, `AppShell.tsx`, `frontend/src/lib/useAuthSession.ts`, `frontend/src/lib/api.ts`, `backend/internal/handlers/app_profile.go`, `backend/internal/repository/member_profile_own_repository.go`, `member_profile_ensure_repository.go`, vorhandene Viewer-Seams aus154 und APIverträge.

**Arbeit:** benötigte Shellfelder exakt bestimmen und existierende schmale Identitäts-/Navigationsprojektion suchen. `/me` besitzt nicht automatisch alle Membership-/Navigationseigenschaften; Publicviewer nicht mit Ownerprofil vermischen. Falls eine neue schmale Projektion nötig ist, Entscheidung und Contract ausdrücklich dokumentieren. Reiche Ownerprofilseite und deren Datenumfang erhalten. Authmiddleware/JIT-Sync nicht nebenbei umbauen.

**Abnahme:** anonym, Account ohne Member, Member, mehrere Gruppenrollen, Leader/Admin, Sessionrefresh und manuelle Profilaktualisierung. Navigation/Avatar/Rollen unverändert korrekt; keine historischen Credits/RecentMedia allein für Shell geladen. SELECT-/Rowlock-/Authwrite-Budget getrennt nachweisen. Sourcekonfiguration und Authproben nicht mit Tokens in Logs dokumentieren.

## Prüfstrategie und Abschluss jedes späteren Slices

1. Relevante vorhandene Tests aus diesem Audit und gezielte neue Regression für den konkreten Fehler ausführen; keine reine Klassen-/Implementierungsspiegelung.
2. Typecheck und scoped Lint, anschließend verfügbare Projektchecks. Bestehende globale Lintfehler separat führen; die aktuell gebrochene Next-PageProps-Typisierung der numerischen Gruppenroute vor produktiver Buildfreigabe in einem kleinen expliziten Fix schließen.
3. Build in geeignet isolierter Composeumgebung durchführen, ohne `.next` des gemeinsam betrachteten Devservers zu überschreiben. Keine Installation von Runtimekomponenten auf Ubuntu.
4. Bei APIänderung kanonisches OpenAPI, TS, Handler/Repository und Backend-/Frontend-Contracttests gemeinsam prüfen. Bei Authänderung Refresh-only-/expiredAccess-Regression zwingend.
5. Livebrowser über den sichtbaren Nutzerweg prüfen; Link zum genauen View anbieten. Neue Fixtures/Produktrouten nicht als heimlichen Ersatz für funktionierende Discoverability verwenden.
6. Eigenen Diff und `git diff --check` prüfen, ausschließlich Slice-Dateien ändern; Findings mit neuem Beleg schließen. Offene Phase156/157-UAT bleibt getrennt.

**Keine automatische Ausführung:** Slices dienen der nächsten ausdrücklichen Implementierungsbeauftragung. Dieser Auditauftrag endet mit belegtem Ist-Zustand und diesem Plan.
