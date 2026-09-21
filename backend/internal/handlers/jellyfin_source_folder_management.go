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
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

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
		actorAppUserID := identity.AppUserID
		actorLegacyUserID := identity.UserID
		var actorAppUserIDPtr, actorLegacyUserIDPtr *int64
		if actorAppUserID > 0 {
			actorAppUserIDPtr = &actorAppUserID
		}
		if actorLegacyUserID > 0 {
			actorLegacyUserIDPtr = &actorLegacyUserID
		}
		_ = h.auditLogRepo.Write(ctx, repository.AuditLogEntry{
			ActorAppUserID:    actorAppUserIDPtr,
			ActorLegacyUserID: actorLegacyUserIDPtr,
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
