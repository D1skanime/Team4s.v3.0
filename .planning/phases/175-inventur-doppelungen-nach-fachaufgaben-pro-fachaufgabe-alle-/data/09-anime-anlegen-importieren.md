# Fachaufgabe 9: Anime anlegen / importieren — manuell, Jellyfin, AniSearch, Episoden-Import

**Quelle:** 175-CONTEXT.md D-02 #9, aufbauend auf 174-REPORT.md (Abschnitt zu `useAdminAnimeCreateControllerImpl.ts`, Welle 3, D-24-Exception-Eintrag). Keine fertige F-Nummer — eigenständige Recherche über die drei Anlege-Wege plus den separaten Episoden-Import.
**Methode:** `frontend/src/app/admin/anime/create/page.tsx` und die vier Sub-Hooks (`useJellyfinIntakeActions`, `useAniSearchIntakeActions`, `useAssetStagingActions`, `useCreateSubmitAction`) wurden gelesen, jede Frontend-API-Funktion bis zum Backend-Endpunkt/Handler nachverfolgt, die Routen-Tabelle (`admin_routes.go`) auf gemeinsame vs. eigenständige Endpunkte geprüft, und der separate Episoden-Import (`admin_episode_import.go` + `EpisodeImportRepository`) auf geteilte vs. eigenständige Infrastruktur untersucht.

Spalten gemäß D-03: (a) UI-Flächen, (b)/(c) Frontend-API/Backend-Endpunkte, (d) Rechte Anzeige vs. Durchsetzung, (e) Datenhaltung, (f) beobachtbares Verhalten je Weg.

---

## Übersicht: EIN Controller, EIN Speicher-Endpunkt, vier Lade-/Vorbereitungswege

| Weg | UI-Fläche (Datei:Zeile) | Lade-/Vorbereitungs-Endpunkt | Speicher-Endpunkt | Tabellen (Hauptschreibpfad) |
|---|---|---|---|---|
| Manuell | `page.tsx:234-376` (Basisdaten/Metadaten-Sektionen) | — (keine externe Quelle, Formularfelder direkt) | `POST /admin/anime` (`createAdminAnime`) | `anime` |
| Jellyfin-Import | `CreateJellyfinCard` in `page.tsx:140-161` | `POST /admin/jellyfin/intake/preview` (Vorschau, keine Persistenz) | **derselbe** `POST /admin/anime` (`createAdminAnimeFromJellyfinDraft`) | `anime` (Draft wird vor dem Speichern in die Formularfelder übernommen) |
| AniSearch-Import | `CreateAniSearchIntakeCard` in `page.tsx:116-138` | `POST /admin/anime/enrichment/anisearch` (Draft-Laden, keine Persistenz) | **derselbe** `POST /admin/anime` (über den manuellen oder Jellyfin-Zweig, je nachdem was zusätzlich adoptiert wurde) | `anime` |
| Episoden-Import | eigene Unterseite/eigener Flow, **nicht** auf `create/page.tsx` | `GET .../episode-import/context`, `POST .../episode-import/preview` | `POST /admin/anime/:id/episode-import/apply` (**eigenständiger Endpunkt**) | `episodes`/`release_variants`/`release_streams`/`stream_sources` (release-natives Schema, **nicht** `anime`) |

**Zentraler Befund (bestätigt 174-REPORT.md):** Manuelles Anlegen, Jellyfin-Import und AniSearch-Import sind **kein Nebeneinander getrennter Implementierungen**, sondern EIN Formular (`page.tsx`) mit EINEM Submit-Pfad (`useCreateSubmitAction.submitCreate`), der je nach vorher adoptiertem Draft entscheidet, welche der zwei strukturell identischen Create-Request-Funktionen er aufruft — beide senden an **denselben Backend-Endpunkt** `POST /admin/anime` (`backend/cmd/server/admin_routes.go:58`, einziger Handler `AdminContentHandler.CreateAnime`). Der Episoden-Import ist dagegen eine **eigenständige Fachaufgabe mit eigener Infrastruktur**, die lediglich denselben `AdminContentHandler`/dieselbe Jellyfin-Service-Schicht als Werkzeugkasten mitbenutzt.

---

## (a)-(c) je Weg

### Manuell

