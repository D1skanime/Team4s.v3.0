package handlers

import (
	"context"
	"errors"
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
	Detail(context.Context, int64, string, []string, int64, []int64) (*repository.ReleaseReviewDetail, error)
	Next(context.Context, int64, string, []string, int64, []int64) (*repository.ReleaseReviewQueueItem, error)
}

type releaseReviewPermissionService interface {
	ResolveReviewGroupAuthorization(
		context.Context,
		permissions.Actor,
		int64,
	) (map[permissions.Action]permissions.ReviewAuthorizationResult, error)
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

// releaseReviewActorIdentityResolver resolves the requesting actor's verified member IDs
// once per request (Plan 141-02), the second signal releaseReviewQueuePredicates' self-
// exclusion/self-inclusion clause needs alongside AppUserID.
type releaseReviewActorIdentityResolver interface {
	ResolveVerifiedActorMemberIDs(context.Context, int64) ([]int64, error)
}

type ReleaseReviewHandler struct {
	query       releaseReviewQueryRepository
	permissions releaseReviewPermissionService
	decisions   releaseReviewDecisionService
	identity    releaseReviewActorIdentityResolver
}

func NewReleaseReviewHandler(
	query releaseReviewQueryRepository,
	permissionService releaseReviewPermissionService,
	decisionService releaseReviewDecisionService,
	identityResolver releaseReviewActorIdentityResolver,
) *ReleaseReviewHandler {
	return &ReleaseReviewHandler{
		query: query, permissions: permissionService, decisions: decisionService,
		identity: identityResolver,
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
	counts.AllowedTypes = options.AllowedKinds
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
	actorMemberIDs, ok := h.resolveActorMemberIDs(c, actor)
	if !ok {
		return
	}
	detail, err := h.query.Detail(
		c.Request.Context(), groupID, c.Param("reviewId"), allowedKinds, actor.AppUserID, actorMemberIDs,
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
	actorMemberIDs, ok := h.resolveActorMemberIDs(c, actor)
	if !ok {
		return
	}
	next, err := h.query.Next(
		c.Request.Context(), groupID, c.Param("reviewId"), allowedKinds, actor.AppUserID, actorMemberIDs,
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
	view := strings.TrimSpace(c.Query("view"))
	var allowedKinds []string
	if view == repository.ReleaseReviewQueueViewOwn {
		// D10 capability bypass: an actor always sees their own pending submissions,
		// regardless of whether they are authorized to DECIDE that review kind. `type=`
		// still narrows via scope.ReviewKind below -- only the capability GATE is
		// bypassed here.
		allowedKinds = []string{string(repository.ReviewKindText), string(repository.ReviewKindImage)}
	} else {
		var ok bool
		allowedKinds, ok = h.authorizedKinds(c, actor, groupID, kind)
		if !ok {
			return repository.ReleaseReviewQueueOptions{}, false
		}
	}
	actorMemberIDs, ok := h.resolveActorMemberIDs(c, actor)
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
			FansubGroupID: groupID, View: view,
			AnimeID: animeID, ReleaseVersionID: releaseVersionID,
			ReviewKind: kind, Category: c.Query("category"), Search: c.Query("search"),
		},
		AllowedKinds: allowedKinds, Cursor: c.Query("cursor"),
		Limit:          repository.NormalizeReleaseReviewQueueLimit(limit),
		ActorAppUserID: actor.AppUserID, ActorMemberIDs: actorMemberIDs,
	}
	if err := repository.ValidateReleaseReviewQueueOptions(options); err != nil {
		c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "Ungültige Filter- oder Cursor-Angabe."))
		return repository.ReleaseReviewQueueOptions{}, false
	}
	return options, true
}

func (h *ReleaseReviewHandler) writeReadError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrValidation):
		c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "Ungültige Prüfungsanfrage."))
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, reviewError("REVIEW_NOT_FOUND", "Prüfung nicht gefunden."))
	case errors.Is(err, repository.ErrForbidden):
		c.JSON(http.StatusForbidden, reviewError("REVIEW_FORBIDDEN", "Keine Berechtigung für diese Prüfung."))
	default:
		writeInternalErrorResponse(c, "interner serverfehler", err, "Prüfung konnte nicht geladen werden.")
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
