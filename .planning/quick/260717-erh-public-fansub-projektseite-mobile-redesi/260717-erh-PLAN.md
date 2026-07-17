---
quick_task: 260717-erh
status: ready
scope: Public Fansub-Projektseite Mobile Redesign Add-on
depends_on: 260717-d7i
---

# Quick Task 260717-erh — Plan

## Ziel

Die bereits abgeschlossene mobile Projektseiten-Arbeit aus Quick `260717-d7i` bleibt unverändert. Dieser Add-on-Schnitt baut ausschließlich die öffentliche Release-Detailseite um, persistiert die reale Herkunftsgruppe von Release-Version-Bildern und -Texten und öffnet Karaoke-Segmente über einen eigenen kurzlebigen Public-Grant. Die Wiedergabe einer vollständigen Episode bleibt vollständig hinter der bestehenden Session-, Entitlement- und Release-Grant-Kette.

## Gelockte Entscheidungen

- Backdrop-Priorität: dediziertes Anime-Backdrop, danach Banner; vorhandener Blur um 14 px und vorhandener Scrim.
- Hero startet immer zugeklappt und zeigt im geschlossenen Zustand statisches Key-Visual, Eyebrow, Episodentitel, `Gruppe · Sub-Typ` und `Details`.
- Technische Fakten und nach Herkunftsgruppe gruppierte Release-Mitwirkende liegen im geöffneten Hero.
- Der Full-Episode-Player darf nicht im Hero erscheinen; seine bestehende berechtigte Funktion bleibt als nachrangige Aktion erhalten.
- Stimmen zeigen initial mindestens einen Text je beteiligter Gruppe und füllen danach bis drei auf; bei mehr als drei Gruppen ist initial je Gruppe ein Text sichtbar.
- Karaoke ist anonym wie angemeldet abspielbar; der Deep-Link bleibt `?kara={id}&autoplay=1#op-ed-middle`.
- `release_version_media` und `release_version_notes` erhalten nullable `fansub_group_id`; unklare Altbestände bleiben `NULL` und erscheinen unter `Nicht eindeutig zugeordnet`.
- Mobile 360–420 px ist primär; Desktop darf keine unnötige weiße Fläche oder funktionale Regression erhalten.
- Nur bestehende UI-Komponenten, Tokens, Wine-Linie und Icon-Bibliothek verwenden; deutsche UI-Texte mit korrekten Umlauten.
- Aus `260717-d7i` nicht erneut umsetzen: Projekt-Identity-Card, Coop-Stack, Release-Sortierung, Featured-Auswahl, 5/10-Nachladung, mobile Release-Accordions, Kara-Gruppen/3er-Toggle, Segmentversion und Pretty-Route-Deep-Link.

## Vorab-Befunde

- `SectionHeader underline`/`.sectionHeaderUnderline` und `AccentRule` rendern die Wine-Linie über `var(--ui-line)`.
- Global vorhanden: Rich-Header-`Accordion`, `AvatarStack`, `Card`, `Badge`, `Button`, `AdjacentNavigation`.
- Release-Technikdaten liegen bereits in `release_variants`/`release_streams`; `subtitle_type` muss nur als eigenes öffentliches DTO-Feld projiziert werden.
- `anime_contributions.fansub_group_id` ist die verlässliche Herkunft für Release-Mitwirkende.
- Bilder und Texte besitzen noch keine persistierte Herkunftsgruppe. Die bisherigen Uploader-/Member-Heuristiken können mehrere Gruppen liefern und dürfen daher nicht stillschweigend die geroutete oder erste Gruppe wählen.
- Der aktuelle Segment-Grant verlangt Auth; `ThemeTimeline` blendet Playback für Gäste aus. Der Full-Episode-Pfad ist separat durch `release_playback_entitlement_rules`, `/release-versions/:id/playback-access`, Release-Grant und Release-Stream abgesichert.
- Der Release-Hero rendert derzeit Technik, Zähler und `ReleaseEpisodePlayer` offen; Mitwirkende stehen als eigene flache Sektion darunter; Bilder sind ungruppiert und mobil einspaltig; Texte sind nach Rolle statt Gruppe sortiert.
- `getAnimeBackdrops` liefert Backdrops, Banner und Logo. Der aktuelle Loader priorisiert irrtümlich Banner vor Backdrop.
- Aktuell ist `0129_release_playback_entitlements` die letzte Migration; es gibt keine untracked Migration. Vor dem Anlegen von `0130` muss der Executor dies erneut prüfen.