- **(a):** Formularfelder in `page.tsx` — Basisdaten (Zeile 234-313: Titel, Typ, Inhaltstyp, Status, Jahr, max. Episoden, Titel DE/EN, Ordnerpfad read-only), Metadaten (Zeile 315-376: Genre/Tag-Felder, Beschreibung), Assets-Sektion (Zeile 166-232: Cover/Banner/Logo/Backgrounds-Upload über `<input type="file">`). `CreatePageStepper.tsx:5-10` zeigt die vier Schritte „Anime finden" (AniSearch & Jellyfin), „Assets", „Details", „Prüfen & Anlegen" — Jellyfin/AniSearch sind nur EIN Schritt von vier, keine eigene Seite.
- **(b):** `createAdminAnime` — `frontend/src/lib/api/admin/anime-core.ts:123-142`.
- **(c):** `POST /admin/anime` → `AdminContentHandler.CreateAnime` — `backend/internal/handlers/admin_content_anime.go:21-...`, `requireAdmin` an Zeile 22. Validierung über `validateAdminAnimeCreateRequest` (Zeile 34).

### Jellyfin-Import

- **(a):** `CreateJellyfinCard` (`page.tsx:140-161`) — Suchfeld, Kandidatenliste, „Übernehmen"-Aktion. Kein eigener Routenwechsel: dieselbe `create/page.tsx`-Seite, derselbe DOM-Baum wie der manuelle Weg.
- **(b):** Suche: `searchAdminJellyfinIntakeCandidates` (`admin-anime-intake.ts:33-56`). Vorschau: `previewAdminAnimeFromJellyfinIntake` (`admin-anime-intake.ts:58-78`), aufgerufen über `jellyfinIntake.loadPreview` in `useJellyfinIntakeActions.ts:91,137`. Speichern: `createAdminAnimeFromJellyfinDraft` (`admin-anime-intake.ts:80-107`).
- **(c):** `GET /admin/jellyfin/series` (Suche), `POST /admin/jellyfin/intake/preview` (Vorschau, reine Lesevorschau — **keine** Persistenz, `backend/cmd/server/admin_routes.go:90,95`), danach **derselbe** `POST /admin/anime`-Endpunkt wie beim manuellen Weg (`createAdminAnimeFromJellyfinDraft` postet an `/api/v1/admin/anime`, `admin-anime-intake.ts:86`). Die Wahl zwischen `createAdminAnime`/`createAdminAnimeFromJellyfinDraft` entscheidet `useCreateSubmitAction.ts:211-216` rein anhand `jellyfinPreview ? ... : ...` — **beide Funktionen senden an dieselbe URL**, der Unterschied ist nur eine abweichende 409-Konflikt-Kommentarzeile (`admin-anime-intake.ts:94-104`), keine fachliche Verzweigung.

### AniSearch-Import

- **(a):** `CreateAniSearchIntakeCard` (`page.tsx:116-138`) — AniSearch-ID-Eingabe ODER Titel-Suche mit Kandidatenliste, beides in derselben Karte.
- **(b):** Laden per ID/Kandidat: `loadAdminAnimeCreateAniSearchDraft` (`admin-anime-intake.ts:109-133`), aufgerufen über `loadAniSearchDraftByID` in `useAniSearchIntakeActions.ts:142`. Kandidatensuche: `searchAdminAnimeCreateAniSearchCandidates` (`admin-anime-intake.ts:135-159`).
- **(c):** `POST /admin/anime/enrichment/anisearch` (Draft-Laden) und `GET /admin/anime/enrichment/anisearch/search` (Kandidatensuche) — `backend/cmd/server/admin_routes.go:78-79`, Handler `LoadAnimeCreateAniSearchEnrichment`/`SearchAnimeCreateAniSearchCandidates`. **AniSearch legt selbst NIE einen Anime an** — es befüllt nur den manuellen Draft-Formularzustand (`applyManualDraftValues`, `useAniSearchIntakeActions.ts:163`); das eigentliche Speichern läuft über denselben Submit-Pfad wie oben (manuell oder Jellyfin-verknüpft, je nachdem was zusätzlich adoptiert wurde — ein AniSearch-Treffer kann zusätzlich zu einem Jellyfin-Ordner gewählt werden, dann läuft der Save über `createAdminAnimeFromJellyfinDraft`, sonst über `createAdminAnime`).

### Episoden-Import — eigenständige Fachaufgabe, eigene Infrastruktur

