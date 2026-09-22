package handlers

// Additive Jellyfin-Ordnerverwaltung (165-07, D-05/D-16/D-18/D-21).
//
// connectJellyfinFolderAdditively fixes RESEARCH.md Pitfall 3: "Verbinden" (ApplyAnimeMetadataFromJellyfin)
// must never force-overwrite an anime.source that already carries an anisearch: reference -- the new
// Jellyfin folder is written additively into anime_source_links instead. RemoveAnimeJellyfinFolder adds the
// missing DELETE path for non-main folders, guarded server-side against removing the main folder. Both
// mutations write an audit_logs entry (D-21).
//
// Kept in this sibling file rather than inline in jellyfin_metadata_resync.go, which is already 627 lines --
// over CLAUDE.md's 450-line limit -- before this change, mirroring 165-04's admin_episode_import_ownership.go
// discipline for admin_episode_import.go.

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// actorPointersFromIdentity converts an AuthIdentity into the *int64 pointer pair audit_logs
// writes expect, treating a zero/absent ID as "no actor" (nil) rather than writing a literal 0.
func actorPointersFromIdentity(identity middleware.AuthIdentity) (appUserID *int64, legacyUserID *int64) {
	if identity.AppUserID > 0 {
		value := identity.AppUserID
		appUserID = &value
	}
	if identity.UserID > 0 {
		value := identity.UserID
		legacyUserID = &value
	}
	return appUserID, legacyUserID
}

// connectJellyfinFolderAdditively decides how a successful "Verbinden"/metadata-apply write reaches
// anime_source_links / anime.source, driven SOLELY by the explicit connect signal (165-17, GAP-05/GAP-13
// fix): if the caller is an explicit "Verbinden" action (connect == true) AND the anime already carries
// ANY source (currentSource != ""), the new folder is inserted additively via LinkAdditionalJellyfinSource
// -- anime.source is never touched, regardless of which provider prefix currentSource carries. This
// replaces the previous, since-proven-wrong "anisearch:"-prefix-sniffing heuristic, which silently
// force-overwrote anime.source/folder_name whenever the anime's existing source happened to already be
// jellyfin:<A> -- the normal shape for anime originally created via Jellyfin preview/intake, i.e. the exact
// real-world case D-05 exists for (165-UAT.md GAP-05). When connect == false (the routine edit-page
// "Jellyfin-Metadaten anwenden" resync, the only OTHER caller of this function), the force-write path is
// always used and no audit entry is written (GAP-13) -- byte-identical to this function's pre-165-17
// behavior for that caller. If the additive branch's LinkAdditionalJellyfinSource call reports an ownership
// conflict (repository.ErrConflict, a DIFFERENT anime already owns the target source), that error is
// returned AS-IS without reaching the audit-write block (GAP-10) -- never a silent no-op success. D-16 (a
// renamed/moved folder reconnecting via a new Jellyfin item ID) needs no special-case branch here: it is the
// same additive insert as any other second folder.
func (h *AdminContentHandler) connectJellyfinFolderAdditively(
	ctx context.Context,
	identity middleware.AuthIdentity,
	animeID int64,
	animeSource *models.AdminAnimeSyncSource,
	preview models.AdminAnimeJellyfinMetadataPreviewResult,
	explicitSeriesID string,
	connect bool,
) error {
	currentSource := strings.TrimSpace(derefString(animeSource.Source))
	newSourceTag := "jellyfin:" + strings.TrimSpace(preview.JellyfinSeriesID)
	additive := connect && currentSource != ""

	if additive {
		if err := h.folderManagementRepo.LinkAdditionalJellyfinSource(ctx, animeID, newSourceTag); err != nil {
			return err
		}
	} else {
		if err := h.folderManagementRepo.ApplyJellyfinSyncMetadata(
			ctx,
			animeID,
			newSourceTag,
			preview.JellyfinSeriesPath,
			int16FromStringPtr(fieldIncomingValue(preview.Diff, "year")),
			fieldIncomingValue(preview.Diff, "description"),
			nil,
			explicitSeriesID != "",
		); err != nil {
			return err
		}
	}

	if connect && h.auditLogRepo != nil {
		appUserID, legacyUserID := actorPointersFromIdentity(identity)
		_ = h.auditLogRepo.Write(ctx, repository.AuditLogEntry{
			ActorAppUserID:    appUserID,
			ActorLegacyUserID: legacyUserID,
			EventType:         "jellyfin_discovery.connected",
			TargetType:        "anime",
			TargetID:          &animeID,
			Action:            "connect",
			Outcome:           "allowed",
			Payload:           map[string]any{"jellyfin_series_id": strings.TrimSpace(preview.JellyfinSeriesID), "additive": additive},
		})
	}

	return nil
}