## Read First

### Regeln und Kontext

- `AGENTS.md`
- `.planning/quick/260717-erh-public-fansub-projektseite-mobile-redesi/260717-erh-CONTEXT.md`
- `C:/Users/admin/.codex/attachments/f7b9c238-2f18-4d45-aca1-aec4eb9408b9/pasted-text.txt`
- `.planning/quick/260717-d7i-public-fansub-projektseite-mobile-redesi/260717-d7i-PLAN.md`
- `.planning/quick/260717-d7i-public-fansub-projektseite-mobile-redesi/260717-d7i-SUMMARY.md`
- `.planning/STATE.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md`
- `docs/frontend/auth-api-client.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`

### Herkunftsgruppe, Writes und Migration-Analogien

- `database/migrations/0059_release_version_media_schema.up.sql`
- `database/migrations/0059_release_version_media_schema.down.sql`
- `database/migrations/0064_release_version_notes.up.sql`
- `database/migrations/0064_release_version_notes.down.sql`
- `database/migrations/0129_release_playback_entitlements.up.sql`
- `database/migrations/0129_release_playback_entitlements.down.sql`
- `backend/internal/migrations/phase103_release_playback_entitlements_test.go`
- `backend/internal/repository/release_version_media_repository.go`
- `backend/internal/repository/release_version_media_repository_test.go`
- `backend/internal/repository/release_version_notes_repository.go`
- `backend/internal/repository/release_version_notes_repository_test.go`
- `backend/internal/handlers/admin_content_release_version_media.go`
- `backend/internal/handlers/admin_content_release_version_media_test.go`
- `backend/internal/handlers/admin_content_release_version_notes.go`
- `backend/internal/handlers/admin_content_release_version_notes_test.go`
- `backend/internal/permissions/permissions.go`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx`
- `frontend/src/types/releaseVersionMedia.ts`
- `frontend/src/types/releaseVersionNotes.ts`
- `frontend/src/lib/api.ts` (Release-Version-Media-/Notiz-Helper)
- `shared/contracts/admin-content.yaml`

### Public Release-Projektion und UI

- `backend/internal/repository/release_detail_public_repository.go`
- `backend/internal/repository/release_detail_public_repository_helpers.go`
- `backend/internal/repository/release_detail_public_repository_test.go`
- `backend/internal/repository/release_detail_cursor_test.go`
- `backend/internal/handlers/group_contributors_handler.go`
- `backend/internal/handlers/group_contributors_handler_test.go`
- `shared/contracts/openapi.yaml` (Public Release Detail, Cursor und Segment-Grant)
- `shared/contracts/anime-backdrops.yaml`
- `frontend/src/types/releaseDetail.ts`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNavigation.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css`
- die jeweils benachbarten `*.test.ts(x)`-Dateien
- `frontend/src/components/ui/Accordion.tsx`
- `frontend/src/components/ui/SectionHeader.tsx`
- `frontend/src/components/ui/AccentRule.tsx`
- `frontend/src/components/ui/ui.module.css`
- `frontend/src/components/fansubs/FansubStoryBlock.tsx`
- `frontend/src/components/fansubs/FansubStoryBlock.module.css`

### Segment- und Full-Episode-Sicherheitsanalogien