- **(a):** Kein eigener UI-Abschnitt auf `create/page.tsx` — Episoden-Import setzt einen BEREITS angelegten Anime voraus (Route-Parameter `:id`) und läuft über eine eigene Episoden-Verwaltungsseite (`GetEpisodeImportContext`/`PreviewEpisodeImport`/`ApplyEpisodeImport` arbeiten alle mit `c.Param("id")` eines existierenden Anime).
- **(b)/(c):** Drei eigene Endpunkte, alle unter `/admin/anime/:id/episode-import/*` (`backend/cmd/server/admin_routes.go:87-89`): `GetEpisodeImportContext` (liest vorhandene Jellyfin-/AniSearch-Quellenverknüpfung des Anime), `PreviewEpisodeImport` (lädt AniSearch-Episodenkatalog UND Jellyfin-Mediendateien parallel, bildet Dateiname→Episodennummer-Zuordnungsvorschläge), `ApplyEpisodeImport` (schreibt die bestätigten Zuordnungen) — `backend/internal/handlers/admin_episode_import.go:24,42,120`. Zusätzlich existiert ein völlig getrennter vierter Endpunkt `POST /admin/episodes` (`CreateEpisode`, `admin_routes.go:99`) für das manuelle Anlegen EINER einzelnen Episodennummer ohne Jellyfin-Datei-Zuordnung — ein **vierter, noch feinerer Anlege-Weg** innerhalb derselben Fachaufgabe „Episoden", der nicht Teil des Import-Flows ist.
- **(e):** `EpisodeImportRepository.Apply` schreibt in `backend/internal/repository/episode_import_repository.go` letztlich in die **release-native Tabellenkette** `episodes`/`release_variants`/`release_variant_episodes`/`release_streams`/`stream_sources` (siehe `PreviewExistingCoverage`-Query, Zeile 73-87: JOIN über `release_variants`→`release_versions`→`fansub_releases`→`release_variant_episodes`→`episodes`, LEFT JOIN `release_streams`/`stream_sources`) — **komplett andere Tabellen** als die Anime-Anlege-Wege oben (die nur `anime`/`anime_titles`/`anime_genres`/`anime_tags`/`anime_media` schreiben). `CreateEpisode` (der vierte, einfache Weg) schreibt nur eine `episodes`-Zeile ohne Jellyfin-Quellenbindung.

---

## (d) Rechte: Anzeige vs. Durchsetzung

- **Anzeige (gesamte Seite):** `AdminAnimeCreatePage` ist komplett in `<PlatformAdminGate>` gewrappt (`page.tsx:470-476`), die ihrerseits `currentUser?.is_platform_admin` aus `getCurrentUser()` prüft (`frontend/src/components/auth/PlatformAdminGate.tsx:76`). Es gibt keine weitere Differenzierung zwischen den drei Anlege-Wegen innerhalb der Seite — wer die Seite sehen darf, sieht alle drei Wege gleichzeitig.
- **Durchsetzung:** Jeder der oben genannten Endpunkte (`CreateAnime`, `PreviewAnimeIntakeFromJellyfin`, `LoadAnimeCreateAniSearchEnrichment`, `SearchJellyfinSeries`, alle drei Episode-Import-Endpunkte, `CreateEpisode`) ruft `h.requireAdmin(c)` auf, was zu `requirePlatformAdminIdentity` führt (`backend/internal/handlers/platform_admin_authz.go:15-45`) und serverseitig `AppUserHasGlobalRole(ctx, identity.AppUserID, models.AppGlobalRolePlatformAdmin)` prüft (Zeile 35). **Konsistent über alle Lese- und Schreib-Endpunkte dieser Fachaufgabe:** Anzeige-Flag (`is_platform_admin`) und Durchsetzungs-Rolle (`AppGlobalRolePlatformAdmin`) sind dieselbe zugrunde liegende Eigenschaft — keine Abweichung gefunden, anders als bei den in Phase 174 behobenen Review-Flächen (BUG-174-02).

---

## (e)/(f) Datenhaltung und beobachtbares Verhalten je Weg

