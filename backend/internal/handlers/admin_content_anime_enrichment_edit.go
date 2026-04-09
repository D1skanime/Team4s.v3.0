package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) LoadAnimeAniSearchEnrichment(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	var req models.AdminAnimeAniSearchEditRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	aniSearchID := strings.TrimSpace(req.AniSearchID)
	if aniSearchID == "" {
		badRequest(c, "anisearch_id ist erforderlich")
		return
	}

	sourceTag := "anisearch:" + aniSearchID
	if h.aniSearchRepo != nil {
		existing, err := h.aniSearchRepo.FindAnimeBySource(c.Request.Context(), sourceTag)
		if err != nil {
			log.Printf("admin_content anisearch_edit: duplicate lookup failed (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
			writeInternalErrorResponse(c, "interner serverfehler", err, "AniSearch-Daten konnten nicht geladen werden.")
			return
		}
		if existing != nil && existing.AnimeID != animeID {
			c.JSON(http.StatusConflict, gin.H{
				"data": models.AdminAnimeAniSearchEditConflictResult{
					Mode:            "conflict",
					AniSearchID:     aniSearchID,
					ExistingAnimeID: existing.AnimeID,
					ExistingTitle:   existing.Title,
					RedirectPath:    buildAdminAnimeEditPath(existing.AnimeID),
				},
			})
			return
		}
	}

	if h.enrichmentService == nil {
		writeInternalErrorResponse(c, "interner serverfehler", fmt.Errorf("anisearch draft loader unavailable"), "AniSearch-Daten konnten nicht geladen werden.")
		return
	}

	aniSearchDraft, relations, err := h.enrichmentService.LoadAniSearchDraft(c.Request.Context(), aniSearchID)
	if err != nil {
		log.Printf("admin_content anisearch_edit: enrichment load failed (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "AniSearch-Daten konnten nicht geladen werden.")
		return
	}

	nextDraft, updatedFields, skippedProtectedFields := mergeAniSearchEditDraft(req.Draft, aniSearchDraft, req.ProtectedFields, sourceTag)

	relationResult := models.AdminAnimeAniSearchEditSuccessResult{
		Mode:                   "draft",
		AniSearchID:            aniSearchID,
		Source:                 sourceTag,
		Draft:                  nextDraft,
		UpdatedFields:          updatedFields,
		SkippedProtectedFields: skippedProtectedFields,
	}

	if h.relationRepo != nil && len(relations) > 0 {
		applyResult, err := h.relationRepo.ApplyAdminAnimeEnrichmentRelationsDetailed(c.Request.Context(), animeID, relations)
		if err != nil {
			log.Printf("admin_content anisearch_edit: relation apply failed (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
			writeInternalErrorResponse(c, "interner serverfehler", err, "AniSearch-Relationen konnten nicht angewendet werden.")
			return
		}
		relationResult.AppliedRelations = append([]models.AdminAnimeRelation(nil), relations...)
		relationResult.RelationsApplied = int32(applyResult.Applied)
		relationResult.RelationsSkippedExisting = int32(applyResult.SkippedExisting)
	}

	c.JSON(http.StatusOK, gin.H{"data": relationResult})
}

func mergeAniSearchEditDraft(
	current models.AdminAnimeEditDraftPayload,
	incoming models.AdminAnimeCreateDraftPayload,
	protectedFields []string,
	sourceTag string,
) (models.AdminAnimeEditDraftPayload, []string, []string) {
	next := current
	updatedFields := make([]string, 0, 8)
	skippedProtectedFields := make([]string, 0, len(protectedFields))
	protected := make(map[string]struct{}, len(protectedFields))
	for _, field := range protectedFields {
		key := strings.TrimSpace(strings.ToLower(field))
		if key == "" {
			continue
		}
		protected[key] = struct{}{}
	}

	applyString := func(field string, currentValue **string, incomingValue *string) {
		if incomingValue == nil || strings.TrimSpace(*incomingValue) == "" {
			return
		}
		if _, ok := protected[field]; ok {
			skippedProtectedFields = appendUniqueFields(skippedProtectedFields, field)
			return
		}
		trimmed := strings.TrimSpace(*incomingValue)
		if *currentValue != nil && strings.TrimSpace(**currentValue) == trimmed {
			return
		}
		*currentValue = &trimmed
		updatedFields = appendUniqueFields(updatedFields, field)
	}

	applyString("title", &next.Title, stringPtrFromValue(incoming.Title))
	applyString("title_de", &next.TitleDE, incoming.TitleDE)
	applyString("title_en", &next.TitleEN, incoming.TitleEN)
	applyString("type", &next.Type, stringPtrFromValue(incoming.Type))
	applyString("content_type", &next.ContentType, stringPtrFromValue(incoming.ContentType))
	applyString("status", &next.Status, stringPtrFromValue(incoming.Status))
	applyString("genre", &next.Genre, incoming.Genre)
	applyString("description", &next.Description, incoming.Description)
	applyString("cover_image", &next.CoverImage, incoming.CoverImage)
	applyString("source", &next.Source, &sourceTag)
	applyString("folder_name", &next.FolderName, incoming.FolderName)

	if incoming.Year != nil {
		if _, ok := protected["year"]; ok {
			skippedProtectedFields = appendUniqueFields(skippedProtectedFields, "year")
		} else if next.Year == nil || *next.Year != *incoming.Year {
			next.Year = incoming.Year
			updatedFields = appendUniqueFields(updatedFields, "year")
		}
	}

	if incoming.MaxEpisodes != nil {
		if _, ok := protected["max_episodes"]; ok {
			skippedProtectedFields = appendUniqueFields(skippedProtectedFields, "max_episodes")
		} else if next.MaxEpisodes == nil || *next.MaxEpisodes != *incoming.MaxEpisodes {
			next.MaxEpisodes = incoming.MaxEpisodes
			updatedFields = appendUniqueFields(updatedFields, "max_episodes")
		}
	}

	if len(incoming.Tags) > 0 {
		if _, ok := protected["tags"]; ok {
			skippedProtectedFields = appendUniqueFields(skippedProtectedFields, "tags")
		} else if !equalStringSlices(next.Tags, incoming.Tags) {
			next.Tags = append([]string(nil), incoming.Tags...)
			updatedFields = appendUniqueFields(updatedFields, "tags")
		}
	}

	return next, updatedFields, skippedProtectedFields
}

func appendUniqueFields(target []string, values ...string) []string {
	seen := make(map[string]struct{}, len(target))
	for _, value := range target {
		seen[strings.TrimSpace(strings.ToLower(value))] = struct{}{}
	}
	for _, value := range values {
		key := strings.TrimSpace(strings.ToLower(value))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		target = append(target, value)
	}
	return target
}

func equalStringSlices(left []string, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for idx := range left {
		if strings.TrimSpace(left[idx]) != strings.TrimSpace(right[idx]) {
			return false
		}
	}
	return true
}

func buildAdminAnimeEditPath(animeID int64) string {
	return fmt.Sprintf("/admin/anime/%d/edit", animeID)
}