- `backend/internal/auth/segment_grant.go`
- `backend/internal/auth/segment_grant_test.go`
- `backend/internal/handlers/segment_stream.go`
- `backend/internal/handlers/segment_stream_test.go`
- `backend/internal/handlers/release_playback_access.go`
- `backend/internal/handlers/episode_version_grants.go`
- `backend/internal/handlers/episode_version_stream.go`
- `backend/cmd/server/main.go` (Release-/Segment-Routen und Middleware)
- `frontend/src/lib/server/streamRelayAuth.ts`
- `frontend/src/lib/server/streamRelayAuth.test.ts`
- `frontend/src/app/api/segments/[id]/stream/route.ts`
- `frontend/src/app/api/segments/[id]/stream/route.test.ts`
- `frontend/src/app/api/releases/[id]/stream/route.ts`
- `frontend/src/lib/api.no-token-boundary.test.ts`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx`

## Wave 1 — Persistierte Herkunftsgruppe

### Task 1 — Schema, sichere Rückführung und autorisierte Write-Verträge

**Commit:** `feat(releases): persist source groups for release content`

**Dateien:**

- `database/migrations/0130_release_content_source_groups.up.sql` (neu; Nummer vor Erstellung erneut prüfen)
- `database/migrations/0130_release_content_source_groups.down.sql` (neu)
- `backend/internal/migrations/release_content_source_groups_test.go` (neu)
- `backend/internal/repository/release_version_media_repository.go`
- `backend/internal/repository/release_version_media_repository_test.go`
- `backend/internal/repository/release_version_notes_repository.go`
- `backend/internal/repository/release_version_notes_repository_test.go`
- `backend/internal/handlers/admin_content_release_version_media.go`
- `backend/internal/handlers/admin_content_release_version_media_test.go`
- `backend/internal/handlers/admin_content_release_version_notes.go`
- `backend/internal/handlers/admin_content_release_version_notes_test.go`
- `frontend/src/types/releaseVersionMedia.ts`
- `frontend/src/types/releaseVersionNotes.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx`
- zugehörige Frontend-Tests
- `shared/contracts/admin-content.yaml`

**Umsetzung:**

1. Vor der Migration `git status --short` und die höchste Migrationsnummer prüfen. Bei mehreren untracked Migrationen stoppen. Sonst additiv auf beiden Tabellen `fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE SET NULL` sowie partielle `(release_version_id, fansub_group_id)`-Indizes für nicht gelöschte Zeilen ergänzen. Keine historische Migration ändern.
2. Die UP-Migration führt Altbestand ausschließlich über eindeutige Kandidaten zurück:
   - Medien: Uploader `users -> app_users -> verified member_claims -> members`, dann Contribution derselben Release-Version oder Anime-Fallback und Schnittmenge mit `release_version_groups`; nur `COUNT(DISTINCT ac.fansub_group_id)=1` wird geschrieben.
   - Texte: `rvn.member_id + contributor_roles.name` gegen `anime_contributions + anime_contribution_roles` derselben Release-Version oder Anime-Fallback und Schnittmenge mit `release_version_groups`; ebenfalls nur genau eine Kandidatengruppe.
   - Keine URL-/Route-Gruppe, keine erste Release-Gruppe und kein `MIN(group_id)` ohne vorherigen Eindeutigkeitsnachweis verwenden. Null bleibt Null.
3. DOWN entfernt zuerst Indizes, dann beide nullable Spalten. Ein Migrationstest prüft FK, Nullable-Form, beide Eindeutigkeits-HAVING-Gates, das Fehlen heuristischer Fallbacks und die reversible DOWN-Struktur. Up/down zusätzlich nur auf einer disponiblen lokalen Test-DB ausführen.
4. `ReleaseVersionMediaCreateInput`, `ReleaseVersionMediaItem`, `ReleaseVersionNote`, `BulkNoteInput` und die List-/Insert-/Update-Queries um `FansubGroupID *int64` erweitern. Bei bestehenden Zeilen darf eine Herkunftsgruppe nicht still über einen anderen Gruppenwert überschrieben werden.
5. Media-Upload akzeptiert `fansub_group_id` im bestehenden Multipart-Flow. Notiz-Upsert akzeptiert `fansub_group_id` je Note. Der Server validiert vor jedem Write, dass die Gruppe in `release_version_groups` beteiligt ist und für den konkreten Actor/Member-/Rollen-Kontext erlaubt ist. Ein fehlender Wert darf nur dann serverseitig ergänzt werden, wenn exakt eine autorisierte Kandidatengruppe folgt; bei null oder mehreren Kandidaten liefert der Handler einen dokumentierten `422` statt zu raten. Platform-Admins müssen bei Coop-Releases ebenfalls eine reale beteiligte Gruppe auswählen.
6. `EpisodeVersionEditorPage` reicht die bereits geladenen `selectedGroups` an Media- und Notizbereich. Beide verwenden das vorhandene globale `Select` als semantische Relation-Auswahl: bei genau einer Gruppe vorausgewählt, bei mehreren explizite Auswahl. Der zentrale Upload-XHR bleibt der einzige Upload-Transport und der zentrale API-Client bleibt alleiniger Bearer-/Refresh-Eigentümer.
7. Backend-Runtime, `shared/contracts/admin-content.yaml`, `frontend/src/types/releaseVersionMedia.ts`, `frontend/src/types/releaseVersionNotes.ts` und `frontend/src/lib/api.ts` werden im selben Commit synchronisiert. Tests decken Single-Group-Autoderivation, explizite autorisierte Coop-Gruppe, fremde Gruppe, mehrdeutigen Missing-Wert und Refresh-only-Session im geschützten Editor ab.

**Akzeptanz:**

- Neue Bilder und Texte besitzen immer eine validierte reale Herkunftsgruppe.
- Unklare Altdaten bleiben `NULL`; kein Datensatz wird aufgrund der aktuellen Route einer Gruppe zugeschlagen.
- Media und Notes bleiben release-version-scoped; `release_media` und neutrale Episoden werden nicht verwendet.
- Die Migration ist additiv, DOWN vorhanden und auf einer disponiblen DB up/down geprüft.
- Kein neuer Upload-, Token- oder Auth-Seam entsteht.

## Wave 2 — Öffentliche Projektion und Vertrag

### Task 2 — Herkunftsgruppen und Sub-Typ in Public DTO/Cursor spiegeln

**Commit:** `feat(releases): project grouped public release content`

**Dateien:**

- `backend/internal/repository/release_detail_public_repository.go`
- `backend/internal/repository/release_detail_public_repository_helpers.go`
- `backend/internal/repository/release_detail_public_repository_test.go`
- `backend/internal/repository/release_detail_cursor_test.go`
- `backend/internal/handlers/group_contributors_handler.go`
- `backend/internal/handlers/group_contributors_handler_test.go`
- `shared/contracts/openapi.yaml`
- `frontend/src/types/releaseDetail.ts`
- `frontend/src/lib/api.ts`
- relevante API-/Contract-Tests

**Umsetzung:**

1. `PublicReleaseContributor` erhält eine nicht-nullbare `fansub_group_id` aus `anime_contributions.fansub_group_id`. `PublicReleaseImage` und `PublicReleaseNote` erhalten nullable `fansub_group_id` direkt aus den neuen Spalten. Gruppenname/-logo bleiben in der vorhandenen `groups[]`-Projektion; das Frontend verbindet ausschließlich per ID und erzeugt für Null den neutralen Bucket.
2. Contributor-Aggregation und `contributors_count` verwenden `(fansub_group_id, member_id)` als fachliche Einheit, damit dieselbe Person in zwei Herkunftsgruppen nicht falsch zusammenfällt. Rollen bleiben innerhalb derselben Gruppen-/Member-Einheit aggregiert.
3. Vollständige Detail-, Bilder-Cursor- und Notiz-Cursor-Queries selektieren dieselbe Herkunft. Der Notiz-Cursor erhält analog zum Bilder-Cursor `animeID, groupID, releaseVersionID` und validiert Ownership bei jedem Nachladen; die bisherige Annahme, dass ein vorheriger Seitenaufruf genügt, wird entfernt.
4. `PublicReleaseDetail` erhält additiv `subtitle_type`, direkt aus `release_variants.subtitle_type`; `subtitle_tracks` bleibt für Sprachen/Spuren erhalten. Keine Technik-Migration.
5. `shared/contracts/openapi.yaml`, Go-JSON-Tags, TypeScript-DTOs und API-Helper werden gemeinsam angepasst. Focused Tests prüfen Null-Bucket, gruppengleiche Contributor-Rollen, gruppenverschiedene gleiche Member, Cursor-Ownership und Sub-Typ.

**Akzeptanz:**

- Public Detail und beide Nachlade-Endpunkte liefern dieselben Herkunftsfelder.
- Kein Client leitet Gruppen aus Uploadernamen, URL oder Arrayposition ab.
- Falscher Anime-/Gruppenpfad kann keine Notes-Cursor-Seite einer fremden Release-Version abrufen.
- OpenAPI, Backend und Frontend stimmen exakt überein.

## Wave 3 — Öffentlicher, segmentgebundener Kara-Stream

### Task 3 — Public Segment Grant ohne Ausweitung des Episode-Entitlements

**Commit:** `feat(karaoke): add public bounded segment grants`

**Dateien:**

- `backend/internal/auth/segment_grant.go`
- `backend/internal/auth/segment_grant_test.go`
- `backend/internal/handlers/segment_stream.go`
- `backend/internal/handlers/segment_stream_test.go`
- `backend/cmd/server/main.go`
- `shared/contracts/openapi.yaml`
- `frontend/src/lib/server/streamRelayAuth.ts`
- `frontend/src/lib/server/streamRelayAuth.test.ts`
- `frontend/src/app/api/segments/[id]/stream/route.ts`
- `frontend/src/app/api/segments/[id]/stream/route.test.ts`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.test.tsx`
- `frontend/src/lib/api.no-token-boundary.test.ts`

