# Phase 182 — Alten Bildspeicher entfernen (F-01)

**Quelle:** `.planning/phases/174-.../174-FOLLOWUPS.md` Abschnitt F-01 (Schritte 1–3).
**Stand der Inventur:** 2026-10-14, Live-DB `team4s_v2` (Container `team4sv30-db`),
realer Code-Stand auf `main`.
**Stand der Entscheidungen:** 2026-10-14, Nutzerentscheidungen D-01 bis D-04 verbindlich
(siehe unten) — ersetzt die ursprünglichen vier offenen Fragen des ersten Entwurfs.

## Ziel

Die Legacy-Bildpfade rund um `anime.cover_image` entfallen: tote `hasV2AssetSchema`-
Abfrage und Legacy-Zweige in `anime_assets*.go` entfernen, alle Leser auf den
V2-Speicher (`anime_media` + `media_assets`, Medientyp `poster`) umstellen,
`syncLegacyAnimeCoverImageV2` überflüssig machen, Spalte per Migration entfernen,
API-Vertrag (`cover_image`) bereinigen — ohne sichtbare Änderung für Nutzer, außer dem
bewusst in Kauf genommenen Nebeneffekt aus D-01.

---

## Verbindliche Nutzerentscheidungen (2026-10-14)

- **D-01** — Die Cover-Lücke wird mitbehoben: **alle** Leser (Liste, Detail,
  Watchlist, Fansub-Profile, Admin-Beziehungs-Editor, Suche usw.) lesen das Cover nur
  noch aus dem V2-Speicher (gemeinsamer Join, z. B. `animeCoverImageSelectSQL`). Die 7
  heute an manchen Stellen fehlenden Cover (Jellyfin-Anime) erscheinen danach überall.
  Siehe „Jellyfin-Bildweg-Prüfung" unten für den nachgemessenen Befund: **das
  next/image-Allowlist-Risiko besteht nicht**, der bestehende Mechanismus trägt bereits
  heute dieselben URLs an genau den Stellen, die nach D-01 neu beliefert werden.
- **D-02** — API-Feld `cover_image` bleibt mit gleichem Namen, wird nur noch aus V2
  befüllt. Frontend wird nur dort angepasst, wo es nötig ist (Feldname und
  URL-Resolver bleiben unverändert — siehe Abschnitt „Jellyfin-Bildweg-Prüfung";
  betroffen ist nur die Backend-SQL-Quelle hinter demselben Feldnamen).
- **D-03** — Spalte `anime.cover_image` wird in dieser Phase per Migration entfernt;
  die Migration prüft vorher (per `DO`-Block/`RAISE EXCEPTION` oder äquivalent), dass
  kein Anime nur ein Legacy-Cover ohne V2-Poster-Gegenstück hat, und bricht sonst mit
  klarer Meldung ab, statt die Spalte zu droppen. Bilddateien auf der Platte werden
  **nicht** gelöscht. Legacy-Mechanik (`hasV2AssetSchema`, `syncLegacyAnimeCoverImageV2`,
  Legacy-Zweige in `anime_assets*.go`, `cmd/migrate-covers`, veraltete `scripts/*`) wird
  entfernt; Verträge in `shared/contracts/` werden bereinigt (Beispielwerte/Required-
  Flag anpassen, Feld selbst bleibt laut D-02).
- **D-04** — Ansonsten keine sichtbare Änderung. Vergleichs-URLs für die Live-UAT:
  `/anime`, `/anime/3`, `/anime/1`, `/fansubs`, `/me/watchlist`.

---

## Jellyfin-Bildweg-Prüfung (vor der Planung durchgeführt, Grundlage für D-01)

**Frage:** Wie zeigt die Anime-Detailseite heute erfolgreich Jellyfin-Cover an, und
nutzen Liste/Watchlist/Fansub-Profile/Admin-Beziehungen nach der Umstellung denselben
funktionierenden Weg — oder droht ein next/image-Allowlist-Crash (E426)?

**Befund — der Weg ist bereits heute global abgesichert, nicht Seiten-spezifisch:**

1. Die 7 Jellyfin-Anime haben in `media_assets.file_path` (Medientyp `poster`) eine
   **absolute URL** der Form `http://192.168.235.196:18092/api/v1/media/image?item_id=...
   &kind=primary&provider=jellyfin` — der Host entspricht exakt `NEXT_PUBLIC_API_URL`
   aus `.env`.