// writeJellyfinFolderOwnershipConflict responds 409 for the GAP-10 ownership-conflict case (165-17): the
// additive LinkAdditionalJellyfinSource write reported that the target jellyfin:<id> source already
// belongs to a DIFFERENT anime (repository.ErrConflict from connectJellyfinFolderAdditively). Looks the
// actual owner up via FindAnimeBySource on the same source tag connectJellyfinFolderAdditively attempted
// to link, so the frontend can offer the same "Verbinden" decision for that owner. If the lookup itself
// fails or returns nil (rare race between the conflict and this follow-up read), falls back to the same
// 409 status with a generic message and no data field -- never silently downgrading to 500.
func writeJellyfinFolderOwnershipConflict(c *gin.Context, h *AdminContentHandler, preview models.AdminAnimeJellyfinMetadataPreviewResult) {
	const message = "dieser jellyfin-ordner ist bereits mit einem anderen anime verknüpft"
	const code = "jellyfin_folder_owned_by_other_anime"

	newSourceTag := "jellyfin:" + strings.TrimSpace(preview.JellyfinSeriesID)
	match, err := h.folderManagementRepo.FindAnimeBySource(c.Request.Context(), newSourceTag)
	if err != nil || match == nil {
		if err != nil {
			log.Printf("admin_content jellyfin_metadata_apply: ownership-conflict lookup failed (source=%q): %v", newSourceTag, err)
		}
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": message, "code": code}})
		return
	}

	c.JSON(http.StatusConflict, gin.H{
		"error": gin.H{"message": message, "code": code},
		"data": gin.H{
			"existing_anime_id": match.AnimeID,
			"existing_title":    match.Title,
		},
	})
}

// RemoveAnimeJellyfinFolder handelt DELETE /admin/anime/:id/jellyfin/folders/:source (165-07, D-18).
// Entfernt einen nicht-Haupt-Jellyfin-Ordner additiv aus anime_source_links. Das Entfernen des
// Hauptordners (== animeSource.Source) wird serverseitig abgelehnt, bevor ueberhaupt eine DELETE-Query
// laeuft (RESEARCH.md §12: "ungeschuetzter DELETE wuerde die Zeile loeschen koennen, waehrend anime.source
// weiter auf die fehlende Referenz zeigt" -- kein reiner UI-Schutz).
//
// :source traegt die UNPREFIXTE Jellyfin-Item-ID (z.B. "def"), nicht den vollstaendig praefixierten
// DB-Wert ("jellyfin:def"): collectJellyfinFolderOptions (jellyfin_source_folder_list.go) ist die
// EINZIGE Quelle, aus der das Frontend jemals eine Ordner-ID bekommt (GET .../jellyfin/context UND der
// Episode-Import-Ordner-Guard), und die strippt den "jellyfin:"-Praefix immer. Dieser Handler haengt den
// Praefix daher intern wieder an, bevor er gegen animeSource.Source vergleicht bzw. in
// anime_source_links.source loescht -- das Frontend soll den Praefix niemals selbst rekonstruieren
// muessen (165-VERIFICATION.md D-18-Blocker-Fund: das Auseinanderlaufen von Frontend-Konvention
// (unprefixed) und Backend-Erwartung (prefixed) fuehrte zu einem stillen No-Op-DELETE).
func (h *AdminContentHandler) RemoveAnimeJellyfinFolder(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	rawSource := strings.TrimSpace(c.Param("source"))
	if rawSource == "" {
		badRequest(c, "source ist erforderlich")
		return
	}
	prefixedSource := "jellyfin:" + rawSource

	animeSource, err := h.folderManagementRepo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content jellyfin_folder_remove: load anime failed (anime_id=%d): %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	if rawSource == extractJellyfinSourceID(animeSource.Source) {
		badRequest(c, "der haupt-jellyfin-ordner kann nicht entfernt werden")
		return
	}

	if err := h.folderManagementRepo.RemoveAnimeSourceLink(c.Request.Context(), animeID, prefixedSource); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "jellyfin-ordner wurde nicht gefunden"}})
			return
		}
		log.Printf("admin_content jellyfin_folder_remove: remove failed (anime_id=%d, source=%q): %v", animeID, prefixedSource, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "jellyfin-ordner konnte nicht entfernt werden"}})
		return
	}

	if h.auditLogRepo != nil {
		appUserID, legacyUserID := actorPointersFromIdentity(identity)
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    appUserID,
			ActorLegacyUserID: legacyUserID,
			EventType:         "jellyfin_discovery.folder_removed",
			TargetType:        "anime",
			TargetID:          &animeID,
			Action:            "remove_folder",
			Outcome:           "allowed",
			Payload:           map[string]any{"source": prefixedSource},
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "jellyfin-ordner entfernt."})
}
