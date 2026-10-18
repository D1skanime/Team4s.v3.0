package handlers

// LinkAnimeAniSearchSource (quick-261018-l5r Task 1) ist das fehlende Gegenstück zu
// connectJellyfinFolderAdditively (165-07, jellyfin_source_folder_management.go): "Verknüpfen"
// einer AniSearch-ID darf eine bestehende anime.source (z. B. jellyfin:<id>, der Fall bei Anime
// 12/13) NIEMALS force-überschreiben. Root-Cause-Analyse: .planning/debug/
// anisearch-link-missing-on-create.md -- die Anime-Bearbeitung hatte seit 2026-04-24 keine
// AniSearch-Funktion mehr; eine Verknüpfung konnte bisher nur VOR dem erstmaligen Speichern über
// den Create-Flow hergestellt werden.

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// adminAnimeAniSearchLinkRequest ist der Request-Body für POST /admin/anime/:id/anisearch/link.
type adminAnimeAniSearchLinkRequest struct {
	AniSearchID string `json:"anisearch_id"`
}

// LinkAnimeAniSearchSource verarbeitet POST /api/v1/admin/anime/:id/anisearch/link. Verknüpft
// additiv eine AniSearch-ID mit einem bestehenden Anime -- schreibt ausschließlich
// anime_source_links (anisearch:<id>) und, falls vorhanden, die Spalte anime.anisearch_id; rührt
// anime.source und keine manuell gepflegten Felder an. Konflikt-sicher: eine anderweitig bereits
// vergebene AniSearch-ID liefert 409 mit dem Namen des anderen Anime, sowohl beim Pre-Check als
// auch im Race-Fallback (nie 500).
func (h *AdminContentHandler) LinkAnimeAniSearchSource(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	var req adminAnimeAniSearchLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	aniSearchID := strings.TrimSpace(req.AniSearchID)
	if aniSearchID == "" {
		badRequest(c, "anisearch_id ist erforderlich")
		return
	}

	sourceTag := "anisearch:" + aniSearchID

	if h.aniSearchRepo != nil {
		existing, lookupErr := h.aniSearchRepo.FindAnimeBySource(c.Request.Context(), sourceTag)
		if lookupErr != nil {
			log.Printf("admin_content anisearch_link: pre-check lookup failed (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, lookupErr)
			writeInternalErrorResponse(c, "interner serverfehler", lookupErr, "AniSearch-Verknüpfung konnte nicht geprüft werden.")
			return
		}
		if existing != nil && existing.AnimeID != animeID {
			writeAniSearchLinkOwnershipConflict(c, aniSearchID, existing)
			return
		}
	}

	if h.animeAniSearchLinkRepo == nil {
		writeInternalErrorResponse(c, "interner serverfehler", errors.New("anisearch link repo unavailable"), "AniSearch-Verknüpfung konnte nicht gespeichert werden.")
		return
	}

	if err := h.animeAniSearchLinkRepo.LinkAniSearchSource(c.Request.Context(), animeID, aniSearchID); err != nil {
		if errors.Is(err, repository.ErrConflict) {
			h.writeAniSearchLinkRaceConflict(c, animeID, aniSearchID, sourceTag)
			return
		}
		log.Printf("admin_content anisearch_link: repo error (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "AniSearch-Verknüpfung konnte nicht gespeichert werden.")
		return
	}

	if h.auditLogRepo != nil {
		appUserID, legacyUserID := actorPointersFromIdentity(identity)
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    appUserID,
			ActorLegacyUserID: legacyUserID,
			EventType:         "anisearch.linked",
			TargetType:        "anime",
			TargetID:          &animeID,
			Action:            "link",
			Outcome:           "allowed",
			Payload:           map[string]any{"anisearch_id": aniSearchID},
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": models.AdminAnimeAniSearchLinkResult{
		Mode:        "linked",
		AniSearchID: aniSearchID,
		Source:      sourceTag,
	}})
}

// writeAniSearchLinkOwnershipConflict antwortet 409, wenn der Pre-Check bereits einen anderen
// Anime als Besitzer der anisearch:<id>-Quelle findet. Wiederverwendet
// models.AdminAnimeAniSearchEditConflictResult (dieselbe Form, die der bereits vorhandene
// Frontend-Parser parseAniSearchEditConflictPayload liest).
func writeAniSearchLinkOwnershipConflict(c *gin.Context, aniSearchID string, existing *models.AdminAnimeSourceMatch) {
	c.JSON(http.StatusConflict, gin.H{
		"data": models.AdminAnimeAniSearchEditConflictResult{
			Mode:            "conflict",
			AniSearchID:     aniSearchID,
			ExistingAnimeID: existing.AnimeID,
			ExistingTitle:   existing.Title,
			RedirectPath:    buildAdminAnimeEditPath(existing.AnimeID),
		},
	})
}

// writeAniSearchLinkRaceConflict antwortet 409, wenn das Repo selbst repository.ErrConflict
// meldet (Race zwischen Pre-Check und Insert) -- analog writeJellyfinFolderOwnershipConflict
// (jellyfin_source_folder_management.go). Schlägt der Nachschlage-Lookup fehl, liefert nichts,
// oder zeigt (durch die Race) inzwischen denselben Anime als Besitzer, wird trotzdem 409 mit
// generischer Meldung geliefert -- nie 500, nie ein stiller 200-Erfolg.
func (h *AdminContentHandler) writeAniSearchLinkRaceConflict(c *gin.Context, animeID int64, aniSearchID string, sourceTag string) {
	const message = "diese anisearch-id ist bereits mit einem anderen anime verknüpft"

	if h.aniSearchRepo == nil {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": message}})
		return
	}

	match, err := h.aniSearchRepo.FindAnimeBySource(c.Request.Context(), sourceTag)
	if err != nil {
		log.Printf("admin_content anisearch_link: race-conflict lookup failed (source=%q): %v", sourceTag, err)
	}
	if err != nil || match == nil || match.AnimeID == animeID {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": message}})
		return
	}

	writeAniSearchLinkOwnershipConflict(c, aniSearchID, match)
}
