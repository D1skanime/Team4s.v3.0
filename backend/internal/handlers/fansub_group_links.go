package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *FansubHandler) ListFansubLinks(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	items, err := h.fansubRepo.ListGroupLinks(c.Request.Context(), fansubID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("fansub links list: repo error (fansub_id=%d): %v", fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *FansubHandler) CreateFansubLink(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req fansubGroupLinkCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub link create: bad request (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubGroupLinkCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.CreateGroupLink(c.Request.Context(), fansubID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "fansub-link bereits vorhanden"}})
		return
	}
	if err != nil {
		log.Printf("fansub link create: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

func (h *FansubHandler) UpdateFansubLink(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}
	linkID, err := parseFansubGroupLinkID(c.Param("linkId"))
	if err != nil {
		badRequest(c, "ungueltige link id")
		return
	}

	var req fansubGroupLinkPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub link update: bad request (user_id=%d, fansub_id=%d, link_id=%d): %v", identity.UserID, fansubID, linkID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubGroupLinkPatchRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.UpdateGroupLink(c.Request.Context(), fansubID, linkID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansub-link nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "fansub-link bereits vorhanden"}})
		return
	}
	if err != nil {
		log.Printf("fansub link update: repo error (user_id=%d, fansub_id=%d, link_id=%d): %v", identity.UserID, fansubID, linkID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}

func (h *FansubHandler) DeleteFansubLink(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}
	linkID, err := parseFansubGroupLinkID(c.Param("linkId"))
	if err != nil {
		badRequest(c, "ungueltige link id")
		return
	}

	if err := h.fansubRepo.DeleteGroupLink(c.Request.Context(), fansubID, linkID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansub-link nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("fansub link delete: repo error (user_id=%d, fansub_id=%d, link_id=%d): %v", identity.UserID, fansubID, linkID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.Status(http.StatusNoContent)
}

func validateFansubGroupLinkCreateRequest(req fansubGroupLinkCreateRequest) (models.FansubGroupLinkCreateInput, string) {
	linkType := normalizeRequiredString(&req.LinkType)
	if linkType == nil {
		return models.FansubGroupLinkCreateInput{}, "link_type ist erforderlich"
	}
	if _, ok := allowedFansubLinkTypes[*linkType]; !ok {
		return models.FansubGroupLinkCreateInput{}, "ungueltiger link_type parameter"
	}

	url := normalizeRequiredString(&req.URL)
	if url == nil || len([]rune(*url)) > 2048 {
		return models.FansubGroupLinkCreateInput{}, "ungueltiger url parameter"
	}

	name := normalizeNullableString(req.Name)
	if name != nil && len([]rune(*name)) > 120 {
		return models.FansubGroupLinkCreateInput{}, "name ist zu lang"
	}

	return models.FansubGroupLinkCreateInput{
		LinkType: models.FansubGroupLinkType(*linkType),
		Name:     name,
		URL:      *url,
	}, ""
}

func validateFansubGroupLinkPatchRequest(req fansubGroupLinkPatchRequest) (models.FansubGroupLinkPatchInput, string) {
	if !req.LinkType.Set && !req.Name.Set && !req.URL.Set {
		return models.FansubGroupLinkPatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.LinkType.Set {
		value := normalizeRequiredString(req.LinkType.Value)
		if value == nil {
			return models.FansubGroupLinkPatchInput{}, "ungueltiger link_type parameter"
		}
		if _, ok := allowedFansubLinkTypes[*value]; !ok {
			return models.FansubGroupLinkPatchInput{}, "ungueltiger link_type parameter"
		}
		req.LinkType.Value = value
	}
	if req.Name.Set {
		req.Name.Value = normalizeNullableString(req.Name.Value)
		if req.Name.Value != nil && len([]rune(*req.Name.Value)) > 120 {
			return models.FansubGroupLinkPatchInput{}, "name ist zu lang"
		}
	}
	if req.URL.Set {
		value := normalizeRequiredString(req.URL.Value)
		if value == nil || len([]rune(*value)) > 2048 {
			return models.FansubGroupLinkPatchInput{}, "ungueltiger url parameter"
		}
		trimmed := strings.TrimSpace(*value)
		req.URL.Value = &trimmed
	}

	return models.FansubGroupLinkPatchInput{
		LinkType: req.LinkType,
		Name:     req.Name,
		URL:      req.URL,
	}, ""
}
