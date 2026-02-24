package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type mergeFansubsRequest struct {
	TargetID  int64   `json:"target_id"`
	SourceIDs []int64 `json:"source_ids"`
}

type mergeFansubsPreviewRequest struct {
	TargetID  int64   `json:"target_id"`
	SourceIDs []int64 `json:"source_ids"`
}

func normalizeMergeSourceIDs(targetID int64, sourceIDs []int64) ([]int64, string) {
	unique := make([]int64, 0, len(sourceIDs))
	seen := make(map[int64]struct{}, len(sourceIDs))
	for _, sourceID := range sourceIDs {
		if sourceID <= 0 {
			return nil, "ungueltige source_id"
		}
		if sourceID == targetID {
			return nil, "zielgruppe darf nicht in quellgruppen enthalten sein"
		}
		if _, exists := seen[sourceID]; exists {
			continue
		}
		seen[sourceID] = struct{}{}
		unique = append(unique, sourceID)
	}
	if len(unique) == 0 {
		return nil, "source_ids darf nicht leer sein"
	}

	return unique, ""
}

// MergeFansubs merges multiple fansub groups into a target group.
// POST /api/v1/admin/fansubs/merge
func (h *FansubHandler) MergeFansubs(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req mergeFansubsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	// Validate request
	if req.TargetID <= 0 {
		badRequest(c, "target_id ist erforderlich")
		return
	}
	if len(req.SourceIDs) == 0 {
		badRequest(c, "source_ids darf nicht leer sein")
		return
	}
	normalizedSourceIDs, message := normalizeMergeSourceIDs(req.TargetID, req.SourceIDs)
	if message != "" {
		badRequest(c, message)
		return
	}
	req.SourceIDs = normalizedSourceIDs

	// Check target exists
	target, err := h.fansubRepo.GetGroupByID(c.Request.Context(), req.TargetID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"message": "zielgruppe nicht gefunden"},
		})
		return
	} else if err != nil {
		log.Printf("fansub merge: get target %d: %v", req.TargetID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner serverfehler"},
		})
		return
	}

	// Perform merge
	result, err := h.fansubRepo.MergeGroups(c.Request.Context(), req.TargetID, req.SourceIDs)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"message": "eine oder mehrere quellgruppen nicht gefunden"},
		})
		return
	} else if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"message": "zusammenfuehren fuehrt zu konflikt bei episode-versionen"},
		})
		return
	} else if err != nil {
		log.Printf("fansub merge: user=%d target=%d sources=%v error=%v", identity.UserID, req.TargetID, req.SourceIDs, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner serverfehler beim zusammenfuehren"},
		})
		return
	}

	log.Printf("fansub merge: user=%d merged %d groups into %q (target_id=%d), versions=%d, members=%d, relations=%d, aliases=%v",
		identity.UserID, result.MergedCount, target.Name, req.TargetID,
		result.VersionsMigrated, result.MembersMigrated, result.RelationsMigrated, result.AliasesAdded)

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// MergeFansubsPreview returns a preview of what would happen if groups were merged.
// POST /api/v1/admin/fansubs/merge/preview
func (h *FansubHandler) MergeFansubsPreview(c *gin.Context) {
	_, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req mergeFansubsPreviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	// Validate request
	if req.TargetID <= 0 {
		badRequest(c, "target_id ist erforderlich")
		return
	}
	if len(req.SourceIDs) == 0 {
		badRequest(c, "source_ids darf nicht leer sein")
		return
	}
	normalizedSourceIDs, message := normalizeMergeSourceIDs(req.TargetID, req.SourceIDs)
	if message != "" {
		badRequest(c, message)
		return
	}
	req.SourceIDs = normalizedSourceIDs

	result, err := h.fansubRepo.GetMergePreview(c.Request.Context(), req.TargetID, req.SourceIDs)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"message": "zielgruppe oder quellgruppe nicht gefunden"},
		})
		return
	} else if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"message": "zusammenfuehren fuehrt zu konflikt bei episode-versionen"},
		})
		return
	} else if err != nil {
		log.Printf("fansub merge preview: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner serverfehler"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}
