# Fachaufgabe 8: Löschen / Aufräumen — Soft-Delete, Hard-Delete, Status-Übergänge, Cleanup-Jobs

**Quelle:** 175-CONTEXT.md D-02 #8. Keine fertige F-Nummer aus 174-FOLLOWUPS.md — eigenständige Grep-Recherche über Anime, Fansub-Gruppe, Fansub-Mitglied, Release-Version-Medien, Gruppenmedien, Beiträge/Projektbesetzung plus dedizierte Hintergrund-Cleanup-Jobs.
**Methode:** Für jede Domäne wurde der Handler → Repository-Pfad bis zur konkreten SQL-Anweisung gelesen, um Hard-Delete, Soft-Delete (`deleted_at`-Spalte, Datensatz bleibt) und Status-/Lifecycle-Übergang (kein eigener Soft-Delete, sondern Statusfeld-Wechsel) klar zu unterscheiden. Für zwei Löschen-Flächen (Mitglieder, Gruppenmedien-Logo/Banner) wurde zusätzlich geprüft, ob der Frontend-Aufrufer überhaupt noch existiert (toter Code vs. aktiv genutzter Pfad) — Ergebnis unten unter „Orphan-Fund".

Spalten gemäß D-03: (a) UI-Fläche, (b)/(c) Frontend-API/Backend-Handler, (d) Rechte-Aktion Anzeige vs. Durchsetzung, (e) Datenhaltung, (f) beobachtbares Verhalten.

---

## Übersicht aller gefundenen Löschen-/Aufräumen-Mechanismen

