# Phase 182 — Alten Bildspeicher entfernen (F-01)

**Quelle:** `.planning/phases/174-.../174-FOLLOWUPS.md` Abschnitt F-01 (Schritte 1–3).
**Stand der Inventur:** 2026-10-14, Live-DB `team4s_v2` (Container `team4sv30-db`),
realer Code-Stand auf `main`.

## Ziel

Die Legacy-Bildpfade rund um `anime.cover_image` entfallen: tote `hasV2AssetSchema`-
Abfrage und Legacy-Zweige in `anime_assets*.go` entfernen, alle Leser auf den
V2-Speicher (`anime_media` + `media_assets`, Medientyp `poster`) umstellen,
`syncLegacyAnimeCoverImageV2` überflüssig machen, Spalte per Migration entfernen,
API-Vertrag (`cover_image`) bereinigen — ohne sichtbare Änderung für Nutzer.

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
- **0 Anime verlieren ein sichtbares Bild**, wenn die Spalte ersatzlos entfernt wird —
  vorausgesetzt, alle Leser werden vorher auf den V2-Poster-Join umgestellt (siehe 1b).
- 0 Anime nutzen die V2-Slot-Spalten `cover_asset_id`/`cover_resolved_url`/
  `cover_provider_key` (alle 10 NULL) — diese 2026 per Migration `0040` eingeführten
  Spalten sind in der Praxis komplett ungenutzt, obwohl der Schreib-Code sie befüllt
  (`anime_assets_cover.go`). **Das ist eine andere Baustelle als diese Phase** (die
  Phase zielt auf `anime_media`/`media_assets` als „den V2-Speicher“, nicht auf die
  Slot-Spalten) — hier nur zur Einordnung vermerkt, keine Maßnahme in dieser Phase.
- Alle 10 Anime haben eine V2-Poster-Zeile (`media_types.name = 'poster'`) — 7 davon
  zeigen auf eine Jellyfin-Bild-URL, 3 auf einen lokalen `/media/...`-Pfad.

### 1b. Wichtiger Befund: nicht alle Leser sind V2-fähig — ungleicher Ist-Zustand

Es gibt in `backend/internal/repository/anime_v2.go:425` einen gemeinsamen SQL-Baustein
`animeCoverImageSelectSQL(animeAlias)`, der schon heute „V2-bewusst" liest:

```
COALESCE(cover_resolved_url, cover_image, poster.file_path, <Jellyfin-Fallback-URL>)
```

