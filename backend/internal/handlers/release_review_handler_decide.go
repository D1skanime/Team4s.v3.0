package handlers

// Split out of release_review_handler.go (release-review-metadata-409 debug session,
// 2026-10-13) to keep that file under CLAUDE.md's 450-line cap after writeDecisionError grew
// a third, deliberately distinct error bucket. Mirrors the existing
// release_review_handler_authz.go / release_review_handler_identity.go split pattern: the
// Decide HTTP handler, its request type/validation, and its error mapping belong together as
// one concern, separate from List/Counts/Detail/Next's read-side plumbing.

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

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
	actorMemberIDs, ok := h.resolveActorMemberIDs(c, actor)
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
		c.Request.Context(), groupID, c.Param("reviewId"), allowedKinds, actor.AppUserID, actorMemberIDs,
	)
	if err != nil {
		h.writeReadError(c, err)
		return
	}
	if detail.SourceRevision != request.ExpectedRevision {
		// Distinct from writeDecisionError's "REVIEW_ALREADY_DECIDED" below: this fires
		// purely on a client/server revision mismatch -- no one necessarily decided
		// anything. It is release-review-metadata-409's bucket (b) "veraltete Revision":
		// the client's own copy of this review is stale (e.g. someone edited metadata or
		// replaced the file in between), independent of whether a decision exists yet.
		c.JSON(http.StatusConflict, reviewError(
			"REVIEW_STALE_REVISION",
			"Diese Prüfung basiert auf einer veralteten Version. Bitte laden Sie die Prüfung neu.",
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
		c.Request.Context(), groupID, c.Param("reviewId"), allowedKinds, actor.AppUserID, actorMemberIDs,
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

// writeDecisionError maps services.ReviewService.Decide's error sentinels to one of three
// deliberately distinct 409 responses (release-review-metadata-409, item 3): a genuine
// foreign decision, a stale optimistic-concurrency revision, or some other, rarer conflict.
// Collapsing these into one "already decided by someone else" message (the pre-2026-10
// behavior) actively misled admins when the real cause was their own earlier edit bumping
// the revision, not another reviewer racing them.
func (h *ReleaseReviewHandler) writeDecisionError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrReviewAlreadyDecided):
		// Bucket (a): InsertDecision's unique constraint on (source_type, source_key,
		// source_revision) lost the race -- someone else's decision for this exact
		// revision is already recorded. A real foreign decision, not a stale copy.
		c.JSON(http.StatusConflict, reviewError(
			"REVIEW_ALREADY_DECIDED",
			"Diese Prüfung wurde bereits von einer anderen Person abschließend entschieden.",
		))
	case errors.Is(err, repository.ErrConflict):
		// Bucket (c): a conflict surfaced from somewhere other than the decision-insert
		// race above (e.g. a credit-slot race between two decisions on different
		// revisions of the same source) -- rare, and not a "someone else decided this"
		// situation at all.
		c.JSON(http.StatusConflict, reviewError(
			"REVIEW_CONFLICT",
			"Bei der Prüfungsentscheidung ist ein Konflikt aufgetreten. Bitte versuchen Sie es erneut.",
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
