package repository

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	ReleaseReviewQueueViewOpen    = "open"
	ReleaseReviewQueueViewHistory = "history"
	ReleaseReviewQueueViewOwn     = "own"
	releaseReviewCursorVersion    = 1
)

type ReleaseReviewQueueScope struct {
	FansubGroupID    int64
	View             string
	AnimeID          int64
	ReleaseVersionID int64
	ReviewKind       string
	Category         string
	Search           string
}

type ReleaseReviewQueueOptions struct {
	Scope        ReleaseReviewQueueScope
	AllowedKinds []string
	Cursor       string
	Limit        int
	// ActorAppUserID/ActorMemberIDs are the requesting actor's own identity, resolved
	// server-side once per request (never from client input). They drive
	// releaseReviewQueuePredicates' two-signal self-exclusion (view=open/history) /
	// self-inclusion (view=own) clause. Zero-value (unset) safely no-ops the exclusion
	// branch for pre-existing call sites that never populate these fields.
	ActorAppUserID int64
	ActorMemberIDs []int64
}

type ReleaseReviewSortKey struct {
	SubmittedAt time.Time
	SourceType  string
	SourceID    int64
}

type releaseReviewCursor struct {
	Version          int       `json:"v"`
	FansubGroupID    int64     `json:"g"`
	View             string    `json:"w"`
	AnimeID          int64     `json:"a,omitempty"`
	ReleaseVersionID int64     `json:"r,omitempty"`
	ReviewKind       string    `json:"k,omitempty"`
	Category         string    `json:"c,omitempty"`
	Search           string    `json:"q,omitempty"`
	SubmittedAt      time.Time `json:"t"`
	SourceType       string    `json:"s"`
	SourceID         int64     `json:"i"`
}

type releaseReviewOpaqueID struct {
	Version    int    `json:"v"`
	SourceType string `json:"s"`
	SourceID   int64  `json:"i"`
}

func EncodeReleaseReviewID(sourceType string, sourceID int64) (string, error) {
	if !isReleaseReviewSourceType(sourceType) || sourceID <= 0 {
		return "", ErrValidation
	}
	return encodeReleaseReviewOpaque(releaseReviewOpaqueID{
		Version: releaseReviewCursorVersion, SourceType: sourceType, SourceID: sourceID,
	})
}

func DecodeReleaseReviewID(value string) (string, int64, error) {
	var decoded releaseReviewOpaqueID
	if err := decodeReleaseReviewOpaque(value, &decoded); err != nil ||
		decoded.Version != releaseReviewCursorVersion ||
		!isReleaseReviewSourceType(decoded.SourceType) ||
		decoded.SourceID <= 0 {
		return "", 0, ErrValidation
	}
	return decoded.SourceType, decoded.SourceID, nil
}

func EncodeReleaseReviewQueueCursor(scope ReleaseReviewQueueScope, key ReleaseReviewSortKey) (string, error) {
	scope = normalizeReleaseReviewScope(scope)
	if err := validateReleaseReviewScope(scope); err != nil ||
		key.SubmittedAt.IsZero() || !isReleaseReviewSourceType(key.SourceType) || key.SourceID <= 0 {
		return "", ErrValidation
	}
	return encodeReleaseReviewOpaque(releaseReviewCursor{
		Version: releaseReviewCursorVersion, FansubGroupID: scope.FansubGroupID, View: scope.View,
		AnimeID: scope.AnimeID, ReleaseVersionID: scope.ReleaseVersionID,
		ReviewKind: scope.ReviewKind, Category: scope.Category, Search: scope.Search,
		SubmittedAt: key.SubmittedAt.UTC(), SourceType: key.SourceType, SourceID: key.SourceID,
	})
}