**Umsetzung:**

1. Neben dem authentifizierten Segment-Grant einen ausdrücklich öffentlichen Endpoint `POST /api/v1/public/segments/{id}/grant?release_version_id=…` ohne Auth-Middleware definieren. Er prüft positive IDs, die persistierte Bindung `source.ReleaseVersionID == release_version_id`, fertigen Render-Cache oder kuratiertes Upload-Fallback und Grant-Konfiguration; freie Start-/End-/Dauerwerte bleiben verboten.
2. Der Public-Grant erhält einen eigenen signierten Claim-Vertrag mit festem Audience-Wert, `segment_id`, `release_version_id`, optionalem Cache-Key und kurzer Ablaufzeit. Er enthält keine erfundene User-ID. Parser und Stream-Handler akzeptieren ihn nur für denselben Segment-/Release-/Cache-Kontext. Authentifizierte Legacy-Segment-Grants bleiben kompatibel; Release-Grants können den Public-Segment-Grant wegen getrenntem Payload/Audience/Parser nicht verwenden.
3. `resolveStreamRelayTarget` wird nicht für einen anonymen Bearer-Fallback missbraucht. Stattdessen eine kleine öffentliche Grant-Auflösung im bestehenden `streamRelayAuth.ts` ergänzen, die den Public-Grant serverseitig holt und nur den signierten Grant an den Backend-Stream hängt. Die Next-Relay-Route liest für diesen Pfad keine Auth-Cookies und leitet weiterhin nur Range/User-Agent sowie sichere Response-Header weiter.
4. `ThemeTimeline` macht alle `ready`-Segmente unabhängig von Session anklickbar. Gültige anonyme Deep-Links wählen das Segment nach Client-Initialisierung automatisch; unfertige oder fremde IDs starten nichts. Es gibt keinen Login-Hinweis.
5. Full-Episode-Pfade bleiben unverändert: `ReleaseEpisodePlayer` fragt weiter geschützt über `getReleasePlaybackAccess`, behandelt `hasAccessToken || hasRefreshToken` als Session und streamt nur über `/api/releases/{id}/stream`. Regressionstests beweisen: Gast kann Kara, Gast kann keine Episode, Refresh-only kann bei positivem Entitlement weiterhin Episode, ein Public-Segment-Grant wird von keinem Release-Endpoint akzeptiert.
6. OpenAPI dokumentiert Methode, Authfreiheit, Parameter, 201/400/404/409/503, Public-Grant-Schema und Sicherheitsgrenzen. Keine Tokens in Client-Props, Query-Logs oder UI-Code.

