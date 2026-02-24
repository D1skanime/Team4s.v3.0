package handlers

import (
	"errors"
	"log"
	"math"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type fansubGroupCreateRequest struct {
	Slug          string  `json:"slug"`
	Name          string  `json:"name"`
	Description   *string `json:"description"`
	History       *string `json:"history"`
	LogoURL       *string `json:"logo_url"`
	BannerURL     *string `json:"banner_url"`
	FoundedYear   *int32  `json:"founded_year"`
	DissolvedYear *int32  `json:"dissolved_year"`
	Status        string  `json:"status"`
	GroupType     *string `json:"group_type"`
	WebsiteURL    *string `json:"website_url"`
	DiscordURL    *string `json:"discord_url"`
	IrcURL        *string `json:"irc_url"`
	Country       *string `json:"country"`
}

type fansubMemberCreateRequest struct {
	Handle    string  `json:"handle"`
	Role      string  `json:"role"`
	SinceYear *int32  `json:"since_year"`
	UntilYear *int32  `json:"until_year"`
	Notes     *string `json:"notes"`
}

type fansubAliasCreateRequest struct {
	Alias string `json:"alias"`
}

type animeFansubAttachRequest struct {
	IsPrimary *bool   `json:"is_primary"`
	Notes     *string `json:"notes"`
}

func (h *FansubHandler) ListFansubs(c *gin.Context) {
	page, err := parsePositiveInt(c.DefaultQuery("page", "1"))
	if err != nil {
		badRequest(c, "ungueltiger page parameter")
		return
	}

	perPage, err := parsePositiveInt(c.DefaultQuery("per_page", "24"))
	if err != nil {
		badRequest(c, "ungueltiger per_page parameter")
		return
	}
	if perPage > 500 {
		perPage = 500
	}

	q := strings.TrimSpace(c.Query("q"))
	if len([]rune(q)) > 120 {
		badRequest(c, "ungueltiger q parameter")
		return
	}

	status := strings.TrimSpace(c.Query("status"))
	if status != "" {
		if _, ok := allowedFansubStatuses[status]; !ok {
			badRequest(c, "ungueltiger status parameter")
			return
		}
	}

	items, total, err := h.fansubRepo.ListGroups(c.Request.Context(), models.FansubFilter{
		Page:    page,
		PerPage: perPage,
		Q:       q,
		Status:  status,
	})
	if err != nil {
		log.Printf("fansub list: repo error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(perPage)))
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
		"meta": models.PaginationMeta{
			Total:      total,
			Page:       page,
			PerPage:    perPage,
			TotalPages: totalPages,
		},
	})
}

func (h *FansubHandler) CreateFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req fansubGroupCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub create: bad request (user_id=%d): %v", identity.UserID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubGroupCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.CreateGroup(c.Request.Context(), input)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "fansubgruppe bereits vorhanden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub create: repo error (user_id=%d): %v", identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

func (h *FansubHandler) GetFansubByID(c *gin.Context) {
	id, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	item, err := h.fansubRepo.GetGroupByID(c.Request.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub get: repo error (fansub_id=%d): %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

func (h *FansubHandler) GetFansubBySlug(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" || len([]rune(slug)) > 120 {
		badRequest(c, "ungueltiger fansub slug")
		return
	}

	item, err := h.fansubRepo.GetGroupBySlug(c.Request.Context(), slug)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub get by slug: repo error (slug=%q): %v", slug, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

func (h *FansubHandler) UpdateFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req models.FansubGroupPatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub update: bad request (user_id=%d, fansub_id=%d): %v", identity.UserID, id, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubGroupPatchRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.UpdateGroup(c.Request.Context(), id, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "fansubgruppe bereits vorhanden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub update: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

func (h *FansubHandler) DeleteFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	id, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	if err := h.fansubRepo.DeleteGroup(c.Request.Context(), id); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("fansub delete: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, id, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *FansubHandler) ListFansubAliases(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	items, err := h.fansubRepo.ListAliases(c.Request.Context(), fansubID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub alias list: repo error (fansub_id=%d): %v", fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
	})
}

func (h *FansubHandler) CreateFansubAlias(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req fansubAliasCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub alias create: bad request (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubAliasCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.CreateAlias(c.Request.Context(), fansubID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "alias bereits vorhanden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub alias create: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

func (h *FansubHandler) DeleteFansubAlias(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}
	aliasID, err := parseFansubAliasID(c.Param("aliasId"))
	if err != nil {
		badRequest(c, "ungueltige alias id")
		return
	}

	if err := h.fansubRepo.DeleteAlias(c.Request.Context(), fansubID, aliasID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "alias nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("fansub alias delete: repo error (user_id=%d, fansub_id=%d, alias_id=%d): %v", identity.UserID, fansubID, aliasID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *FansubHandler) ListFansubMembers(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	items, err := h.fansubRepo.ListMembers(c.Request.Context(), fansubID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub member list: repo error (fansub_id=%d): %v", fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
	})
}

func (h *FansubHandler) CreateFansubMember(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req fansubMemberCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("fansub member create: bad request (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubMemberCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.CreateMember(c.Request.Context(), fansubID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub member create: repo error (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

func (h *FansubHandler) UpdateFansubMember(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	memberID, err := parseFansubMemberID(c.Param("memberId"))
	if err != nil {
		badRequest(c, "ungueltige member id")
		return
	}

	var req models.FansubMemberPatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf(
			"fansub member update: bad request (user_id=%d, fansub_id=%d, member_id=%d): %v",
			identity.UserID,
			fansubID,
			memberID,
			err,
		)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateFansubMemberPatchRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.fansubRepo.UpdateMember(c.Request.Context(), fansubID, memberID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "mitglied nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf(
			"fansub member update: repo error (user_id=%d, fansub_id=%d, member_id=%d): %v",
			identity.UserID,
			fansubID,
			memberID,
			err,
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

func (h *FansubHandler) DeleteFansubMember(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	memberID, err := parseFansubMemberID(c.Param("memberId"))
	if err != nil {
		badRequest(c, "ungueltige member id")
		return
	}

	if err := h.fansubRepo.DeleteMember(c.Request.Context(), fansubID, memberID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "mitglied nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf(
			"fansub member delete: repo error (user_id=%d, fansub_id=%d, member_id=%d): %v",
			identity.UserID,
			fansubID,
			memberID,
			err,
		)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *FansubHandler) ListAnimeFansubs(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	items, err := h.fansubRepo.ListAnimeFansubs(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("anime fansub list: repo error (anime_id=%d): %v", animeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
	})
}

func (h *FansubHandler) AttachAnimeFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	fansubID, err := parseFansubID(c.Param("fansubId"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	var req animeFansubAttachRequest
	if body := readBodyForOptionalJSON(c); body != "" {
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("anime fansub attach: bad request (user_id=%d, anime_id=%d, fansub_id=%d): %v", identity.UserID, animeID, fansubID, err)
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	input := models.AnimeFansubAttachInput{
		IsPrimary: req.IsPrimary != nil && *req.IsPrimary,
		Notes:     normalizeNullableString(req.Notes),
	}

	item, err := h.fansubRepo.AttachAnimeFansub(c.Request.Context(), animeID, fansubID, input)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "verknuepfung bereits vorhanden",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "anime oder fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("anime fansub attach: repo error (user_id=%d, anime_id=%d, fansub_id=%d): %v", identity.UserID, animeID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": item,
	})
}

func (h *FansubHandler) DetachAnimeFansub(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	fansubID, err := parseFansubID(c.Param("fansubId"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	if err := h.fansubRepo.DetachAnimeFansub(c.Request.Context(), animeID, fansubID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "verknuepfung nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("anime fansub detach: repo error (user_id=%d, anime_id=%d, fansub_id=%d): %v", identity.UserID, animeID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}

func validateFansubGroupCreateRequest(req fansubGroupCreateRequest) (models.FansubGroupCreateInput, string) {
	slug := normalizeRequiredString(&req.Slug)
	if slug == nil || len([]rune(*slug)) > 120 {
		return models.FansubGroupCreateInput{}, "ungueltiger slug parameter"
	}

	name := normalizeRequiredString(&req.Name)
	if name == nil || len([]rune(*name)) > 120 {
		return models.FansubGroupCreateInput{}, "ungueltiger name parameter"
	}

	status := normalizeRequiredString(&req.Status)
	if status == nil {
		return models.FansubGroupCreateInput{}, "status ist erforderlich"
	}
	if _, ok := allowedFansubStatuses[*status]; !ok {
		return models.FansubGroupCreateInput{}, "ungueltiger status parameter"
	}

	groupType := models.FansubGroupTypeGroup
	if req.GroupType != nil {
		value := normalizeRequiredString(req.GroupType)
		if value == nil {
			return models.FansubGroupCreateInput{}, "ungueltiger group_type parameter"
		}

		parsedGroupType := models.FansubGroupType(*value)
		switch parsedGroupType {
		case models.FansubGroupTypeGroup, models.FansubGroupTypeCollaboration:
			groupType = parsedGroupType
		default:
			return models.FansubGroupCreateInput{}, "ungueltiger group_type parameter"
		}
	}

	if req.FoundedYear != nil && *req.FoundedYear <= 0 {
		return models.FansubGroupCreateInput{}, "ungueltiger founded_year parameter"
	}
	if req.DissolvedYear != nil && *req.DissolvedYear <= 0 {
		return models.FansubGroupCreateInput{}, "ungueltiger dissolved_year parameter"
	}
	if req.FoundedYear != nil && req.DissolvedYear != nil && *req.DissolvedYear < *req.FoundedYear {
		return models.FansubGroupCreateInput{}, "dissolved_year muss groesser oder gleich founded_year sein"
	}

	country := normalizeNullableString(req.Country)
	if country != nil && len([]rune(*country)) > 80 {
		return models.FansubGroupCreateInput{}, "country ist zu lang"
	}

	return models.FansubGroupCreateInput{
		Slug:          *slug,
		Name:          *name,
		Description:   normalizeNullableString(req.Description),
		History:       normalizeNullableString(req.History),
		LogoURL:       normalizeNullableString(req.LogoURL),
		BannerURL:     normalizeNullableString(req.BannerURL),
		FoundedYear:   req.FoundedYear,
		DissolvedYear: req.DissolvedYear,
		Status:        *status,
		GroupType:     groupType,
		WebsiteURL:    normalizeNullableString(req.WebsiteURL),
		DiscordURL:    normalizeNullableString(req.DiscordURL),
		IrcURL:        normalizeNullableString(req.IrcURL),
		Country:       country,
	}, ""
}

func validateFansubGroupPatchRequest(req models.FansubGroupPatchInput) (models.FansubGroupPatchInput, string) {
	if !hasAnyFansubGroupPatchField(req) {
		return models.FansubGroupPatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.Slug.Set {
		value := normalizeRequiredString(req.Slug.Value)
		if value == nil || len([]rune(*value)) > 120 {
			return models.FansubGroupPatchInput{}, "ungueltiger slug parameter"
		}
		req.Slug.Value = value
	}
	if req.Name.Set {
		value := normalizeRequiredString(req.Name.Value)
		if value == nil || len([]rune(*value)) > 120 {
			return models.FansubGroupPatchInput{}, "ungueltiger name parameter"
		}
		req.Name.Value = value
	}
	if req.Status.Set {
		value := normalizeRequiredString(req.Status.Value)
		if value == nil {
			return models.FansubGroupPatchInput{}, "ungueltiger status parameter"
		}
		if _, ok := allowedFansubStatuses[*value]; !ok {
			return models.FansubGroupPatchInput{}, "ungueltiger status parameter"
		}
		req.Status.Value = value
	}
	if req.GroupType.Set {
		value := normalizeRequiredString(req.GroupType.Value)
		if value == nil {
			return models.FansubGroupPatchInput{}, "ungueltiger group_type parameter"
		}

		parsedGroupType := models.FansubGroupType(*value)
		switch parsedGroupType {
		case models.FansubGroupTypeGroup, models.FansubGroupTypeCollaboration:
			normalizedGroupType := string(parsedGroupType)
			req.GroupType.Value = &normalizedGroupType
		default:
			return models.FansubGroupPatchInput{}, "ungueltiger group_type parameter"
		}
	}
	if req.FoundedYear.Set && req.FoundedYear.Value != nil && *req.FoundedYear.Value <= 0 {
		return models.FansubGroupPatchInput{}, "ungueltiger founded_year parameter"
	}
	if req.DissolvedYear.Set && req.DissolvedYear.Value != nil && *req.DissolvedYear.Value <= 0 {
		return models.FansubGroupPatchInput{}, "ungueltiger dissolved_year parameter"
	}
	if req.FoundedYear.Set && req.DissolvedYear.Set && req.FoundedYear.Value != nil && req.DissolvedYear.Value != nil {
		if *req.DissolvedYear.Value < *req.FoundedYear.Value {
			return models.FansubGroupPatchInput{}, "dissolved_year muss groesser oder gleich founded_year sein"
		}
	}

	if req.Description.Set {
		req.Description.Value = normalizeNullableString(req.Description.Value)
	}
	if req.History.Set {
		req.History.Value = normalizeNullableString(req.History.Value)
	}
	if req.LogoURL.Set {
		req.LogoURL.Value = normalizeNullableString(req.LogoURL.Value)
	}
	if req.BannerURL.Set {
		req.BannerURL.Value = normalizeNullableString(req.BannerURL.Value)
	}
	if req.WebsiteURL.Set {
		req.WebsiteURL.Value = normalizeNullableString(req.WebsiteURL.Value)
	}
	if req.DiscordURL.Set {
		req.DiscordURL.Value = normalizeNullableString(req.DiscordURL.Value)
	}
	if req.IrcURL.Set {
		req.IrcURL.Value = normalizeNullableString(req.IrcURL.Value)
	}
	if req.Country.Set {
		req.Country.Value = normalizeNullableString(req.Country.Value)
		if req.Country.Value != nil && len([]rune(*req.Country.Value)) > 80 {
			return models.FansubGroupPatchInput{}, "country ist zu lang"
		}
	}

	return req, ""
}

func hasAnyFansubGroupPatchField(req models.FansubGroupPatchInput) bool {
	return req.Slug.Set ||
		req.Name.Set ||
		req.Description.Set ||
		req.History.Set ||
		req.LogoURL.Set ||
		req.BannerURL.Set ||
		req.FoundedYear.Set ||
		req.DissolvedYear.Set ||
		req.Status.Set ||
		req.GroupType.Set ||
		req.WebsiteURL.Set ||
		req.DiscordURL.Set ||
		req.IrcURL.Set ||
		req.Country.Set
}

func validateFansubMemberCreateRequest(req fansubMemberCreateRequest) (models.FansubMemberCreateInput, string) {
	handle := normalizeRequiredString(&req.Handle)
	if handle == nil || len([]rune(*handle)) > 120 {
		return models.FansubMemberCreateInput{}, "ungueltiger handle parameter"
	}

	role := normalizeRequiredString(&req.Role)
	if role == nil || len([]rune(*role)) > 60 {
		return models.FansubMemberCreateInput{}, "ungueltiger role parameter"
	}

	if req.SinceYear != nil && *req.SinceYear <= 0 {
		return models.FansubMemberCreateInput{}, "ungueltiger since_year parameter"
	}
	if req.UntilYear != nil && *req.UntilYear <= 0 {
		return models.FansubMemberCreateInput{}, "ungueltiger until_year parameter"
	}
	if req.SinceYear != nil && req.UntilYear != nil && *req.UntilYear < *req.SinceYear {
		return models.FansubMemberCreateInput{}, "until_year muss groesser oder gleich since_year sein"
	}

	return models.FansubMemberCreateInput{
		Handle:    *handle,
		Role:      *role,
		SinceYear: req.SinceYear,
		UntilYear: req.UntilYear,
		Notes:     normalizeNullableString(req.Notes),
	}, ""
}

func validateFansubAliasCreateRequest(req fansubAliasCreateRequest) (models.FansubAliasCreateInput, string) {
	alias := normalizeRequiredString(&req.Alias)
	if alias == nil || len([]rune(*alias)) > 120 {
		return models.FansubAliasCreateInput{}, "ungueltiger alias parameter"
	}

	normalizedAlias := normalizeFansubAliasKey(*alias)
	if normalizedAlias == "" {
		return models.FansubAliasCreateInput{}, "ungueltiger alias parameter"
	}

	return models.FansubAliasCreateInput{
		Alias:           *alias,
		NormalizedAlias: normalizedAlias,
	}, ""
}

func validateFansubMemberPatchRequest(req models.FansubMemberPatchInput) (models.FansubMemberPatchInput, string) {
	if !req.Handle.Set && !req.Role.Set && !req.SinceYear.Set && !req.UntilYear.Set && !req.Notes.Set {
		return models.FansubMemberPatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.Handle.Set {
		value := normalizeRequiredString(req.Handle.Value)
		if value == nil || len([]rune(*value)) > 120 {
			return models.FansubMemberPatchInput{}, "ungueltiger handle parameter"
		}
		req.Handle.Value = value
	}
	if req.Role.Set {
		value := normalizeRequiredString(req.Role.Value)
		if value == nil || len([]rune(*value)) > 60 {
			return models.FansubMemberPatchInput{}, "ungueltiger role parameter"
		}
		req.Role.Value = value
	}
	if req.SinceYear.Set && req.SinceYear.Value != nil && *req.SinceYear.Value <= 0 {
		return models.FansubMemberPatchInput{}, "ungueltiger since_year parameter"
	}
	if req.UntilYear.Set && req.UntilYear.Value != nil && *req.UntilYear.Value <= 0 {
		return models.FansubMemberPatchInput{}, "ungueltiger until_year parameter"
	}
	if req.SinceYear.Set && req.UntilYear.Set && req.SinceYear.Value != nil && req.UntilYear.Value != nil {
		if *req.UntilYear.Value < *req.SinceYear.Value {
			return models.FansubMemberPatchInput{}, "until_year muss groesser oder gleich since_year sein"
		}
	}
	if req.Notes.Set {
		req.Notes.Value = normalizeNullableString(req.Notes.Value)
	}

	return req, ""
}