func DecodeReleaseReviewQueueCursor(scope ReleaseReviewQueueScope, value string) (ReleaseReviewSortKey, error) {
	scope = normalizeReleaseReviewScope(scope)
	var decoded releaseReviewCursor
	if err := decodeReleaseReviewOpaque(value, &decoded); err != nil ||
		decoded.Version != releaseReviewCursorVersion ||
		decoded.FansubGroupID != scope.FansubGroupID || decoded.View != scope.View ||
		decoded.AnimeID != scope.AnimeID || decoded.ReleaseVersionID != scope.ReleaseVersionID ||
		decoded.ReviewKind != scope.ReviewKind || decoded.Category != scope.Category ||
		decoded.Search != scope.Search || decoded.SubmittedAt.IsZero() ||
		!isReleaseReviewSourceType(decoded.SourceType) || decoded.SourceID <= 0 {
		return ReleaseReviewSortKey{}, ErrValidation
	}
	return ReleaseReviewSortKey{
		SubmittedAt: decoded.SubmittedAt.UTC(), SourceType: decoded.SourceType, SourceID: decoded.SourceID,
	}, nil
}

func NormalizeReleaseReviewQueueLimit(limit int) int {
	if limit <= 0 || limit > 50 {
		return 50
	}
	return limit
}

func ValidateReleaseReviewQueueOptions(options ReleaseReviewQueueOptions) error {
	options.Scope = normalizeReleaseReviewScope(options.Scope)
	if err := validateReleaseReviewScope(options.Scope); err != nil || len(options.AllowedKinds) == 0 {
		return ErrValidation
	}
	for _, kind := range options.AllowedKinds {
		if kind != string(ReviewKindText) && kind != string(ReviewKindImage) {
			return ErrValidation
		}
	}
	if options.Scope.ReviewKind != "" && !containsReleaseReviewKind(options.AllowedKinds, options.Scope.ReviewKind) {
		return ErrValidation
	}
	if options.Limit < 0 {
		return ErrValidation
	}
	if options.Cursor != "" {
		_, err := DecodeReleaseReviewQueueCursor(options.Scope, options.Cursor)
		return err
	}
	return nil
}

func normalizeReleaseReviewScope(scope ReleaseReviewQueueScope) ReleaseReviewQueueScope {
	scope.View = strings.TrimSpace(scope.View)
	if scope.View == "" {
		scope.View = ReleaseReviewQueueViewOpen
	}
	scope.ReviewKind = strings.TrimSpace(scope.ReviewKind)
	scope.Category = strings.TrimSpace(scope.Category)
	scope.Search = strings.TrimSpace(scope.Search)
	return scope
}

func validateReleaseReviewScope(scope ReleaseReviewQueueScope) error {
	if scope.FansubGroupID <= 0 ||
		(scope.View != ReleaseReviewQueueViewOpen && scope.View != ReleaseReviewQueueViewHistory &&
			scope.View != ReleaseReviewQueueViewOwn) ||
		(scope.ReviewKind != "" && scope.ReviewKind != string(ReviewKindText) && scope.ReviewKind != string(ReviewKindImage)) ||
		(scope.Category != "" && !isReleaseReviewMediaCategory(scope.Category)) ||
		(scope.Category != "" && scope.ReviewKind != "" && scope.ReviewKind != string(ReviewKindImage)) ||
		utf8.RuneCountInString(scope.Search) > 200 {
		return ErrValidation
	}
	return nil
}

func encodeReleaseReviewOpaque(value any) (string, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return "", ErrValidation
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func decodeReleaseReviewOpaque(value string, target any) error {
	if strings.TrimSpace(value) == "" {
		return ErrValidation
	}
	raw, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return ErrValidation
	}
	if base64.RawURLEncoding.EncodeToString(raw) != value {
		return ErrValidation
	}
	decoder := json.NewDecoder(strings.NewReader(string(raw)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return ErrValidation
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return ErrValidation
	}
	return nil
}

func isReleaseReviewSourceType(value string) bool {
	return value == ReleaseVersionNoteReviewSourceType || value == ReleaseVersionMediaReviewSourceType
}

func containsReleaseReviewKind(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