**Threat Model / Akzeptanz:**

- Ein Nutzer kann weder Segment-ID noch Release-Bindung noch Zeitfenster innerhalb eines Grants ändern.
- Abgelaufene, falsch signierte, cross-release und cache-veraltete Grants werden abgewiesen.
- Ein Public-Kara-Grant erweitert weder globale, Gruppen-, Projekt- noch Release-Entitlements der vollständigen Episode.
- Public Playback funktioniert anonym, mit Access-Token und mit reiner Refresh-Session identisch.

## Wave 4 — Release-Detail-UI

### Task 4 — Mobile Hero-Accordion, Gruppenbereiche und progressive Texte

**Commit:** `feat(releases): redesign public release detail for mobile`

**Dateien:**

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css`
- benachbarte Release-Detail-Tests
- `frontend/src/components/fansubs/FansubStoryBlock.tsx` und `FansubStoryBlock.module.css` nur falls die vorhandene Clamp-Logik fachlogikfrei extrahiert werden muss
- gegebenenfalls kleinste fachlogikfreie Editor-Komponente plus UI-Dokumentation, aber keine neue Designvariante

**Umsetzung:**

1. `releaseDetailPageData` priorisiert `backdrops[0]`, dann `banner_url`; Anime-Logo bleibt Logo-Fallback. Das gewählte Atmosphärebild wird dem Hero für den unscharfen Logo-Hintergrund gereicht. Preview-Bild bleibt immer vorrangig und wird nicht geblurrt.
2. Hero mit dem globalen `Accordion` als initial leere `openIds`-Menge komponieren. Geschlossen: statisches Key-Visual, `Episode N`, Episodentitel/Release-Titel, gleichrangige Gruppen plus kombinierter Sub-Typ und `Details`. Geöffnet: kompakte zweispaltige Fakten `Version`, `Auflösung`, `Veröffentlicht`, `Dauer`, `Video-Codec`; `Untertitel` liegt vollbreit und formatiert `Softsub · Deutsch, Englisch` beziehungsweise `Hardsub`.
3. `ContributorsRow` innerhalb des Hero-Panels nach `groups[]` gruppieren. Jede Gruppe nutzt Eyebrow/Wine-Linie, danach Avatar, Name und Release-Rollen. Null ist für Contributors nicht erlaubt; es gibt kein Lead-Group-Label. Der bisherige eigenständige Contributor-Abschnitt entfällt.
4. Direkt unter dem Hero eine kompakte Anchor-Leiste mit `Bilder`, `Texte`, `Fansubber`. Bilder/Texte springen zu ihren Sektionen. `Fansubber` öffnet kontrolliert das Hero-Accordion und fokussiert/scrollt den Beteiligtenbereich, statt auf versteckten Inhalt zu verlinken. Dazu Hero und Anchor als eine kleine release-spezifische Client-Komposition zusammenhalten; kein globaler Domain-State.
5. `ReleaseEpisodePlayer` aus dem Hero entfernen und als nachrangige geschützte Aktion nach Karaoke/Inhalten, vor der `AdjacentNavigation`, platzieren. Keine Playerfläche und kein Play-Overlay rendern, solange der Nutzer keine positive Access-Antwort hat.
6. Galerie nach `fansub_group_id` in der Reihenfolge von `groups[]` gruppieren; anschließend neutraler Bucket `Nicht eindeutig zugeordnet`. Innerhalb jeder Gruppe genau zweispaltiges Grid auch auf 360–420 px, Kategorie-Badge und Uploader bleiben sichtbar, Lightbox öffnet das Original. Vorhandenes Responsive-Reveal und Cursor-Dedupe bleiben erhalten; keine Kategorie-Untersektionen.
7. Stimmen analog nach Gruppe statt Rolle gruppieren. Jede Voice-Card behält Avatar, Name, Rolle und Datum. Die vorhandene gemessene `Mehr anzeigen`/`Weniger anzeigen`-Logik aus `FansubStoryBlock` wird wiederverwendet oder fachlogikfrei extrahiert, nicht kopiert.
8. Initial sichtbare Stimmen über eine reine, getestete Auswahlfunktion bilden: zuerst je beteiligter Gruppe die erste Note, danach in stabiler API-Reihenfolge bis drei auffüllen; bei mehr als drei Gruppen je Gruppe eine. Null-Bucket wird wie eine eigene Herkunftsgruppe behandelt. `Weitere N Texte anzeigen` enthüllt zunächst bereits gelieferte Einträge und nutzt erst danach den bestehenden Cursor; Fehler/Loading bleiben lokal.
9. `ReleaseNavigation` bleibt am Seitenende und nutzt weiter die Pretty-Route. Bestehende Klassen/Selektoren und globale Komponenten anpassen; keine neue Rohfarbe, kein neues Icon-Set, keine breite Desktop-Neugestaltung. Aktuelle rohe Hero-/Timeline-Farbwerte nicht vermehren; wo berührt, auf vorhandene semantische Tokens zurückführen.

**Akzeptanz:**

- Auf 360, 390 und 420 px startet der Hero geschlossen, zeigt keinen Fake-Player und das Fallback-Logo liegt auf unscharfem Backdrop/Banner statt Weiß.
- Hero-Fakten sind kompakt und Untertitel fachlich korrekt kombiniert.
- Mitwirkende, Bilder und Texte zeigen sofort ihre reale Herkunftsgruppe; Null wird ehrlich neutral dargestellt.
- Pro Gruppe ist die Galerie zweispaltig; Texte sind gekürzt und initial gruppengerecht begrenzt.
- Berechtigte Gesamtfolge bleibt erreichbar, aber nachrangig; anonyme Karas sind anklickbar.
- Desktop nutzt die verfügbare Breite ohne die frühere große leere rechte Spalte und ohne Projektseitenregression.

## Wave 5 — Abschluss und Verifikation

### Task 5 — Checks, Live-UAT und Quick-Dokumentation

**Commit:** `docs(gsd): complete quick 260717-erh`

**Dateien:**

- `.planning/quick/260717-erh-public-fansub-projektseite-mobile-redesi/260717-erh-SUMMARY.md` (neu)
- `.planning/STATE.md`

**Automatisierte Checks:**

1. Migration/Backend:
   - `cd backend && go test ./internal/migrations ./internal/auth ./internal/repository ./internal/handlers`
   - Auf einer ausschließlich disponiblen lokalen Test-DB nach vollständigem UP: `go run ./cmd/migrate down -steps 1 -database-url "$TEST_DATABASE_URL"`, danach `go run ./cmd/migrate up -database-url "$TEST_DATABASE_URL"`; anschließend Eindeutigkeits-SQL für Media-/Note-Backfill protokollieren.
2. Frontend fokussiert:
   - `cd frontend && npx vitest run src/lib/server/streamRelayAuth.test.ts src/app/api/segments/[id]/stream/route.test.ts "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx" "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.test.tsx" "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx" "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx" "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx" "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.test.tsx" "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.test.ts" src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx src/lib/api.no-token-boundary.test.ts`
3. Gesamtchecks:
   - `cd frontend && npm run typecheck`
   - `cd frontend && npm run lint`
   - `cd frontend && npm run build`
   - `git diff --check`
4. Diff-Selbstreview:
   - keine Änderung an `release_media`, Episode-Ownership oder `release_version_groups.fansubgroup_id`;
   - keine URL-/erste-Gruppe-Heuristik;
   - keine ad-hoc `fetch`-/Bearer-/Cookie-Logik in UI-Komponenten;
   - OpenAPI, Admin-Contract, Go und TypeScript synchron;
   - keine neue Rohfarbe/Library und keine Wiederholung von `260717-d7i`.

**Live-UAT im Codex-In-App-Browser:**

- Projekt-Einstieg: `http://127.0.0.1:3000/fansubs/c-subs/fansubprojekt/vipers-creed`, dann über `Ansicht`/`Vollständiges Release ansehen` zur Pretty-Release-Route navigieren.
- Viewports 360, 390, 420 px: geschlossener Hero, Details-Toggle, Backdrop→Banner→Logo-Fallback, Anchor-Aktionen, zweispaltige Gruppen-Galerie, Text-Clamp/Load-More, keine horizontale Überbreite.
- Desktop mindestens 1280 px: keine unnötige leere rechte Fläche, keine Banner-Imitation der Projektseite, Navigation und Lightbox intakt.
- Datenfälle: eine Gruppe; Coop mit zwei Gruppen; `fansub_group_id=NULL`; viele Bilder; mindestens zehn Texte; keine Preview; Preview vorhanden; Hardsub; Softsub mit mehreren Sprachen.
- Rechtefälle:
  - ausgeloggt: Kara-Button und gültiger Deep-Link spielen genau den Clip; Episode-Button fehlt;
  - normal eingeloggter User ohne Entitlement: Kara spielt, Episode fehlt;
  - Refresh-Token gültig, Access-Token fehlt: Kara spielt; geschützter Access-Check läuft durch zentralen Refresh-Seam und zeigt keinen falschen Logout;
  - berechtigter Fansubber/Platform-Admin: Kara spielt und nach positiver Access-Antwort ist die nachrangige Episode-Aktion nutzbar;
  - ungültiger/cross-release/unfertiger Kara-Link startet keinen Stream.
- Write-Retest im Release-Version-Editor: Single-Group-Upload/-Text speichert automatisch korrekt; Coop verlangt/zeigt Gruppenauswahl; fremde Gruppe wird serverseitig abgelehnt; bestehende Preview-Auswahl bleibt erkennbar und funktionsfähig.

## Nicht Teil dieses Quick Tasks

- Kein erneuter Umbau der Projektseite oder Release-Sortierung aus `260717-d7i`.
- Kein allgemeines Redesign des Full-Episode-Players oder der Entitlement-Verwaltung.
- Keine Episode als Media-/Rechte-Scope und keine neue Media-Tabelle.
- Kein automatisches Zuweisen unklarer Altbestände.
- Kein neues Framework, Icon-Set, paralleler API-Client oder paralleler Upload-Flow.