| Aspekt | Manuell | Jellyfin | AniSearch | Episoden-Import |
|---|---|---|---|---|
| Pflichtfelder beim Speichern | Titel + Cover (`manualDraftCanSubmit`, `useCreateSubmitAction.ts:146-149`) | gleich (derselbe Submit-Pfad) | gleich | — (Episoden-Import erfordert vorher bereits existierenden Anime) |
| Vorbefüllung | keine | `hydrateManualDraftFromJellyfinPreview` befüllt Titel/Typ/Assets aus Jellyfin-Metadaten, Asset-Slots advisory (`useJellyfinIntakeActions.ts:150-157`) | füllt Draft-Felder aus AniSearch-Metadaten (`applyManualDraftValues`, `resolveCreateAniSearchDraftMergeInputs`) — kann VOR ODER NACH einem Jellyfin-Adopt laufen und beide Quellen kombinieren | AniSearch liefert kanonische Episodenliste (Episodennummer/Titel/Filler-Flags), Jellyfin liefert physische Mediendateien — Import kombiniert beide |
| Fehlerbehandlung bei Nichterreichbarkeit der externen Quelle | n/a (keine externe Quelle) | `formatCreatePageError` zeigt generische Fehlermeldung (`handleJellyfinSearch`/`handleJellyfinCandidateAdopt` catch-Blöcke, `useJellyfinIntakeActions.ts:76-80,163-167`) — kein Absturz des übrigen Formulars, Jellyfin-Abschnitt bleibt isoliert fehlerhaft | analog, eigener `aniSearchErrorMessage`-State statt globaler `errorMessage` — AniSearch-Fehler blockieren NICHT das übrige Formular (bewusst getrennte Fehlerzustände, `useAniSearchIntakeActions.ts` Parameter `setAniSearchErrorMessage` vs. globales `setErrorMessage`) | `PreviewEpisodeImport` liefert bei AniSearch-Fehler `502 Bad Gateway` („anisearch episoden konnten nicht geladen werden", `admin_episode_import.go:67-70`), bei Jellyfin-Fehler ebenfalls `502` („jellyfin episoden konnten nicht geladen werden", Zeile 82-86) — **beide Ausfälle führen zum selben generischen Serverfehler-Status**, nicht fachlich differenziert zwischen den zwei Quellen; hängt an der in CLAUDE.md genannten Infrastruktur-Abhängigkeit „Jellyfin-Zugriff hängt von `.env`-Konfiguration ab" |
| Save-time-Duplikat-Schutz | greift nur, wenn eine AniSearch-Quelle im Payload steckt (`extractAniSearchCreateGuardSource`, `admin_content_anime.go:47-61`) — rein manuelle Anlagen ohne AniSearch-Verknüpfung haben keinen äquivalenten Duplikat-Schutz | gleich (gemeinsamer Handler) | gleich | n/a |

**D-04-Einordnung (bestätigt 174-REPORT.md-Verdikt, aus Fachaufgaben-Sicht erneut geprüft):** Die drei Anlege-Wege sind **legitim als EIN Controller mit komponierten Sub-Hooks gebaut** — kein Duplikat, weil es nur EINEN Speicherpfad (`POST /admin/anime`) und EINEN gemeinsamen Formularzustand gibt; die vier Sub-Hooks unterscheiden sich nur in der Quelle der Vorbefüllung, nicht in der Persistenzlogik. Der **Episoden-Import ist dagegen eine fachlich eigenständige Aufgabe** mit eigener Tabellenkette (release-nativ statt `anime`-Katalog) und eigenen Endpunkten — **legitim getrennt**, keine Zusammenführung mit dem Anime-Anlegen-Flow sinnvoll, da unterschiedliche Lebenszyklen (ein Anime existiert einmal, Episoden-Importe laufen wiederholt pro Release-Version). Der vierte, einfache `CreateEpisode`-Weg (einzelne Episodennummer ohne Jellyfin-Bindung) ist eine **zusätzliche, bisher in 174-FOLLOWUPS.md nicht erfasste Variante** derselben Episoden-Fachaufgabe — dokumentiert hier erstmals, kein Duplikat (deckt den Fall ab, dass eine Episode ohne verfügbare Jellyfin-Datei bekannt ist), aber ein Beleg dafür, dass „Episoden anlegen" selbst schon zwei unterschiedlich mächtige Wege hat.

---

## Zusammenfassung (reproduzierbar per `scripts/count-09-anime-anlegen-importieren.sh`)

- **Anlege-Wege für Anime (teilen sich EINEN Speicher-Endpunkt): 3** (manuell, Jellyfin, AniSearch)
- **Gemeinsamer Speicher-Endpunkt: 1** (`POST /admin/anime`, aufgerufen über 2 strukturell identische Frontend-Funktionen `createAdminAnime`/`createAdminAnimeFromJellyfinDraft`)
- **Sub-Hooks im Create-Controller: 4** (`useJellyfinIntakeActions`, `useAniSearchIntakeActions`, `useAssetStagingActions`, `useCreateSubmitAction`)
- **Eigenständige Episoden-Import-Endpunkte: 3** (`episode-import/context`, `/preview`, `/apply`) **+ 1 zusätzlicher einfacher Episoden-Anlege-Endpunkt** (`POST /admin/episodes`, ohne Jellyfin-Bindung) = 4 Episoden-bezogene Endpunkte insgesamt
- **Rechte-Vergleichspunkte (Anzeige vs. Durchsetzung) geprüft: 2** (Seiten-Gate `is_platform_admin` vs. Handler-Durchsetzung `AppGlobalRolePlatformAdmin`) — **0 Abweichungen**
