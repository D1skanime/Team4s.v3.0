package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type releaseReviewQueryRepository interface {
	List(context.Context, repository.ReleaseReviewQueueOptions) (*repository.ReleaseReviewQueuePage, error)
	Counts(context.Context, repository.ReleaseReviewQueueOptions) (*repository.ReleaseReviewQueueCounts, error)
	Detail(context.Context, int64, string, []string) (*repository.ReleaseReviewDetail, error)
	Next(context.Context, int64, string, []string) (*repository.ReleaseReviewQueueItem, error)
}

type releaseReviewPermissionService interface {
	CanReviewForFansubGroup(
		context.Context,
		permissions.Actor,
		permissions.Action,
		int64,
	) (permissions.ReviewAuthorizationResult, error)
	CanForReleaseVersion(
		context.Context,
		permissions.Actor,
		permissions.Action,
		int64,
	) (permissions.Result, error)
}

type releaseReviewDecisionService interface {
	Decide(context.Context, services.ReviewDecisionCommand) (*repository.ReviewDecisionRow, error)
}

type ReleaseReviewHandler struct {
	query       releaseReviewQueryRepository
	permissions releaseReviewPermissionService
	decisions   releaseReviewDecisionService
}

func NewReleaseReviewHandler(
	query releaseReviewQueryRepository,
	permissionService releaseReviewPermissionService,
	decisionService releaseReviewDecisionService,
) *ReleaseReviewHandler {
	return &ReleaseReviewHandler{
		query: query, permissions: permissionService, decisions: decisionService,
	}
}