| # | Domäne | Endpunkt | Mechanismus | Tabelle/Spalte | D-04 |
|---|---|---|---|---|---|
| 1 | Anime | `DELETE /admin/anime/:id` | **Hard-Delete** + Kaskaden-Cleanup (Relationen, Titel, Genres, Tags, Medien, Dateisystem-Verzeichnis) | `anime` (Zeile entfernt) | legitim getrennt |
| 2 | Fansub-Gruppe | `DELETE /fansubs/:id` | **Hard-Delete** + expliziter Vorab-Cleanup historischer Mitglieder/Beiträge (RESTRICT-FKs) | `fansub_groups` (Zeile entfernt) | legitim getrennt |
| 3 | Fansub-Mitglied (aktiv genutzt) | `DELETE /admin/fansubs/:id/group-members/:memberId` | **Hard-Delete**, gruppenscoped Recht | `hist_fansub_group_members` (Zeile entfernt) | legitim getrennt |
| 4 | Fansub-Mitglied (Legacy, **unreferenziert**) | `DELETE /fansubs/:id/members/:memberId` | **Hard-Delete**, plattform-admin-only Recht | `fansub_members` (Zeile entfernt) | **Altlast — Orphan-Endpunkt, Kandidat für Entfernung** |
| 5 | Release-Version-Medien (Galerie-Relation) | `DELETE .../media/:mediaId` (Episode-Version-Editor) | **Soft-Delete** | `release_version_media.deleted_at` | Duplikat-Rest (siehe #6/#7) |
| 6 | Gruppenmedien-Galerie-Bild | `DELETE /admin/fansubs/:id/media/:mediaId` (numerischer `:kind`) | **Soft-Delete** | `fansub_group_media.deleted_at` | Duplikat-Rest (siehe #5) |
| 7 | Gruppen-Logo/-Banner-Slot | `DELETE /admin/fansubs/:id/media/:kind` (String-`:kind`, **dieselbe Route wie #6**) | **FK-Unassign** (kein Soft-Delete des Medien-Datensatzes) | `fansub_groups.logo_id`/`banner_id` → NULL | **Variante mit Duplikat-Risiko** (eine Route, zwei Löschsemantiken je Parametertyp) |
| 8 | Anime-Asset-Slots (Cover/Banner/Logo/Background/-Video) | `DELETE /admin/anime/:id/assets/{cover,banner,logo,background_video}` | **FK-Unassign**, gleiche Semantik wie #7 | `anime.cover_asset_id` u. ä. → NULL | Variante (gleiches Muster, andere Domäne — konsistent) |
| 9 | Beitrag/Projektbesetzung (nicht release-gebunden) | `DELETE /admin/fansubs/:id/anime/:animeId/contributions/:contributionId` | **Hard-Delete**, mit fachlicher Sperre für release-gebundene Zeilen (422) | `anime_contributions` (Zeile entfernt) | legitim getrennt |
| 10 | Release-Review-Inhalt nach Ablehnung+Frist | Hintergrundjob `ReleaseReviewCleanupService.RunOnce` | **Content-Scrub + Lifecycle-Status-Übergang** (kein Soft-Delete, sondern Statuswechsel `review_state='tombstoned'` + Inhalt geleert) | `release_version_notes`/`release_version_media_review_lifecycle`/`release_version_note_review_lifecycle` | legitim getrennt (Datenschutz/Retention-Zweck, nicht Nutzer-Löschen) |
| 11 | Theme-Segment-Render-Cache | `AdminContentRepository.DeleteThemeSegmentRenderCaches` + `invalidated_at`-Markierung | **Technischer Cache-Cleanup** (Hard-Delete von Cache-Zeilen, kein Fach-Datensatz) | `theme_segment_render_cache` | legitim getrennt (reine Technik, kein Fachinhalt) |

**11 Mechanismen über 9 Fachdomänen + 2 technische Cleanup-Jobs.** Reproduzierbar per `scripts/count-08-loeschen-aufraeumen.sh`.

---

## (a)-(e) je Domäne

### 1. Anime — Hard-Delete mit Kaskaden-Cleanup

- **(a) UI:** `DELETE`-Button in der Anime-Verwaltung (Anime-Liste/Edit-Seite), löst `deleteAdminAnime`/äquivalenten Aufruf aus.
- **(b)/(c):** `DELETE /admin/anime/:id` → `AdminContentHandler.DeleteAnime` — `backend/internal/handlers/admin_content_anime.go:223-249`, `requireAdmin` (plattform-admin-only) an Zeile 224.
- **(e):** `AdminContentRepository.DeleteAnime` — `backend/internal/repository/admin_content_anime_delete.go:15-81`. Innerhalb EINER Transaktion: Reusable-Segment-Library-Zeilen werden migriert (`preserveReusableSegmentLibraryRowsForAnimeDelete`, Zeile 38), `anime_relations`/`anime_titles`/`anime_genres`/`anime_tags`/`anime_media` werden gelöscht (`deleteAnimeAssociations`, Zeile 180-195 bzw. V2-Variante 197-264), verwaiste `media_assets`/`media_files`/`media_external` werden bereinigt (Zeile 234-317), ein Audit-Eintrag wird geschrieben (Zeile 55-61), danach **`DELETE FROM anime WHERE id = $1`** (Zeile 63) — echtes Hard-Delete, kein `deleted_at`. Anschließend entfernt `cleanupDeletedAnimeDir` (`admin_content_anime.go:253-263`) das Medienverzeichnis `media/anime/<id>/` vom Dateisystem mit Path-Traversal-Schutz.
- **(d):** Keine Capability-Differenzierung — ausschließlich plattform-admin-only, sowohl Anzeige (Button nur sichtbar im `PlatformAdminGate`-geschützten Admin-Bereich) als auch Durchsetzung (`requireAdmin` im Handler). Konsistent.

### 2. Fansub-Gruppe — Hard-Delete mit explizitem Vorab-Cleanup

- **(a) UI:** Löschen-Aktion auf der Fansub-Gruppen-Übersichtsseite `frontend/src/app/admin/fansubs/page.tsx:324,358` (`deleteFansubGroup(item.id)`), gesamte Seite hinter `<PlatformAdminGate>` (`page.tsx:812-814`).
- **(b)/(c):** `DELETE /fansubs/:id` → `FansubHandler.DeleteFansub` — `backend/internal/handlers/fansub_groups.go:379-409`, `requireAdmin` an Zeile 380.
- **(e):** `FansubRepository.DeleteGroup` — `backend/internal/repository/fansub_repository_groups.go:378-404`. Kommentar im Code (Zeile 385-386): „Historical members and contributions intentionally use RESTRICT FKs. Admin group deletion is the explicit cleanup boundary". Löscht zuerst `anime_contributions WHERE fansub_group_id = $1` (Zeile 387-389) und `hist_fansub_group_members WHERE fansub_group_id = $1` (Zeile 390-392), erst danach **`DELETE FROM fansub_groups WHERE id = $1`** (Zeile 394) — Hard-Delete.
- **(d):** Plattform-admin-only auf beiden Seiten (Anzeige: Seite hinter `PlatformAdminGate`; Durchsetzung: `requireAdmin`). Konsistent. Bemerkenswert: Die Fansub-EDIT-Seite selbst (`/admin/fansubs/[id]/edit`) ist dagegen auch für Gruppenleitungen ohne Plattform-Admin-Rechte erreichbar (`FansubEditAccessGate.tsx:105-119` prüft zusätzlich `getFansubGroupCapabilities`) — die GRUPPE SELBST löschen können aber nur Plattform-Admins, weil dieser Button nur auf der separaten Listen-Seite existiert, nicht auf der Edit-Seite. Keine Inkonsistenz, aber ein struktureller Unterschied, der bei einer Zusammenführung von Lösch-UIs beachtet werden muss.

### 3./4. Fansub-Mitglied — zwei parallele Lösch-Endpunkte, einer davon tot

- **(a) UI (aktiv genutzt):** Mitglieder-Tab der Fansub-Edit-Seite, `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts:378` (`await deleteGroupMember(fansubId, deleteTarget.id)`).
- **(b)/(c) (aktiv):** `DELETE /admin/fansubs/:id/group-members/:memberId` → `FansubHistGroupMembersHandler.DeleteHistGroupMember` — `backend/internal/handlers/fansub_hist_group_members_handler.go:363-401`. Rechte-Prüfung: `permissionSvc.CanForFansubGroup(..., permissions.ActionFansubGroupHistoricalMembersManage, fansubID)` (Zeile 375) — **gruppenscoped**, nicht plattform-admin-only.
- **(e) (aktiv):** `HistGroupMembersRepository.Delete` — `backend/internal/repository/hist_group_members_repository.go:423-432`. **`DELETE FROM hist_fansub_group_members WHERE id = $1 AND fansub_group_id = $2`** — Hard-Delete.
- **(a)-(c) (Legacy, D-04 „Orphan-Endpunkt"):** `DELETE /fansubs/:id/members/:memberId` → `FansubHandler.DeleteFansubMember` — `backend/internal/handlers/fansub_group_members.go:165-199`. Rechte-Prüfung: `requireAdmin` (Zeile 166) — **plattform-admin-only**, strenger als der aktive Pfad. Repository: `FansubRepository.DeleteMember`, `backend/internal/repository/fansub_repository_members.go:171-186`, `DELETE FROM fansub_members WHERE id = $1 AND fansub_group_id = $2` — ebenfalls Hard-Delete, aber auf der ALTEN `fansub_members`-Tabelle statt der heute genutzten `hist_fansub_group_members`-Tabelle.
- **Grep-Befund:** Kein Aufrufer für die Frontend-API-Funktion `deleteFansubMember` (`frontend/src/lib/api/fansubs-members.ts:122`) existiert in nicht-Test-Code (`grep -rln "deleteFansubMember(" frontend/src` liefert außerhalb von Tests nichts). Die Mitglieder-UI ruft ausschließlich `deleteGroupMember` (Zeile 321 derselben Datei) auf, welches auf die neuere `group-members`-Route zielt. **D-04: Der alte `/fansubs/:id/members/:memberId`-Endpunkt plus `fansub_members`-Hard-Delete-Pfad ist toter Code — kein Frontend-Einstieg mehr, abweichende (strengere) Rechte-Logik als der tatsächlich genutzte Pfad. Kandidat zur Entfernung in einer Folgephase (D-06: keine Parallelimplementierungen).**

### 5./6./7. Release-Version-Medien & Gruppenmedien — Soft-Delete-Duplikat-Rest plus Mehrdeutigkeits-Risiko

- **5. Release-Version-Medien-Relation (Soft-Delete):** UI: Episode-Version-Editor-Galerie, `deleteItem` in `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:363-380` → `deleteReleaseVersionMediaItem`. Backend: `AdminContentHandler.DeleteReleaseVersionMedia` (`backend/internal/handlers/admin_content_release_version_media_delete.go:15`) → `MediaRepository.SoftDeleteReleaseVersionMedia` — `backend/internal/repository/release_version_media_repository.go:374-392`: **`UPDATE release_version_media SET deleted_at = NOW(), deleted_by_user_id = ... WHERE id = $1 AND deleted_at IS NULL`** — echtes Soft-Delete, Zeile bleibt erhalten.
- **6. Gruppenmedien-Galerie-Bild (Soft-Delete, strukturell identisch zu #5):** UI: `handleDelete` in `frontend/src/app/admin/fansubs/[id]/edit/useGroupMediaReviewActions.ts:356-374`. Backend: `deleteFansubGroupMedia` innerhalb von `FansubHandler.DeleteFansubMedia` — `backend/internal/handlers/fansub_media_delete.go:71-128` (ausgelöst, wenn `:kind` als `int64`-`mediaID` parst, Zeile 28-31) → `MediaRepository.SoftDeleteFansubGroupMedia` — `backend/internal/repository/media_repository.go:1041-1062`: **`UPDATE fansub_group_media SET deleted_at = NOW(), deleted_by_user_id = ... WHERE group_id = $1 AND media_id = $2 AND deleted_at IS NULL`**. **D-04: #5 und #6 sind ein nahezu identisches Soft-Delete-Muster (gleiches SQL-Skelett: `deleted_at = NOW()` + `deleted_by_user_id`-Lookup + `AND deleted_at IS NULL`-Guard), aber zweimal unabhängig in zwei verschiedenen Repositories implementiert — Duplikat-Rest, Kandidat für einen gemeinsamen generischen Soft-Delete-Helper in einer Zusammenführungsphase.**
- **7. Gruppen-Logo/-Banner-Slot (FK-Unassign, GLEICHE ROUTE wie #6):** `DELETE /admin/fansubs/:id/media/:kind` verzweigt in `FansubHandler.DeleteFansubMedia` (`fansub_media_delete.go:17-69`) anhand des Typs von `:kind`: parst `:kind` NICHT als Zahl → `ClearFansubMedia` (Zeile 47-68) statt `SoftDeleteFansubGroupMedia`. `MediaRepository.ClearFansubMedia` — `backend/internal/repository/media_repository.go:408-...`: liest `logo_id`/`banner_id` aus `fansub_groups` (Zeile 421-428) und setzt die jeweilige Spalte auf `NULL` — der referenzierte `media_assets`-Datensatz selbst wird NICHT gelöscht, nur die Zuordnung aufgehoben. **D-04: Variante mit Duplikat-Risiko — dieselbe Route/derselbe Handler-Einstiegspunkt liefert je nach Parameterform eine fachlich komplett andere Löschsemantik (Soft-Delete eines Galerie-Eintrags vs. reines Entkoppeln eines Slots). Das ist für Aufrufer nicht aus dem Pfad erkennbar, nur aus dem Parametertyp — Verwechslungsgefahr bei künftigen Erweiterungen.**

### 8. Anime-Asset-Slots — dieselbe FK-Unassign-Variante wie #7, aber eigene Routen

- **(a)-(c):** Je ein eigener `DELETE`-Endpunkt pro Slot (`/admin/anime/:id/assets/cover`, `/banner`, `/logo`, `/background_video`) — `backend/cmd/server/admin_routes.go:67,69,71,73`, Handler z. B. `AdminContentHandler.DeleteAnimeCoverAsset` — `backend/internal/handlers/admin_content_anime_assets.go:95-120`.
- **(e):** `ClearCoverWithResult`/äquivalente Methoden setzen die jeweilige `anime.<slot>_asset_id`-Spalte auf `NULL`, danach `cleanupAnimeAssetDirs` (Zeile 119) für verwaiste Dateien. Gleiche Grundidee wie #7 (FK-Unassign statt Zeilen-Löschung), aber als vier getrennte Routen statt einer mehrdeutigen Route — **legitim getrennte Variante, kein Mehrdeutigkeits-Risiko wie bei #7**, weil hier der Slot im URL-Pfad statt im generischen `:kind`-Parameter codiert ist.

### 9. Beitrag/Projektbesetzung — Hard-Delete mit fachlicher Sperre

- **(a)-(c):** `DELETE /admin/fansubs/:id/anime/:animeId/contributions/:contributionId` → `FansubAnimeContributionsHandler.DeleteAnimeContribution` — `backend/internal/handlers/fansub_anime_contributions_delete_handler.go:21-89`. Rechte: `ActionFansubGroupMembersManage` (Zeile 45), gruppenscoped.
- **(e):** Wenn der Beitrag an eine `release_version_id` gebunden ist, wird gar nicht gelöscht, sondern ein `422` mit der Meldung „Release-Besetzungen können nur vollständig gespeichert werden." zurückgegeben (Zeile 65-68) — fachliche Sperre, kein technischer Fehler. Für nicht release-gebundene Beiträge ruft `ApplyProjectRosterMutation` (`Kind: ProjectRosterMutationDelete`) letztlich `deleteProjectRosterInTx` auf — `backend/internal/repository/anime_contributions_member_repository.go:11-37`: **`DELETE FROM anime_contributions WHERE id=$1 AND fansub_group_id=$2 AND anime_id=$3 AND release_version_id IS NULL`** — Hard-Delete mit derselben Bedingung noch einmal serverseitig abgesichert (defense-in-depth, nicht nur die vorab gelesene Prüfung).

### 10. Release-Review-Cleanup-Job — dedizierter Hintergrundprozess (kein Nutzer-Löschen)

- **Auslöser:** `ReleaseReviewCleanupService.RunOnce` — `backend/internal/services/release_review_cleanup.go:90-120`, verdrahtet in `backend/cmd/server/main.go:348` (Ticker-Intervall `ReleaseReviewCleanupInterval = 10 * time.Minute`, Zeile 15 derselben Datei). Retention: `ReleaseReviewCleanupProductionRetention = 90 * 24h` vs. `ReleaseReviewCleanupLocalRetention = 5h` je nach Deploy-Profil (`ReleaseReviewCleanupRetentionForProfile`, Zeile 81-88).
- **(e):** Für seit `cutoff` abgelehnte (`review_state = 'rejected'`) Release-Notizen/-Medien: `scrubExpiredReleaseReviewNotes`/`scrubExpiredReleaseReviewMedia` (`backend/internal/repository/release_review_cleanup_repository.go:74-134,137-...`) leeren den Inhalt (Titel/Text/Body auf NULL/leer, `status = 'deleted'`, `deleted_at = tombstonedAt`) und rufen danach `tombstoneReleaseReviewLifecycle` auf (Zeile 245-...), welches **`review_state = 'tombstoned'`** auf der jeweiligen Lifecycle-Tabelle setzt (`release_version_note_review_lifecycle`/`release_version_media_review_lifecycle`). Das ist explizit KEIN Soft-Delete im Sinne von #5/#6 (der zugrundeliegende Datensatz existiert weiter, nur inhaltlich geleert und mit Statuswechsel versehen) — ein dritter, eigenständiger Löschen/Aufräumen-Mechanismus mit Datenschutz-/Retention-Zweck statt Nutzer-Aktion.
- Physische Datei-Löschung läuft zusätzlich asynchron über eine Jobqueue (`ClaimNextFileDeleteJob`/`processFileDeleteJob`, `release_review_cleanup.go:103-163`), getrennt von der logischen Content-Scrub-Phase — zwei-Phasen-Cleanup (logisch sofort, physisch verzögert mit Retry).

### 11. Theme-Segment-Render-Cache — rein technischer Cleanup

- `backend/internal/repository/theme_segment_render_cache.go`: `invalidated_at`-Spalte markiert veraltete Cache-Einträge als ungültig (Zeile 37, 426 `MarkThemeSegmentRenderCacheStale`), zusätzlich existieren zwei echte `DELETE FROM theme_segment_render_cache`-Anweisungen (Zeile 105, 217 `DeleteThemeSegmentRenderCaches`) für das endgültige Entfernen überflüssiger Render-Cache-Zeilen bei Segment-Neuzuweisung. Kein Fachdatensatz, kein Nutzer-Löschen — reine Technik, **legitim getrennt** von den Domänen-Löschmechanismen oben.

---

## (f) Beobachtbares Verhalten — Stale-State-Muster (Bezug BUG-174-03)

BUG-174-03 (Phase 174, behoben) trat auf, weil die Release-Version-Medien-Galerie `storyItems` rendert, aber `deleteItem`/`patchItem`/`replaceItem` nur den parallelen `items`-State aktualisierten — gelöschte Medien blieben bis zum manuellen Neuladen sichtbar (`frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:516-526`, Fix-Kommentar nennt BUG-174-03 explizit).

**Gegenprobe an der strukturell ähnlichsten zweiten Soft-Delete-Fläche (Gruppenmedien-Galerie, Fund #6):** `handleDelete` in `useGroupMediaReviewActions.ts:356-374` ruft nach dem erfolgreichen `deleteFansubGroupMedia`-Aufruf **immer `await loadMedia()`** auf (Zeile 364) — ein vollständiger Neu-Fetch statt eines lokalen State-Patches. Das bedeutet: das in BUG-174-03 gefundene Stale-State-Muster (lokaler Patch vergisst eine zweite abgeleitete Ansicht) kann hier strukturell nicht auftreten, weil es gar keinen lokalen Patch-Pfad gibt, der vergessen werden könnte — jede Mutation (Review, Bulk-Review, Reorder, Delete) lädt die Liste komplett neu. **Negativbefund:** kein neuer Stale-State-Fund, aber auch kein Beleg, dass das Muster bewusst vermieden wurde — die beiden Hooks sind unabhängig gewachsen und haben zufällig unterschiedliche Architekturen (lokale Patches vs. Full-Reload).

Für die Anime-/Fansub-Gruppen-/Mitglieder-Hard-Deletes (#1-#4, #9) ist kein Stale-State-Risiko relevant, da harte Löschungen stets zu einer Listen-Neu-Abfrage oder Redirect führen (Zeile-für-Zeile nicht einzeln geprüft, da kein abgeleiteter Zweit-State wie `storyItems` existiert).

---

## Zusammenfassung (reproduzierbar per `scripts/count-08-loeschen-aufraeumen.sh`)

- **Fachdomänen mit eigenem Löschen-Mechanismus: 9** (Anime, Fansub-Gruppe, Fansub-Mitglied aktiv, Fansub-Mitglied Legacy, Release-Version-Medien, Gruppenmedien-Galerie, Gruppen-Logo/Banner, Anime-Asset-Slots, Beitrag/Projektbesetzung)
- **Dedizierte technische Cleanup-Jobs: 2** (Release-Review-Cleanup-Service, Theme-Segment-Render-Cache-Cleanup)
- **Hard-Delete-Mechanismen: 5** (Anime, Fansub-Gruppe, Fansub-Mitglied aktiv, Fansub-Mitglied Legacy, Beitrag)
- **Soft-Delete-Mechanismen (`deleted_at`-Spalte): 2** (Release-Version-Medien-Relation, Gruppenmedien-Galerie-Bild) — strukturelles Duplikat zweier unabhängiger Repository-Implementierungen desselben Musters
- **FK-Unassign-Mechanismen (kein Zeilen-Löschen): 2 Familien** (Gruppen-Logo/Banner via mehrdeutiger `:kind`-Route; Anime-Asset-Slots via vier eigenständige Routen)
- **Status-Übergang statt Soft-Delete: 1** (Release-Review-Lifecycle-Tombstone nach Ablehnungs-Retention)
- **Gefundene Orphan-Endpunkte (toter Code, kein Frontend-Aufrufer mehr): 1** (`DELETE /fansubs/:id/members/:memberId`)
- **Gefundene Mehrdeutigkeits-Risiken (eine Route, zwei Löschsemantiken): 1** (`DELETE /admin/fansubs/:id/media/:kind`)