2. `frontend/next.config.mjs` registriert über
   `frontend/src/lib/images/publicImagePatterns.mjs::configuredApiMediaPatterns(NEXT_PUBLIC_API_URL)`
   ein **globales** `remotePatterns`-Eintrag für genau `{dieser Host}/api/v1/media/**`.
   Diese Konfiguration ist **nicht pro Route/Komponente**, sondern gilt für jede
   Verwendung von `next/image` im gesamten Frontend — unabhängig davon, welcher
   Backend-Endpunkt die URL geliefert hat.
3. Dasselbe `cover_image`-Feld mit derselben absoluten Jellyfin-URL fließt **heute
   schon** über `GET /api/v1/anime` und `GET /api/v1/anime/:id` (siehe Korrektur unten:
   beide sind V2-bewusst) zur Anime-Liste und -Detailseite und wird dort per
   `next/image` ohne Zwischenfall angezeigt — der Beweis, dass das Remote-Pattern
   live funktioniert, existiert also bereits im Betrieb.
4. Zusätzlich hat das Frontend **zwei weitere, unabhängige Sicherheitsnetze**, die
   über die reine next.config-Allowlist hinausgehen:
   - `frontend/src/lib/utils.ts::shouldUseUnoptimizedImage(url)` — gibt `true` zurück,
     sobald die URL `/api/v1/media/` enthält, und wird in
     `AnimeCard.tsx:37` (öffentliche Liste) und `WatchlistList.tsx:139` (**genau die
     Watchlist-Komponente, die durch D-01 neu mit Jellyfin-URLs beliefert wird**) als
     `unoptimized={shouldUseUnoptimizedImage(coverUrl)}` an `next/image` übergeben —
     das schaltet die Next.js-Bildoptimierung (und damit die Allowlist-Prüfung
     überhaupt) für genau diese URL-Form bewusst ab.
   - `frontend/src/components/ui/ResponsiveImage.tsx` — prüft denselben
     `publicImagePatterns`-Datensatz selbst **vor** dem Rendern und fällt bei
     Nicht-Treffer automatisch auf `unoptimized` zurück, statt die Seite abstürzen zu
     lassen (Kommentar im Modul: „one stale/unmigrated image URL must never take down
     an entire public route"). Genutzt von `ArtworkHero`
     (→ `ProjectMemberHero.tsx`, Fansub-Mitwirkenden-Profil) und
     `FansubProjectBannerCard.tsx` (öffentliche Fansub-Projektkarten) — **beide sind
     Konsumenten der beiden Backend-Stellen, die D-01 umstellt**
     (`fansub_project_resolver_repository.go`, `fansub_repository_public_profile.go`).

**Ergebnis:** Für alle vier von D-01 betroffenen, bisher roh lesenden Backend-Stellen
(siehe Tabelle 1b) gilt bereits eine der drei Schutzschichten beim jeweiligen
Frontend-Konsumenten:

| Backend-Stelle | Frontend-Konsument | Schutz bereits vorhanden? |
|---|---|---|
| `watchlist.go` | `WatchlistList.tsx` | ✅ `shouldUseUnoptimizedImage`-Guard **und** globales Remote-Pattern |
| `fansub_project_resolver_repository.go` | `ProjectMemberHero.tsx` → `ArtworkHero` | ✅ `ResponsiveImage`-Selbstprüfung mit Fallback |
| `fansub_repository_public_profile.go` | `FansubProjectBannerCard.tsx` | ✅ `ResponsiveImage`-Selbstprüfung mit Fallback |
| `anime_relations_admin.go` | **kein Bild-Rendering** — `AnimeRelationsSection.tsx`/`useAdminAnimeRelations.ts` zeigen `cover_image` nirgends als Bild an | ✅ kein Frontend-Risiko, da keine Bilddarstellung existiert |

**Schlussfolgerung für die Planung:** Kein next.config-Eingriff nötig, kein Risiko
eines E426-Absturzes. Die Pläne sollten trotzdem einen Live-Checkpoint (D-04) einbauen,
der genau diese vier Stellen nach der Umstellung visuell prüft — nicht weil ein
Crash-Risiko besteht, sondern um den beabsichtigten Nebeneffekt aus D-01 (neue, bisher
fehlende Cover erscheinen) sichtbar zu bestätigen.

---

## Korrektur gegenüber dem ersten Entwurf dieses Dokuments

Der erste Entwurf listete `backend/internal/repository/anime.go` (`List`/`GetByID`,
Backend für `GET /api/v1/anime` und `GET /api/v1/anime/:id`) fälschlich als „rohen
Leser ohne V2-Fallback". Tatsächlich prüft `List`/`GetByID` live per
`loadAnimeV2SchemaInfo` das Schema und **delegiert bei `schema.HasSlug == true`
(immer der Fall, da `anime.slug` existiert) vollständig an `listV2`/`getByIDV2`**
(`anime.go:40-48,101-107`) — die rohe SQL in `anime.go` ist toter Code, der nur beim
(live nie zutreffenden) Pre-V2-Schema greift. Diese beiden Hauptrouten sind also
**bereits heute V2-bewusst** und nicht Teil der in Tabelle 1b korrigierten Liste.

---

## Ist-Zustand

### 1a. Datenlage `anime.cover_image` (10 Anime gesamt in `team4s_v2`)

| id | Titel | `cover_image` | V2-Poster vorhanden? | Datei auf Platte? |
|---|---|---|---|---|
| 1 | Buddy Complex | *(leer)* | ja — Jellyfin-URL (`.../media/image?...provider=jellyfin`) | n/a (Remote-URL) |
| 2 | 11eyes | *(leer)* | ja — Jellyfin-URL | n/a |
| 3 | 11eyes: Pink Phantasmagoria | `/media/anime/3/cover/f20a224e-.../original.jpg` | ja — **identischer** lokaler Pfad | ✅ existiert |
| 4 | Naruto | *(leer)* | ja — Jellyfin-URL | n/a |
| 6 | .hack//G.U. Trilogy | `/media/anime/6/cover/f6399821-.../original.jpg` | ja — **identischer** lokaler Pfad | ✅ existiert |
| 7 | .hack//G.U. Returner | `/media/anime/7/cover/fa9e0251-.../original.jpg` | ja — **identischer** lokaler Pfad | ✅ existiert |
| 8 | 07-Ghost | *(leer)* | ja — Jellyfin-URL | n/a |
| 9 | Accel World: Infinite Burst | *(leer)* | ja — Jellyfin-URL | n/a |
| 10 | Ace of the Diamond: Staffel 2 | *(leer)* | ja — Jellyfin-URL | n/a |
| 11 | Accel World | *(leer)* | ja — Jellyfin-URL | n/a |

**Kernzahlen:**
- 3 von 10 Anime haben `cover_image` gesetzt — alle 3 haben eine exakt deckungsgleiche
  V2-Poster-Zeile in `anime_media`/`media_assets` (gleicher `file_path`, Status `ready`,
  Datei auf der Platte vorhanden, geprüft via `docker compose exec team4sv30-backend ls`).
- **0 Anime verlieren ein sichtbares Bild**, wenn die Spalte entfernt wird — die
  Migrations-Schutzabfrage aus D-03 bestätigt das zum Ausführungszeitpunkt verbindlich.
- 0 Anime nutzen die V2-Slot-Spalten `cover_asset_id`/`cover_resolved_url`/
  `cover_provider_key` (alle 10 NULL) — diese per Migration `0040` eingeführten
  Spalten sind in der Praxis komplett ungenutzt, obwohl der Schreib-Code sie befüllt
  (`anime_assets_cover.go`). **Das ist eine andere Baustelle als diese Phase** (die
  Phase zielt auf `anime_media`/`media_assets` als „den V2-Speicher", nicht auf die
  Slot-Spalten) — hier nur zur Einordnung vermerkt, keine Maßnahme in dieser Phase.
- Alle 10 Anime haben eine V2-Poster-Zeile (`media_types.name = 'poster'`) — 7 davon
  zeigen auf eine Jellyfin-Bild-URL, 3 auf einen lokalen `/media/...`-Pfad.

### 1b. Korrigierte Liste: rohe Leser ohne V2-Fallback (Ziel von D-01)

Es gibt in `backend/internal/repository/anime_v2.go:425` einen gemeinsamen SQL-Baustein
`animeCoverImageSelectSQL(animeAlias)`, der schon heute „V2-bewusst" liest:

```
COALESCE(cover_resolved_url, cover_image, poster.file_path, <Jellyfin-Fallback-URL>)
```

Bereits V2-bewusst (nutzen diesen Baustein oder delegieren dorthin): `anime.go`
(`List`/`GetByID`, siehe Korrektur oben), `anime_v2.go`, `search_anime.go`,
`anime_relations.go` (öffentliches Beziehungen-Widget), `admin_content_release_theme_assets.go`,
`member_profile_projects_repository.go`.

**Tatsächlich rohe Leser — exakt diese vier Stellen stellt D-01 um:**

| Datei:Zeile | Zweck | Route/Endpunkt | Frontend-Konsument |
|---|---|---|---|
| `backend/internal/repository/watchlist.go:41,62,147,159` (`ListByUser`, `GetByUserAndAnimeID`) | Merkliste | `GET /api/v1/me/watchlist` | `WatchlistList.tsx:129,139` |
| `backend/internal/repository/fansub_project_resolver_repository.go:68,84` | Fansub-Projekt-Auflösung | Fansub-Mitwirkenden-Profilseite | `ProjectMemberHero.tsx` → `ArtworkHero` |
| `backend/internal/repository/fansub_repository_public_profile.go:228,254` | Öffentliches Fansub-Profil | `/fansubs/[slug]` | `FansubProjectBannerCard.tsx` |
| `backend/internal/repository/anime_relations_admin.go:59,127` | Admin-Beziehungen-Editor (Liste + Typeahead-Suche) | `GET /api/v1/admin/anime/:id/relations`, `.../relation-targets` | keiner (Feld unbenutzt im Admin-UI) |

**Zusätzliche Inkonsistenz, die D-01 mitbehebt:** `anime_relations.go:52` (öffentliches
Beziehungen-Widget) nutzt den V2-Helfer bereits, die Admin-Variante
(`anime_relations_admin.go`) nicht — nach der Umstellung sind beide Pfade konsistent.

**Praktische Folge schon heute (vor dieser Phase):** Für die 7 Jellyfin-Anime ohne
`cover_image` liefern Watchlist und Fansub-Profile **kein Cover**, obwohl ein
V2-Poster existiert — das ist der vorbestehende Fehler, den D-01 bewusst mitbehebt.

### 2. Backend: Leser/Schreiber von `cover_image` und Legacy-Zweigen

**Lese-Helfer (V2-bewusst, Vorlage für die Umstellung):**
- `backend/internal/repository/anime_v2.go:425` `animeCoverImageSelectSQL` — gemeinsamer
  COALESCE-Baustein, Referenzimplementierung für die Umstellung der vier rohen Leser.
  Nach Spalten-Entfernung verkürzt sich dieser Baustein um das `cover_image`-Glied
  (`COALESCE(cover_resolved_url, poster.file_path, <Jellyfin-Fallback>)`).
- `backend/internal/repository/anime_v2.go:440` `animeCoverAvailableSQL` — Existenz-Check
  (`has_cover`-ähnliches Filterprädikat), gleiche COALESCE-Rangfolge, gleiche Kürzung nötig.

**Legacy-Mechanik (klein, risikoarm zu entfernen):**
- `backend/internal/repository/anime_assets.go:372` `hasV2AssetSchema` — prüft pro
  Bild-Operation per Zusatzabfrage, ob `anime_media` existiert; da `anime_media` live
  immer existiert, ist der `false`-Zweig in der Praxis tot.
- Aufrufer von `hasV2AssetSchema` (alle lösen bei `true` den V2-Zweig aus, der
  `false`-Zweig ist der zu entfernende Legacy-Pfad): `anime_assets_cover.go:15,71`,
  `anime_assets_background.go:15,101,127`, `anime_assets_background_video.go:21,38,49,66`,
  `anime_assets_banner_logo.go:15,51,79,96,113,178`.
- `backend/internal/repository/anime_assets_cover.go:274` `syncLegacyAnimeCoverImageV2`
  — schreibt bei jeder manuellen Cover-Zuweisung die Legacy-Spalte als Mirror mit;
  aufgerufen von `assignManualCoverV2` (Zeile 128).
- `backend/internal/repository/anime_assets_cover.go:224-232` — löscht beim Entfernen
  des Posters zusätzlich `cover_image` (Teil von `removeAnimePosterAssetsV2`).
- `backend/internal/repository/anime_assets_cover.go:319-377` `ApplyProviderCover` —
  **Achtung:** schreibt bei Provider-Covern (`cover_source = 'provider'`) eine externe
  URL direkt in `cover_image` (Zeile 365), nicht nur einen lokalen Pfad. Aktuell 0
  Anime mit `cover_source = 'provider'` live, aber der Code-Pfad existiert — beim
  Entfernen der Spalte muss diese Schreibstelle auf `cover_resolved_url` umgestellt
  werden (bereits vorhanden, aber aktuell ungenutzt), sonst geht die Provider-Cover-
  Funktion für zukünftige Anime kaputt, ohne dass die aktuelle Inventur (0 Live-Fälle)
  das zeigt.
- `backend/internal/repository/anime_schema.go:21,62-63` `HasCoverImage` — Laufzeit-
  Schemaerkennung per `information_schema`-Abfrage je Transaktion (Teil der breiteren
  `animeV2SchemaInfo`-Polymorphie, die auch `HasSlug`, `HasStatus` etc. prüft — nur das
  `HasCoverImage`-Flag und seine Verwendungsstellen betrifft diese Phase).

**Schreiber/Formular-Pfad (Admin anlegen/bearbeiten) — werden auf die V2-Slot-Spalten
bzw. den Poster-Join umgestellt:**
- `backend/internal/handlers/admin_content_anime_enrichment_edit.go:142`
- `backend/internal/handlers/admin_content_anime_validation.go:44,86,163,164,195`
- `backend/internal/handlers/admin_content_handler.go:30`
- `backend/internal/repository/admin_content_anime_create_v2.go:36,41,58,73,318`
  (Zeile 318: `attachUrlMediaAssetV2(..., input.CoverImage, "poster", ...)` — Create-Pfad
  spiegelt den Formularwert bereits aktiv in den V2-Poster-Slot)
- `backend/internal/repository/admin_content_anime_update_v2.go:106,111,418`
  (`applyAnimeCoverPatchV2`)
- `backend/internal/repository/admin_content_anime_metadata.go:382-384,398,415`
- `backend/internal/repository/admin_content_sync.go:27,43,138`
- `backend/internal/repository/admin_content_anisearch.go:147` (AniSearch-Import)
- `backend/internal/services/anime_create_enrichment.go:730` (`mergeString("cover_image", ...)`)
- `backend/internal/repository/admin_content_anime_delete.go:49,53,96,98,166,336,342,347,
  353,356,366` — beim Löschen: Prüfung, ob die lokale Cover-Datei noch anderweitig
  referenziert ist, bevor sie als „verwaist" zum Aufräumen markiert wird
  (`resolveOrphanedLocalCoverImage`/`...V2`).

**Modelle (reine Felddeklarationen, viele Fundstellen, kein eigener Aufwand):**
`backend/internal/models/{admin_content.go, anime.go, fansub.go, watchlist.go,
admin_release_theme_assets.go}`.

**Einmal-Migrationswerkzeug (historisch, nicht im Produktionspfad, wird entfernt — D-03):**
- `backend/cmd/migrate-covers/main.go` — Einmal-Tool, das `frontend/public/covers/`
  in die V2-Medienstruktur migrierte; liest `cover_image`, läuft nicht im Server-
  oder CI-Pfad. Einziges `backend/cmd/**`-Tool außer dem Server selbst, das die Spalte
  anfasst.

### 3. Frontend: Konsumenten des API-Felds `cover_image`

**Tatsächliche Bild-Darstellung (Render-Stellen), nach Seite/Bereich — Feldname bleibt
laut D-02, hier nur zur Vollständigkeit/für den Live-Checkpoint gelistet:**

| Bereich | Datei:Zeile | Hinweis |
|---|---|---|
| Öffentliche Anime-Listenseite (`/anime`) | `frontend/src/components/anime/AnimeCard.tsx:20` | `getCoverUrl(anime.cover_image)` je Karte |
| Öffentliche Anime-Detailseite (`/anime/[id]`) | `frontend/src/app/anime/[id]/page.tsx:113` | Poster/Cover-URL für die ganze Seite |
| Anime-Detail, Vor/Zurück-Navigation | `frontend/src/components/anime/AnimeEdgeNavigation.tsx:55` | Hover-Vorschau Nachbar-Anime |
| Anime-Detail, Beziehungen-Widget | `frontend/src/components/anime/AnimeRelations.tsx:14,158,160` | je verwandtem Anime |
| Anime-Detail, Fansub-Projekt-Unterseite | `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts:318` | Fallback-Herobild |
| Merkliste (`/me/watchlist`) | `frontend/src/components/watchlist/WatchlistList.tsx:129` | je Merklisten-Eintrag — **betroffen von D-01** |
| Fansub-Mitwirkenden-Profil | `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx:68` | Hero-Hintergrund — **betroffen von D-01** |
| Fansub-Projektkarten (öffentlich) | `frontend/src/components/fansubs/FansubProjectBannerCard.tsx:23,33` | Fallback, wenn `banner_url` fehlt — **betroffen von D-01** |
| Admin — Episoden-Verwaltung | `frontend/src/app/admin/episodes/page.tsx:403` | Anime-Auswahlliste |
| Admin — Anime-Übersicht | `frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx:216` | Grid-Thumbnail |
| Admin — Anime-Kontext-Karte | `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx:113,121` | Thumbnail + Debug-Text |
| Admin — Anime bearbeiten (Workspace) | `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx:759` | Vorschau mit Link zur Public-Seite |
| Admin — Anime bearbeiten (Kopf) | `frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx:109` | Header-Thumbnail |
| Admin — Fansub-Releases-Cockpit | `frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesCockpit.tsx:207` | Fallback-Visual |

**Formular-/Zustands-Logik ohne eigenes Bild-Rendering (Admin anlegen/bearbeiten,
unverändert laut D-02):**
`frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts`,
`.../hooks/internal/useAnimePatchImpl.ts`,
`.../hooks/internal/anime-patch/useAnimePatchMutations.ts`,
`.../create/aniSearchJellyfinPrecedence.ts`, `.../create/createPageHelpers.ts`,
`.../create/internal/useAdminAnimeCreateControllerImpl.ts`,
`.../create/internal/admin-anime-create/useCreateSubmitAction.ts`,
`frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditSharedSections.tsx:304`
(„Cover leeren"-Checkbox).

**Reine Typdeklarationen (Durchreiche, kein eigenes Verhalten, unverändert laut D-02):**
`frontend/src/types/{admin.ts, anime.ts, fansub.ts, watchlist.ts}`,
`frontend/src/app/admin/anime/types/admin-anime.ts`,
`frontend/src/lib/utils.ts` (`getCoverUrl` — gemeinsamer URL-Resolver, bleibt
unverändert, da Feldname und Wertformat gleich bleiben).

**Tests/Fixtures** (≈20 Dateien, u. a. `*.test.ts(x)`,
`frontend/scripts/fixtures/anime-detail-fixture-server.mjs`) — ziehen nur mit, soweit
sich das tatsächlich gelieferte Datenmuster für die vier D-01-Stellen ändert (bisher
leer → jetzt teils Jellyfin-URL); Feldname/Typ selbst bleibt laut D-02 gleich.

### 4. Weitere Konsumenten

**`shared/contracts/`** — `cover_image` als Schema-Property/Beispielwert in:
`openapi.yaml` (10 Stellen, u. a. Zeile 11521 als `required`-Feld in einem Schema),
`anime-list.yaml`, `anime-detail.yaml`, `watchlist.yaml`, `admin-content.yaml`. Laut
D-02/D-03 bleibt das Feld, nur die Dokumentation seiner Herkunft/Beispielwerte wird
bereinigt (nicht mehr "Dateiname/Legacy-Pfad", sondern V2-Poster-URL als Beispiel).

**Migrationen** — `database/migrations/0001_init_anime.up.sql:30` (Ursprung der
Spalte), `database/migrations/0040_add_anime_cover_asset_slots.up.sql:17-23` (einmaliger
Backfill von `cover_resolved_url` aus `cover_image` beim Einführen der V2-Slot-Spalten
— erklärt, warum `cover_resolved_url` konzeptionell existiert, aber live leer ist, weil
der Backfill nur rückwirkend lief und seither nichts mehr nachzieht).

**Import-/Betriebs-Skripte** — keine AniSearch- oder Jellyfin-Importskripte fassen die
Spalte direkt an (nur über die Backend-Handler/Repository-Schicht oben). Drei
PowerShell-Skripte unter `scripts/` sind direkt an die Spalte gekoppelt, wirken
historisch/veraltet (Standard-DB-Name `team4s`, nicht `team4s_v2`) und werden laut
D-03 entfernt:
- `scripts/report-cover-image-state.ps1` — Reporting (`SELECT ... cover_image ...`)
- `scripts/remediate-cover-image.ps1` — Ad-hoc-Bereinigung (`UPDATE anime SET cover_image = ...`)
- `scripts/smoke-admin-content.ps1:240-253` — Smoke-Test, prüft PATCH-Endpunkte für
  Cover setzen/leeren über das Feld `cover_image` — **bleibt**, da der Smoke-Test das
  API-Verhalten prüft, nicht die Spalte direkt; ggf. nur auf das neue Backend-Verhalten
  gegenprüfen.

**Einmal-Migrationswerkzeug** — `backend/cmd/migrate-covers/` (siehe Abschnitt 2),
wird laut D-03 entfernt.

---

## Zielbild und Schrittfolge (durch D-01..D-03 festgelegt)

1. **Schritt 1 (klein, risikoarm):** `hasV2AssetSchema` und die zugehörigen
   `false`-Zweige in `anime_assets*.go` entfernen (der Zweig ist live nie erreichbar,
   da `anime_media` immer existiert) — kein Verhaltensunterschied, nur eine
   Zusatzabfrage pro Bild-Operation weniger.
2. **Schritt 2 (mittel, Kern von D-01):** Die vier rohen Leser aus Tabelle 1b
   (`watchlist.go`, `fansub_project_resolver_repository.go`,
   `fansub_repository_public_profile.go`, `anime_relations_admin.go`) auf
   `animeCoverImageSelectSQL`/`animeCoverAvailableSQL` umstellen. Danach ist
   `syncLegacyAnimeCoverImageV2` überflüssig und wird entfernt; ebenso die
   Schreibzweige, die `cover_image` als Mirror pflegen (`anime_assets_cover.go`,
   inkl. Umstellung von `ApplyProviderCover` auf `cover_resolved_url`).
3. **Schritt 3 (Migration, D-03):** Migration mit vorgeschalteter Schutzabfrage
   (bricht ab, falls ein Anime nur `cover_image` ohne V2-Poster-Gegenstück hat),
   danach `DROP COLUMN anime.cover_image`. API-Vertrag (`shared/contracts/*.yaml`)
   bereinigen — Feld `cover_image` bleibt (D-02), nur Beschreibung/Beispielwerte
   anpassen. Bilddateien auf der Platte bleiben unangetastet (D-03).
4. Historische Skripte/Tools entfernen: `scripts/report-cover-image-state.ps1`,
   `scripts/remediate-cover-image.ps1`, `backend/cmd/migrate-covers/` (D-03).

---

## Risiken

- **Verschwindende Bilder:** Durch die Schutzabfrage in D-03 ausgeschlossen — die
  Migration bricht ab, statt eine Spalte mit noch benötigten Werten zu droppen.
- **Reihenfolge-Inversion bei V2-bewussten Lesern:** `animeCoverImageSelectSQL`
  bevorzugt heute `cover_image` vor dem V2-Poster-Join. Nach Entfernung der Spalte
  fällt diese Stelle automatisch auf den Poster-Join zurück — für die 3 betroffenen
  Anime identisch, für alle anderen (bereits nur Poster) keine Änderung. Der
  COALESCE-Baustein muss beim Umbau syntaktisch korrekt um das `cover_image`-Glied
  verkürzt werden.
- **Provider-Cover-URL-Pfad:** `ApplyProviderCover` schreibt externe URLs in
  `cover_image` (aktuell 0 Datensätze betroffen). Muss in Schritt 2 auf
  `cover_resolved_url` umgestellt werden, sonst geht die Provider-Cover-Funktion für
  zukünftige Anime kaputt, ohne dass die aktuelle Inventur (0 Live-Fälle) das zeigt.
- **next/image-Allowlist-Risiko (D-01):** Geprüft und ausgeschlossen — siehe Abschnitt
  „Jellyfin-Bildweg-Prüfung" oben. Alle vier betroffenen Frontend-Konsumenten haben
  bereits eine von drei unabhängigen Schutzschichten (globales Remote-Pattern,
  `shouldUseUnoptimizedImage`-Guard, `ResponsiveImage`-Selbstprüfung) oder rendern das
  Feld gar nicht als Bild.
- **Gecachte Bild-URLs/externe Verweise:** Die 3 betroffenen lokalen Pfade bleiben
  unverändert (`/media/anime/<id>/cover/<uuid>/original.jpg` existiert unabhängig von
  der DB-Spalte weiter, Dateien werden laut D-03 nicht gelöscht) — Browser-Caches und
  `next/image`-`localPatterns` sind nicht betroffen, die URL-Form ändert sich nicht.
- **Test-Fixture-Drift:** Mehrere Testdateien (siehe Abschnitt 3) bilden `cover_image`
  nach — nach Code-Umstellung müssen diese Fixtures gegen das echte Schema (`psql \d`)
  und echte Responses geprüft werden, nicht nur kopiert (Lehre aus vorherigen Phasen).
- **Sichtbarer Nebeneffekt (bewusst, D-01/D-04):** Nach Schritt 2 zeigen
  Watchlist/Fansub-Profile erstmals Cover für 7 bisher coverlose Jellyfin-Anime — das
  ist beabsichtigt (D-01), sollte aber im UAT explizit als Nebeneffekt benannt werden,
  damit es nicht als unerwartete Abweichung von „keine sichtbare Änderung" (D-04)
  missverstanden wird.

---

## Abgrenzung

- Keine Änderung an den V2-Slot-Spalten `cover_asset_id`/`cover_source`/
  `cover_resolved_url`/`cover_provider_key` selbst (die bleiben, auch wenn aktuell
  ungenutzt) — nur ihre Interaktion mit `cover_image` in den betroffenen Schreibpfaden
  (insbesondere `ApplyProviderCover`, siehe Risiken).
- Keine Änderung an `banner_asset_id`/Banner-Logik — strukturell ähnlich, aber nicht
  Teil von F-01 (kein Legacy-`banner_image`-Textfeld existiert).
- `backend/cmd/migrate-covers/` wird nicht ausgeführt, nur entfernt (D-03) — kein
  erneuter Migrationslauf nötig, da die Produktionsdaten laut Inventur schon
  vollständig im V2-Speicher liegen.
- F-17 (Inventur „Doppelungen nach Fachaufgaben") ist eine separate Folgephase und wird
  hier nicht mitbearbeitet, auch wenn der Befund aus Abschnitt 1b (Public- vs.
  Admin-Beziehungen-Pfad) thematisch verwandt ist.
- Kein Umbenennen des API-Felds `cover_image` (D-02) — eine Umbenennung wäre reine
  Code-Hygiene ohne fachlichen Gewinn und würde den Diff ohne Not vergrößern.

---

## Vergleichs-URLs (vorher/nachher, über `http://127.0.0.1:3300`) — D-04

1. `http://127.0.0.1:3300/anime` — öffentliche Anime-Liste, Letter-Filter leer
   (zeigt alle 10; bereits heute mit allen Covern, da `anime.go` V2-bewusst ist —
   dient als Referenz, dass sich hier nichts ändert).
2. `http://127.0.0.1:3300/anime/3` — Detailseite „11eyes: Pink Phantasmagoria"
   (eines der 3 Anime mit Legacy-Cover — muss vorher/nachher identisch aussehen).
3. `http://127.0.0.1:3300/anime/1` — Detailseite „Buddy Complex" (Jellyfin-Anime
   ohne Legacy-Cover, bereits heute mit Cover über den V2-bewussten Detailpfad —
   Referenz, kein Unterschied erwartet).
4. `http://127.0.0.1:3300/fansubs` → ein Fansub-Profil mit Projekt-Übersicht —
   **hier wird der D-01-Nebeneffekt sichtbar:** Projektkarten für Jellyfin-Anime
   zeigen nach Schritt 2 erstmals ein Cover (`FansubProjectBannerCard`-Fallback).
5. `http://127.0.0.1:3300/me/watchlist` (eingeloggt, mit mind. einem Jellyfin-Anime
   auf der Merkliste) — **hier wird der D-01-Nebeneffekt am deutlichsten sichtbar:**
   bisher fehlendes Cover erscheint nach Schritt 2.

---

## Referenzen

- `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-FOLLOWUPS.md`
  Abschnitt F-01 — ursprünglicher Auftrag und Schrittfolge-Vorschlag (Stand 2026-10-05,
  29 Backend-/55 Frontend-Stellen geschätzt; diese Inventur hat die reale, inzwischen
  gewachsene und nach Korrektur präzisierte Zahl ermittelt).
- Memory-Lehren (diese Session): Bilder unter `/media` und `/covers` laufen über
  `next/image` mit strikter `localPatterns`/`remotePatterns`-Allowlist — hier geprüft
  und für D-01 als unkritisch bestätigt (siehe „Jellyfin-Bildweg-Prüfung"). Test-
  Fixtures driften gern vom echten Schema — Änderungen in Schritt 2/3 per `psql \d`
  und echtem Request gegenprüfen, nicht nur Fixtures kopieren.