func (h *ReleaseReviewHandler) List(c *gin.Context) {
	_, actor, groupID, ok := h.requestContext(c)
	if !ok {
		return
	}
	options, ok := h.queueOptions(c, actor, groupID)
	if !ok {
		return
	}
	page, err := h.query.List(c.Request.Context(), options)
	if err != nil {
		h.writeReadError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": page})
}

func (h *ReleaseReviewHandler) Counts(c *gin.Context) {
	_, actor, groupID, ok := h.requestContext(c)
	if !ok {
		return
	}
	options, ok := h.queueOptions(c, actor, groupID)
	if !ok {
		return
	}
	counts, err := h.query.Counts(c.Request.Context(), options)
	if err != nil {
		h.writeReadError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": counts})
}

func (h *ReleaseReviewHandler) Detail(c *gin.Context) {
	_, actor, groupID, ok := h.requestContext(c)
	if !ok {
		return
	}
	allowedKinds, ok := h.authorizedKinds(c, actor, groupID, "")
	if !ok {
		return
	}
	detail, err := h.query.Detail(
		c.Request.Context(), groupID, c.Param("reviewId"), allowedKinds,
	)
	if err != nil {
		h.writeReadError(c, err)
		return
	}
	editAction := permissions.ActionReleaseVersionMediaUpdate
	if detail.ReviewKind == repository.ReviewKindText {
		editAction = permissions.ActionReleaseVersionNotesWrite
	}
	editPermission, err := h.permissions.CanForReleaseVersion(
		c.Request.Context(), actor, editAction, detail.ReleaseVersionID,
	)
	if err != nil {
		writePermissionInternalError(c, err, "Release-Berechtigung konnte nicht geprüft werden.")
		return
	}
	detail.CanEditRelease = editPermission.Allowed
	c.JSON(http.StatusOK, gin.H{"data": detail})
}

func (h *ReleaseReviewHandler) Next(c *gin.Context) {
	_, actor, groupID, ok := h.requestContext(c)
	if !ok {
		return
	}
	allowedKinds, ok := h.authorizedKinds(c, actor, groupID, "")
	if !ok {
		return
	}
	next, err := h.query.Next(
		c.Request.Context(), groupID, c.Param("reviewId"), allowedKinds,
	)
	if err == nil && next == nil {
		c.JSON(http.StatusOK, gin.H{"data": nil})
		return
	}
	if err != nil {
		h.writeReadError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": next})
}

type releaseReviewDecisionRequest struct {
	Decision          string `json:"decision"`
	RejectionCategory string `json:"rejection_category,omitempty"`
	RejectionReason   string `json:"rejection_reason,omitempty"`
	OverrideReason    string `json:"override_reason,omitempty"`
	ExpectedRevision  int64  `json:"expected_revision"`
}

func (h *ReleaseReviewHandler) Decide(c *gin.Context) {
	_, actor, groupID, ok := h.requestContext(c)
	if !ok {
		return
	}
	if h.decisions == nil {
		writeInternalErrorResponse(c, "interner serverfehler", errors.New("release review service missing"), "")
		return
	}
	allowedKinds, ok := h.authorizedKinds(c, actor, groupID, "")
	if !ok {
		return
	}
	var request releaseReviewDecisionRequest
	if err := decodeStrictReleaseReviewJSON(c, &request); err != nil {
		c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "Ungültiger Request-Body."))
		return
	}
	if err := validateReleaseReviewDecisionRequest(request, actor.IsPlatformAdmin); err != nil {
		c.JSON(http.StatusUnprocessableEntity, reviewError("REVIEW_VALIDATION_FAILED", err.Error()))
		return
	}
	detail, err := h.query.Detail(
		c.Request.Context(), groupID, c.Param("reviewId"), allowedKinds,
	)
	if err != nil {
		h.writeReadError(c, err)
		return
	}
	if detail.SourceRevision != request.ExpectedRevision {
		c.JSON(http.StatusConflict, reviewError(
			"REVIEW_ALREADY_DECIDED",
			"Diese Prüfung wurde bereits geändert oder von einer anderen Person entschieden.",
		))
		return
	}
	sourceType, sourceID, err := repository.DecodeReleaseReviewID(c.Param("reviewId"))
	if err != nil {
		h.writeReadError(c, err)
		return
	}
	decision := services.ReviewDecision(request.Decision)
	result, err := h.decisions.Decide(c.Request.Context(), services.ReviewDecisionCommand{
		Actor: actor,
		Target: services.ReviewTargetRef{
			SourceType: sourceType,
			StableKey:  strconv.FormatInt(sourceID, 10),
		},
		Decision:           decision,
		RejectionCategory:  repository.ReviewRejectionCategory(request.RejectionCategory),
		RejectReason:       strings.TrimSpace(request.RejectionReason),
		SelfReviewOverride: strings.TrimSpace(request.OverrideReason) != "",
		OverrideReason:     strings.TrimSpace(request.OverrideReason),
	})
	if err != nil {
		h.writeDecisionError(c, err)
		return
	}
	next, nextErr := h.query.Next(
		c.Request.Context(), groupID, c.Param("reviewId"), allowedKinds,
	)
	if nextErr != nil && !errors.Is(nextErr, repository.ErrNotFound) {
		next = nil
	}
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"review_id": c.Param("reviewId"),
			"decision":  result.Decision,
			"next":      next,
		},
	})
}

func (h *ReleaseReviewHandler) requestContext(
	c *gin.Context,
) (identity middleware.AuthIdentity, actor permissions.Actor, groupID int64, ok bool) {
	identity, actor, ok = permissionActorFromContext(c)
	if !ok {
		return identity, actor, 0, false
	}
	groupID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || groupID <= 0 {
		badRequest(c, "Ungültige Fansub-ID.")
		return identity, actor, 0, false
	}
	if h == nil || h.query == nil || h.permissions == nil {
		writeInternalErrorResponse(c, "interner serverfehler", errors.New("release review handler unavailable"), "")
		return identity, actor, 0, false
	}
	return identity, actor, groupID, true
}

