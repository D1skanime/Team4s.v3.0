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

// connectJellyfinFolderAdditively decides how a successful "Verbinden" write reaches anime_source_links /
// anime.source: if animeSource.Source already carries a non-Jellyfin anisearch: reference and the caller
// explicitly targeted a Jellyfin series (explicitSeriesID != ""), the new folder is inserted additively via
// LinkAdditionalJellyfinSource -- anime.source is never touched. Otherwise it falls through to the existing,
// unmodified ApplyJellyfinSyncMetadata force-write path (same behavior as before this plan). D-16 (a
// renamed/moved folder reconnecting via a new Jellyfin item ID) needs no special-case branch here: it is the
// same additive insert as any other second folder.
func (h *AdminContentHandler) connectJellyfinFolderAdditively(
	ctx context.Context,
	identity middleware.AuthIdentity,
	animeID int64,
	animeSource *models.AdminAnimeSyncSource,
	preview models.AdminAnimeJellyfinMetadataPreviewResult,
	explicitSeriesID string,
) error {
	currentSource := strings.TrimSpace(derefString(animeSource.Source))
	newSourceTag := "jellyfin:" + strings.TrimSpace(preview.JellyfinSeriesID)
	additive := strings.HasPrefix(currentSource, "anisearch:") && strings.TrimSpace(explicitSeriesID) != ""

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

	if h.auditLogRepo != nil {
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

// RemoveAnimeJellyfinFolder handelt DELETE /admin/anime/:id/jellyfin/folders/:source (165-07, D-18).
// Entfernt einen nicht-Haupt-Jellyfin-Ordner additiv aus anime_source_links. Das Entfernen des
// Hauptordners (== animeSource.Source) wird serverseitig abgelehnt, bevor ueberhaupt eine DELETE-Query
// laeuft (RESEARCH.md §12: "ungeschuetzter DELETE wuerde die Zeile loeschen koennen, waehrend anime.source
// weiter auf die fehlende Referenz zeigt" -- kein reiner UI-Schutz).
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

	source := strings.TrimSpace(c.Param("source"))
	if source == "" {
		badRequest(c, "source ist erforderlich")
		return
	}

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

	if source == strings.TrimSpace(derefString(animeSource.Source)) {
		badRequest(c, "der haupt-jellyfin-ordner kann nicht entfernt werden")
		return
	}

	if err := h.folderManagementRepo.RemoveAnimeSourceLink(c.Request.Context(), animeID, source); err != nil {
		log.Printf("admin_content jellyfin_folder_remove: remove failed (anime_id=%d, source=%q): %v", animeID, source, err)
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
			Payload:           map[string]any{"source": source},
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "jellyfin-ordner entfernt."})
}