Das heißt: **wo dieser Baustein verwendet wird**, gewinnt die Legacy-Spalte `cover_image`
sogar heute schon Vorrang vor dem V2-Poster-Join, falls beide gesetzt sind (bei den 3
betroffenen Anime macht das keinen Unterschied, weil beide Werte identisch sind — aber
die Rangfolge selbst ist bereits „verkehrt" für ein Zielbild, in dem V2 die Wahrheit ist).

Verwendet wird dieser Baustein in: `anime_v2.go` (Liste/Detail V2), `search_anime.go`
(Suche), `anime_relations.go` (Beziehungen V2-Pfad), `admin_content_release_theme_assets.go`,
`member_profile_projects_repository.go`.

**Andere Leser lesen `cover_image` dagegen roh, OHNE jeden Fallback auf den V2-Poster-
Join:**

| Datei:Zeile | Zweck | Route/Endpunkt |
|---|---|---|
| `backend/internal/repository/anime.go:62,85` (`List`) | Haupt-Anime-Liste | `GET /api/v1/anime` → öffentliche Anime-Listenseite `/anime` (`frontend/src/app/anime/page.tsx` → `getAnimeList`) |
| `backend/internal/repository/anime.go:112,153` (`GetByID`) | Anime-Detail | `GET /api/v1/anime/:id` |
| `backend/internal/repository/watchlist.go:41,62,147,159` | Merkliste | `GET /api/v1/me/watchlist` (Watchlist-Seite, `WatchlistList.tsx`) |
| `backend/internal/repository/fansub_project_resolver_repository.go:68,84` | Fansub-Projekt-Auflösung | Fansub-Mitwirkenden-Profilseite |
| `backend/internal/repository/fansub_repository_public_profile.go:228,254` | Öffentliches Fansub-Profil | `/fansubs/[slug]` |
| `backend/internal/repository/anime_relations_admin.go:59,127` | Admin-Beziehungen-Editor | Admin-Anime-Beziehungen-Tab |

**Praktische Folge schon heute (unabhängig von dieser Phase):** Für die 7 Jellyfin-
Anime ohne `cover_image` liefern diese sechs Stellen **kein Cover**, obwohl ein
V2-Poster existiert. Das ist vermutlich der eigentliche Grund, warum manche Seiten
(Hauptliste, Watchlist, Fansub-Profile) bei Jellyfin-importierten Anime kein Bild
zeigen, während die V2-bewussten Seiten (Suche, Anime-Beziehungen-Widget) es tun. Das
ist ein **vorbestehender Fehler**, den diese Phase beim Umstellen aller Leser auf den
V2-Join gleich mitbehebt (nicht Scope-Erweiterung, sondern unvermeidliche Nebenwirkung
des „alle Leser auf V2 umstellen"-Auftrags).

### 2. Backend: Leser/Schreiber von `cover_image` und Legacy-Zweigen

**Lese-Helfer (V2-bewusst, Vorlage für Schritt 2):**
- `backend/internal/repository/anime_v2.go:425` `animeCoverImageSelectSQL` — gemeinsamer
  COALESCE-Baustein, Referenzimplementierung für die Umstellung der rohen Leser oben.
- `backend/internal/repository/anime_v2.go:440` `animeCoverAvailableSQL` — Existenz-Check
  (`has_cover`-ähnliches Filterprädikat), gleiche COALESCE-Rangfolge.

**Rohe Leser ohne V2-Fallback (müssen auf den Helfer umgestellt werden):**
siehe Tabelle 1b oben, zusätzlich:
- `backend/internal/repository/anime_relations.go:52` nutzt den Helfer bereits
  (`animeCoverImageSelectSQL("a")`), **aber** `anime_relations_admin.go:59,127` (Admin-
  Variante derselben Beziehungen) liest roh — Inkonsistenz zwischen Public- und
  Admin-Pfad für dieselbe Fachaufgabe.

**Legacy-Mechanik (Schritt 1, "klein"):**
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
  Anime mit `cover_source = 'provider'` live, aber der Code-Pfad existiert — bei
  Spalten-Entfernung muss geprüft werden, ob `cover_resolved_url` (bereits vorhanden,
  aber aktuell ungenutzt) diese Rolle für Provider-URLs vollständig übernimmt.
- `backend/internal/repository/anime_schema.go:21,62-63` `HasCoverImage` — Laufzeit-
  Schemaerkennung per `information_schema`-Abfrage je Transaktion (Teil der breiteren
  `animeV2SchemaInfo`-Polymorphie, die auch `HasSlug`, `HasStatus` etc. prüft — nur das
  `HasCoverImage`-Flag und seine 3 Verwendungsstellen betrifft diese Phase).

**Schreiber/Formular-Pfad (Admin anlegen/bearbeiten):**
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

**Einmal-Migrationswerkzeug (historisch, nicht im Produktionspfad):**
- `backend/cmd/migrate-covers/main.go` — Einmal-Tool, das `frontend/public/covers/`
  in die V2-Medienstruktur migrierte; liest `cover_image`, läuft nicht im Server-
  oder CI-Pfad. Einziges `backend/cmd/**`-Tool außer dem Server selbst, das die Spalte
  anfasst.

### 3. Frontend: Konsumenten des API-Felds `cover_image`

**Tatsächliche Bild-Darstellung (Render-Stellen), nach Seite/Bereich:**

| Bereich | Datei:Zeile | Hinweis |
|---|---|---|
| Öffentliche Anime-Listenseite (`/anime`) | `frontend/src/components/anime/AnimeCard.tsx:20` | `getCoverUrl(anime.cover_image)` je Karte |
| Öffentliche Anime-Detailseite (`/anime/[id]`) | `frontend/src/app/anime/[id]/page.tsx:113` | Poster/Cover-URL für die ganze Seite |
| Anime-Detail, Vor/Zurück-Navigation | `frontend/src/components/anime/AnimeEdgeNavigation.tsx:55` | Hover-Vorschau Nachbar-Anime |
| Anime-Detail, Beziehungen-Widget | `frontend/src/components/anime/AnimeRelations.tsx:14,158,160` | je verwandtem Anime |
| Anime-Detail, Fansub-Projekt-Unterseite | `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts:318` | Fallback-Herobild |
| Merkliste (`/me/watchlist` o. ä.) | `frontend/src/components/watchlist/WatchlistList.tsx:129` | je Merklisten-Eintrag |
| Fansub-Mitwirkenden-Profil | `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx:68` | Hero-Hintergrund |
| Fansub-Projektkarten (öffentlich) | `frontend/src/components/fansubs/FansubProjectBannerCard.tsx:23,33` | Fallback, wenn `banner_url` fehlt |
| Admin — Episoden-Verwaltung | `frontend/src/app/admin/episodes/page.tsx:403` | Anime-Auswahlliste |
| Admin — Anime-Übersicht | `frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx:216` | Grid-Thumbnail |
| Admin — Anime-Kontext-Karte | `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx:113,121` | Thumbnail + Debug-Text |
| Admin — Anime bearbeiten (Workspace) | `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx:759` | Vorschau mit Link zur Public-Seite |
| Admin — Anime bearbeiten (Kopf) | `frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx:109` | Header-Thumbnail |
| Admin — Fansub-Releases-Cockpit | `frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesCockpit.tsx:207` | Fallback-Visual |

**Formular-/Zustands-Logik ohne eigenes Bild-Rendering (Admin anlegen/bearbeiten):**
`frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts`,
`.../hooks/internal/useAnimePatchImpl.ts`,
`.../hooks/internal/anime-patch/useAnimePatchMutations.ts`,
`.../create/aniSearchJellyfinPrecedence.ts`, `.../create/createPageHelpers.ts`,
`.../create/internal/useAdminAnimeCreateControllerImpl.ts`,
`.../create/internal/admin-anime-create/useCreateSubmitAction.ts`,
`frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditSharedSections.tsx:304`
(„Cover leeren"-Checkbox) — diese Dateien bauen PATCH/POST-Payloads mit `cover_image`
und müssen beim API-Vertragswechsel (Schritt 3) mitgezogen werden, zeigen aber selbst
kein Bild.

**Reine Typdeklarationen (Durchreiche, kein eigenes Verhalten):**
`frontend/src/types/{admin.ts, anime.ts, fansub.ts, watchlist.ts}`,
`frontend/src/app/admin/anime/types/admin-anime.ts`,
`frontend/src/lib/utils.ts` (`getCoverUrl` — gemeinsamer URL-Resolver, von fast allen
Render-Stellen oben genutzt; bleibt als Funktion, muss ggf. nur den Eingabe-Feldnamen
anpassen).

**Tests/Fixtures** (≈20 Dateien, u. a. `*.test.ts(x)`,
`frontend/scripts/fixtures/anime-detail-fixture-server.mjs`) — ziehen mit, sobald sich
Feldname/-verhalten ändert; nicht einzeln aufgeführt, da reine Gegenprobe ohne eigenes
Verhalten.

### 4. Weitere Konsumenten

**`shared/contracts/`** — `cover_image` als Schema-Property/Beispielwert in:
`openapi.yaml` (10 Stellen, u. a. Zeile 11521 als `required`-Feld in einem Schema),
`anime-list.yaml`, `anime-detail.yaml`, `watchlist.yaml`, `admin-content.yaml`.

**Migrationen** — `database/migrations/0001_init_anime.up.sql:30` (Ursprung der
Spalte), `database/migrations/0040_add_anime_cover_asset_slots.up.sql:17-23` (einmaliger
Backfill von `cover_resolved_url` aus `cover_image` beim Einführen der V2-Slot-Spalten
— erklärt, warum `cover_resolved_url` konzeptionell existiert, aber live leer ist, weil
der Backfill nur rückwirkend lief und seither nichts mehr nachzieht).

**Import-/Betriebs-Skripte** — keine AniSearch- oder Jellyfin-Importskripte fassen die
Spalte direkt an (nur über die Backend-Handler/Repository-Schicht oben). Drei
PowerShell-Skripte unter `scripts/` sind direkt an die Spalte gekoppelt und wirken
historisch/veraltet (Standard-DB-Name `team4s`, nicht `team4s_v2`):
- `scripts/report-cover-image-state.ps1` — Reporting (`SELECT ... cover_image ...`)
- `scripts/remediate-cover-image.ps1` — Ad-hoc-Bereinigung (`UPDATE anime SET cover_image = ...`)
- `scripts/smoke-admin-content.ps1:240-253` — Smoke-Test, prüft PATCH-Endpunkte für
  Cover setzen/leeren über das Feld `cover_image`

**Einmal-Migrationswerkzeug** — `backend/cmd/migrate-covers/` (siehe Abschnitt 2).

---

## Vorschlag Zielbild und Schrittfolge

1. **Schritt 1 (klein, risikoarm):** `hasV2AssetSchema` und die zugehörigen
   `false`-Zweige in `anime_assets*.go` entfernen (der Zweig ist live nie erreichbar,
   da `anime_media` immer existiert) — kein Verhaltensunterschied, nur eine
   Zusatzabfrage pro Bild-Operation weniger.
2. **Schritt 2 (mittel):** Alle rohen Leser aus Tabelle 1b auf
   `animeCoverImageSelectSQL`/`animeCoverAvailableSQL` (oder eine vereinfachte Variante
   davon ohne `cover_image`-Glied) umstellen, inklusive der Admin-Variante
   `anime_relations_admin.go`. Danach ist `syncLegacyAnimeCoverImageV2` überflüssig und
   kann entfernt werden; ebenso die Schreibzweige, die `cover_image` als Mirror pflegen
   (`anime_assets_cover.go`, Create/Update/Delete-Pfade).
3. **Schritt 3:** Spalte `anime.cover_image` per Migration entfernen (append-only,
   `DROP COLUMN`), API-Feld `cover_image` im Vertrag (`shared/contracts/*.yaml`) und in
   allen Backend-Response-/Frontend-Typen bereinigen (behalten als reiner Ausgabename,
   aber aus `anime_media`/`media_assets` befüllt — siehe Offene Frage 2).
4. Historische Skripte/Tools, die ausschließlich die Spalte bedienen
   (`scripts/report-cover-image-state.ps1`, `scripts/remediate-cover-image.ps1`,
   `backend/cmd/migrate-covers/`), nach Abschluss von Schritt 3 löschen oder explizit als
   archiviert kennzeichnen (siehe Offene Frage 4).

---

## Risiken

- **Verschwindende Bilder:** Ausgeschlossen für die aktuellen 10 Live-Anime (alle 3
  betroffenen haben einen deckungsgleichen V2-Poster). Risiko besteht nur, falls
  zwischen Inventur und Ausführung neue Anime mit *nur* `cover_image` (ohne V2-Poster)
  angelegt werden — unwahrscheinlich, da der aktuelle Create/Update-Pfad bereits
  spiegelt, aber nicht spezifisch geprüft.
- **Reihenfolge-Inversion bei V2-bewussten Lesern:** `animeCoverImageSelectSQL`
  bevorzugt heute `cover_image` vor dem V2-Poster-Join. Bei Entfernung der Spalte fällt
  diese Stelle automatisch auf den Poster-Join zurück — für die 3 betroffenen Anime
  identisch, für alle anderen (bereits nur Poster) keine Änderung. Kein Risiko, aber
  der COALESCE-Baustein muss beim Umbau syntaktisch korrekt um das `cover_image`-Glied
  verkürzt werden, nicht nur die Spalte stillschweigend NULL werden lassen.
- **Vorbestehende Lücke wird durch Umstellung behoben, nicht neu eingeführt:** die 7
  Jellyfin-Anime sind an den rohen Lesestellen (Hauptliste, Watchlist, Fansub-Profile)
  schon heute ohne Cover — nach Schritt 2 bekommen sie eins. Das ist eine **sichtbare
  Verbesserung**, aber technisch keine „unsichtbare" Änderung im strengen Sinn des
  Phasentitels — siehe Offene Frage 3 zur Einordnung.
- **Provider-Cover-URL-Pfad:** `ApplyProviderCover` schreibt externe URLs in
  `cover_image` (aktuell 0 Datensätze betroffen). Nach Spalten-Entfernung muss diese
  Schreibstelle auf `cover_resolved_url` umgestellt werden, sonst geht die
  Provider-Cover-Funktion für zukünftige Anime kaputt, ohne dass es in der aktuellen
  Inventur auffällt (0 Live-Fälle verdecken das).
- **Gecachte Bild-URLs/externe Verweise:** Da die 3 betroffenen Pfade unverändert
  bleiben (`/media/anime/<id>/cover/<uuid>/original.jpg` existiert unabhängig von der
  DB-Spalte weiter, solange die Datei nicht gelöscht wird), sind Browser-Caches und
  `next/image`-`localPatterns` nicht betroffen — die URL-Form ändert sich nicht, nur
  ihre Herkunft in der Datenbank.
- **Test-Fixture-Drift:** Mehrere Testdateien (siehe Abschnitt 3) bilden `cover_image`
  nach — nach Code-Umstellung müssen diese Fixtures gegen das echte Schema (`psql \d`)
  und echte Responses geprüft werden, nicht nur kopiert (Lehre aus vorherigen Phasen).

---

## Abgrenzung

- Keine Änderung an den V2-Slot-Spalten `cover_asset_id`/`cover_source`/
  `cover_resolved_url`/`cover_provider_key` selbst (die bleiben, auch wenn aktuell
  ungenutzt) — nur ihre Interaktion mit `cover_image` in den betroffenen Schreibpfaden.
- Keine Änderung an `banner_asset_id`/Banner-Logik — strukturell ähnlich, aber nicht
  Teil von F-01 (kein Legacy-`banner_image`-Textfeld existiert).
- `backend/cmd/migrate-covers/` wird nicht ausgeführt, nur ggf. nach Abschluss entfernt
  (Offene Frage 4) — kein erneuter Migrationslauf in dieser Phase nötig, da die
  Produktionsdaten laut Inventur schon vollständig im V2-Speicher liegen.
- F-17 (Inventur „Doppelungen nach Fachaufgaben") ist eine separate Folgephase und wird
  hier nicht mitbearbeitet, auch wenn der Befund aus Abschnitt 1b (Public- vs.
  Admin-Beziehungen-Pfad) thematisch verwandt ist.

---

## Offene Fragen an den Nutzer

### Frage 1 — Umgang mit Anime, die nur ein Legacy-Cover haben

Betrifft aktuell 0 von 10 Anime (alle 3 mit `cover_image` haben bereits einen
deckungsgleichen V2-Poster) — die Frage ist daher eher „was tun wir, falls doch",
nicht „was tun wir mit konkreten Datensätzen".

- **Option A:** Vor dem `DROP COLUMN` eine einmalige Prüfabfrage (nicht Migration)
  laufen lassen, die exakt das in Abschnitt 1a gezeigte Muster nochmal zum
  Ausführungszeitpunkt bestätigt (0 Treffer erwartet) — bei einem Treffer die
  Migration manuell stoppen und den Fall einzeln klären.
- **Option B:** Keine Prüfabfrage, direkt droppen — die Inventur hier ist aktuell
  genug (Live-DB, heute geprüft).
- **Auswirkung im Alltag:** Bei Option A minimal mehr Vorlauf vor der Migration
  (eine Abfrage, kein Code). Bei Option B theoretisches Restrisiko, falls zwischen
  Planung und Ausführung neue Anime ohne V2-Poster angelegt werden.
- **Empfehlung:** Option A — die Prüfabfrage ist einzeilig und macht die Annahme
  „0 Betroffene" zum Ausführungszeitpunkt statt zum Inventurzeitpunkt verbindlich,
  ohne Mehraufwand in der Planung.

### Frage 2 — API-Feld `cover_image` behalten, umbenennen oder entfernen

- **Option A:** Feldname `cover_image` im Vertrag behalten, aber inhaltlich aus dem
  V2-Poster-Join befüllen (reine Backend-Umstellung, 0 Frontend-Änderungen nötig, da
  alle ≈14 Render-Stellen aus Abschnitt 3 weiterhin `cover_image` lesen).
  **~55 Fundstellen betroffen durch Mitführen, 0 davon müssen inhaltlich geändert werden.**
- **Option B:** Feld umbenennen (z. B. `cover_url`), um den Legacy-Namen nicht
  weiterzuführen — erfordert Anpassung aller ≈14 Frontend-Render-Stellen plus
  Formular-/Typ-Dateien plus Contracts, zusätzliches Risiko pro geänderter Stelle.
- **Auswirkung im Alltag:** Option A ist für Nutzer unsichtbar und entspricht dem
  Phasentitel „ohne sichtbare Änderung". Option B ist eine sauberere Namensgebung,
  aber mit deutlich größerem Diff und Regressionsfläche für denselben fachlichen
  Nutzen.
- **Empfehlung:** Option A — der Phasenauftrag fordert ausdrücklich „ohne sichtbare
  Änderung für Nutzer"; eine Umbenennung ist reine Code-Hygiene, die den Diff ohne
  fachlichen Gewinn vergrößert und besser in einer eigenen, bewusst benannten Folge-
  phase liefe, falls gewünscht.

### Frage 3 — Soll die in Abschnitt 1b gefundene Jellyfin-Cover-Lücke in dieser Phase
mitbehoben werden?

- **Option A:** Ja, implizit — da Schritt 2 ohnehin alle rohen Leser auf den
  V2-Join umstellt, bekommen die 7 Jellyfin-Anime an Hauptliste/Watchlist/Fansub-
  Profilen automatisch ein Cover. Keine zusätzliche Arbeit, nur eine bewusste
  Erwartungshaltung vor dem Vorher/Nachher-Vergleich (siehe Vergleichs-URLs unten).
- **Option B:** Die Umstellung bewusst so eng fassen, dass die Lese-Rangfolge exakt
  erhalten bleibt (also `cover_image`-Priorität durch eine andere, gleichwertig
  bevorzugte Quelle ersetzen) — technisch unnötiger Mehraufwand, um eine
  Verbesserung zu unterdrücken.
- **Auswirkung im Alltag:** Bei Option A zeigen Hauptliste/Watchlist/Fansub-Profile
  nach der Phase erstmals Cover für 7 bisher coverlose Jellyfin-Anime — eine
  sichtbare, aber positive Änderung, die dem Wortlaut „ohne sichtbare Änderung"
  leicht widerspricht, fachlich aber ein Bugfix ist, kein Risiko.
- **Empfehlung:** Option A — die „keine sichtbare Änderung" im Phasentitel bezieht
  sich auf die 3 heute schon korrekt angezeigten Cover, nicht auf einen bewussten
  Verzicht auf einen kostenlosen Bugfix. Sollte im Abschlussbericht/UAT explizit als
  Nebeneffekt genannt werden, damit es nicht als unerwartete Regression missverstanden
  wird.

### Frage 4 — Spalte sofort droppen oder erst nach Beobachtungszeit; Legacy-Dateien
auf der Platte löschen oder behalten

- **Option A:** Spalte in derselben Phase droppen (append-only-Migration, wie im
  Repo üblich), Dateien auf der Platte unangetastet lassen (sie werden ja weiter über
  `anime_media`/`media_assets` referenziert — kein verwaistes Löschen nötig, da alle
  3 betroffenen Dateien aktive V2-Referenzen haben).
- **Option B:** Erst Code umstellen und einige Tage live beobachten (Fehlermonitoring,
  manueller Seitenvergleich), danach in einer separaten Mini-Phase die Spalte droppen.
- **Auswirkung im Alltag:** Option A ist schneller abgeschlossen und passt zum
  bestehenden Append-only-Migrationsmodell des Projekts; Option B gibt mehr
  Sicherheit bei einer Spalte, die aktuell noch aktiv mitgeschrieben wird (Mirror-
  Logik), kostet aber eine zweite Phase/Planungsrunde für denselben Schritt.
- **Empfehlung:** Option A für die Spalte (die Inventur zeigt 0 Risiko-Datensätze,
  Schritt 2 läuft ohnehin vor dem Drop und kann im selben UAT geprüft werden) — Dateien
  in jedem Fall behalten, unabhängig von der gewählten Option, da sie aktive
  Referenzen haben.

---

## Vergleichs-URLs (vorher/nachher, über `http://127.0.0.1:3300`)

1. `http://127.0.0.1:3300/anime` — öffentliche Anime-Liste, Letter-Filter leer
   (zeigt alle 10, inkl. der 7 bisher ohne sichtbares Cover an dieser Stelle).
2. `http://127.0.0.1:3300/anime/3` — Detailseite „11eyes: Pink Phantasmagoria"
   (eines der 3 Anime mit Legacy-Cover — muss vorher/nachher identisch aussehen).
3. `http://127.0.0.1:3300/anime/1` — Detailseite „Buddy Complex" (Jellyfin-Anime
   ohne Legacy-Cover — zeigt den Umfang des Nebeneffekts aus Frage 3 auf der
   Detailseite, falls dort ebenfalls ein roher Leser beteiligt ist).
4. `http://127.0.0.1:3300/fansubs` → ein Fansub-Profil mit Projekt-Übersicht (zeigt
   `FansubProjectBannerCard`-Fallback und die Projektkarten).
5. `http://127.0.0.1:3300/me/watchlist` (eingeloggt, mit mind. einem der 3
   betroffenen Anime oder einem Jellyfin-Anime auf der Merkliste) — Watchlist nutzt
   den rohen Leser aus Tabelle 1b.

---

## Referenzen

- `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-FOLLOWUPS.md`
  Abschnitt F-01 — ursprünglicher Auftrag und Schrittfolge-Vorschlag (Stand 2026-10-05,
  29 Backend-/55 Frontend-Stellen geschätzt; diese Inventur hat die reale, inzwischen
  gewachsene Zahl ermittelt).
- Memory-Lehren (diese Session): Bilder unter `/media` und `/covers` laufen über
  `next/image` mit strikter `localPatterns`-Allowlist — hier nicht betroffen, da sich
  keine URL-Form ändert (siehe Risiko „Gecachte Bild-URLs"). Test-Fixtures driften
  gern vom echten Schema — Änderungen in Schritt 2/3 per `psql \d` und echtem Request
  gegenprüfen, nicht nur Fixtures kopieren.