func (h *ReleaseReviewHandler) queueOptions(
	c *gin.Context,
	actor permissions.Actor,
	groupID int64,
) (repository.ReleaseReviewQueueOptions, bool) {
	kind := strings.TrimSpace(c.Query("type"))
	if kind != "" && kind != string(repository.ReviewKindText) && kind != string(repository.ReviewKindImage) {
		c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "Ungültiger Prüfungsfilter."))
		return repository.ReleaseReviewQueueOptions{}, false
	}
	allowedKinds, ok := h.authorizedKinds(c, actor, groupID, kind)
	if !ok {
		return repository.ReleaseReviewQueueOptions{}, false
	}
	animeID, valid := optionalPositiveInt64(c.Query("anime_id"))
	if !valid {
		c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "Ungültiger Anime-Filter."))
		return repository.ReleaseReviewQueueOptions{}, false
	}
	releaseVersionID, valid := optionalPositiveInt64(c.Query("release_version_id"))
	if !valid {
		c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "Ungültiger Release-Filter."))
		return repository.ReleaseReviewQueueOptions{}, false
	}
	limit := 0
	if value := strings.TrimSpace(c.Query("limit")); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed <= 0 {
			c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "Ungültiges Seitenlimit."))
			return repository.ReleaseReviewQueueOptions{}, false
		}
		limit = parsed
	}
	options := repository.ReleaseReviewQueueOptions{
		Scope: repository.ReleaseReviewQueueScope{
			FansubGroupID: groupID, View: c.Query("view"),
			AnimeID: animeID, ReleaseVersionID: releaseVersionID,
			ReviewKind: kind, Category: c.Query("category"), Search: c.Query("search"),
		},
		AllowedKinds: allowedKinds, Cursor: c.Query("cursor"),
		Limit: repository.NormalizeReleaseReviewQueueLimit(limit),
	}
	if err := repository.ValidateReleaseReviewQueueOptions(options); err != nil {
		c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "Ungültige Filter- oder Cursor-Angabe."))
		return repository.ReleaseReviewQueueOptions{}, false
	}
	return options, true
}

func (h *ReleaseReviewHandler) authorizedKinds(
	c *gin.Context,
	actor permissions.Actor,
	groupID int64,
	requested string,
) ([]string, bool) {
	actions := []struct {
		action permissions.Action
		kind   string
	}{
		{permissions.ActionReviewTextDecide, string(repository.ReviewKindText)},
		{permissions.ActionReviewImageDecide, string(repository.ReviewKindImage)},
	}
	allowed := make([]string, 0, len(actions))
	var denied permissions.Result
	for _, candidate := range actions {
		result, err := h.permissions.CanReviewForFansubGroup(
			c.Request.Context(), actor, candidate.action, groupID,
		)
		if err != nil {
			writePermissionInternalError(c, err, "Review-Berechtigung konnte nicht geprüft werden.")
			return nil, false
		}
		if result.Allowed {
			if requested == "" || requested == candidate.kind {
				allowed = append(allowed, candidate.kind)
			}
		} else {
			denied = result.Result
		}
	}
	if len(allowed) == 0 {
		if denied.ReasonCode == "" {
			denied = permissions.Result{ReasonCode: permissions.ReasonInsufficientRole}
		}
		writePermissionDenied(c, denied)
		return nil, false
	}
	return allowed, true
}

func (h *ReleaseReviewHandler) writeReadError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrValidation):
		c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "Ungültige Prüfungsanfrage."))
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, reviewError("REVIEW_NOT_FOUND", "Prüfung nicht gefunden."))
	default:
		writeInternalErrorResponse(c, "interner serverfehler", err, "Prüfung konnte nicht geladen werden.")
	}
}

func (h *ReleaseReviewHandler) writeDecisionError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrReviewAlreadyDecided),
		errors.Is(err, repository.ErrConflict):
		c.JSON(http.StatusConflict, reviewError(
			"REVIEW_ALREADY_DECIDED",
			"Diese Prüfung wurde bereits von einer anderen Person entschieden.",
		))
	case errors.Is(err, services.ErrReviewCapabilityDenied),
		errors.Is(err, services.ErrReviewSelfReviewForbidden):
		c.JSON(http.StatusForbidden, reviewError("REVIEW_FORBIDDEN", "Keine Berechtigung für diese Prüfung."))
	case errors.Is(err, services.ErrReviewTargetNotFound):
		c.JSON(http.StatusNotFound, reviewError("REVIEW_NOT_FOUND", "Prüfung nicht gefunden."))
	case errors.Is(err, services.ErrReviewTargetNotPending):
		c.JSON(http.StatusConflict, reviewError("REVIEW_ALREADY_DECIDED", "Diese Prüfung ist nicht mehr offen."))
	case errors.Is(err, services.ErrReviewOverrideReasonRequired),
		errors.Is(err, services.ErrReviewRejectionCategoryRequired),
		errors.Is(err, services.ErrReviewRejectionReasonRequired),
		errors.Is(err, services.ErrReviewDecisionInvalid),
		errors.Is(err, services.ErrReviewActionInvalid),
		errors.Is(err, services.ErrReviewTargetAttributionInvalid),
		errors.Is(err, repository.ErrValidation):
		c.JSON(http.StatusUnprocessableEntity, reviewError("REVIEW_VALIDATION_FAILED", "Ungültige Prüfungsentscheidung."))
	default:
		writeInternalErrorResponse(c, "interner serverfehler", err, "Prüfungsentscheidung fehlgeschlagen.")
	}
}

func decodeStrictReleaseReviewJSON(c *gin.Context, target any) error {
	decoder := json.NewDecoder(io.LimitReader(c.Request.Body, 16*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("request body must contain exactly one JSON value")
	}
	return nil
}

func validateReleaseReviewDecisionRequest(request releaseReviewDecisionRequest, platformAdmin bool) error {
	request.Decision = strings.TrimSpace(request.Decision)
	request.RejectionCategory = strings.TrimSpace(request.RejectionCategory)
	reason := strings.TrimSpace(request.RejectionReason)
	overrideReason := strings.TrimSpace(request.OverrideReason)
	if request.ExpectedRevision <= 0 {
		return errors.New("Eine gültige erwartete Revision ist erforderlich.")
	}
	switch request.Decision {
	case string(services.ReviewDecisionConfirm):
		if request.RejectionCategory != "" || reason != "" {
			return errors.New("Eine Bestätigung darf keinen Ablehnungsgrund enthalten.")
		}
	case string(services.ReviewDecisionReject):
		if !isReleaseReviewRejectionCategory(request.RejectionCategory) {
			return errors.New("Eine gültige Ablehnungskategorie ist erforderlich.")
		}
		if len([]rune(reason)) < 10 || len([]rune(reason)) > 1000 {
			return errors.New("Die Begründung muss zwischen 10 und 1000 Zeichen lang sein.")
		}
	default:
		return errors.New("Die Entscheidung muss confirm oder reject sein.")
	}
	if platformAdmin && overrideReason != "" {
		if len([]rune(overrideReason)) < 10 || len([]rune(overrideReason)) > 1000 {
			return errors.New("Der Override-Grund muss zwischen 10 und 1000 Zeichen lang sein.")
		}
	} else if overrideReason != "" {
		return errors.New("Ein Override-Grund ist nur für Plattform-Admins zulässig.")
	}
	return nil
}

func isReleaseReviewRejectionCategory(value string) bool {
	switch value {
	case "content.incorrect", "release_context.wrong", "quality.insufficient", "rights.unclear", "other":
		return true
	default:
		return false
	}
}

func optionalPositiveInt64(value string) (int64, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, true
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	return parsed, err == nil && parsed > 0
}

func reviewError(code, message string) gin.H {
	return gin.H{"error": gin.H{"code": code, "message": message}}
}
