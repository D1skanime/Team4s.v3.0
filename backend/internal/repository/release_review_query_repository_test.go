package repository

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReleaseReviewQueueCursorPreservesFullTupleAndScope(t *testing.T) {
	submittedAt := time.Date(2026, 7, 23, 9, 30, 0, 123000000, time.UTC)
	scope := ReleaseReviewQueueScope{
		FansubGroupID:   21,
		View:            ReleaseReviewQueueViewOpen,
		AnimeID:         81,
		ReleaseVersionID: 41,
		ReviewKind:      ReviewKindImage,
		Category:        "screenshot",
		Search:          "folge 01",
	}
	cursor, err := EncodeReleaseReviewQueueCursor(scope, ReleaseReviewSortKey{
		SubmittedAt: submittedAt,
		SourceType: ReleaseVersionMediaReviewSourceType,
		SourceID:   601,
	})
	require.NoError(t, err)

	decoded, err := DecodeReleaseReviewQueueCursor(scope, cursor)
	require.NoError(t, err)
	assert.True(t, decoded.SubmittedAt.Equal(submittedAt))
	assert.Equal(t, ReleaseVersionMediaReviewSourceType, decoded.SourceType)
	assert.EqualValues(t, 601, decoded.SourceID)

	foreignGroup := scope
	foreignGroup.FansubGroupID = 22
	_, err = DecodeReleaseReviewQueueCursor(foreignGroup, cursor)
	assert.ErrorIs(t, err, ErrValidation)

	foreignFilter := scope
	foreignFilter.Category = "other"
	_, err = DecodeReleaseReviewQueueCursor(foreignFilter, cursor)
	assert.ErrorIs(t, err, ErrValidation)
}

func TestReleaseReviewQueueCursorRejectsMalformedOrIncompleteValues(t *testing.T) {
	scope := ReleaseReviewQueueScope{
		FansubGroupID: 21,
		View:          ReleaseReviewQueueViewOpen,
	}
	for _, cursor := range []string{
		"",
		"not-base64",
		"e30",
	} {
		_, err := DecodeReleaseReviewQueueCursor(scope, cursor)
		assert.ErrorIs(t, err, ErrValidation, cursor)
	}

	_, err := EncodeReleaseReviewQueueCursor(scope, ReleaseReviewSortKey{
		SubmittedAt: time.Now(),
		SourceType: "foreign",
		SourceID:   1,
	})
	assert.ErrorIs(t, err, ErrValidation)
}

func TestReleaseReviewQueueNormalizesAndCapsPageSize(t *testing.T) {
	assert.Equal(t, 50, NormalizeReleaseReviewQueueLimit(0))
	assert.Equal(t, 1, NormalizeReleaseReviewQueueLimit(1))
	assert.Equal(t, 50, NormalizeReleaseReviewQueueLimit(50))
	assert.Equal(t, 50, NormalizeReleaseReviewQueueLimit(51))
	assert.Equal(t, 50, NormalizeReleaseReviewQueueLimit(5000))
}

func TestReleaseReviewQueueReviewIDIsOpaqueAndStrict(t *testing.T) {
	id, err := EncodeReleaseReviewID(ReleaseVersionNoteReviewSourceType, 501)
	require.NoError(t, err)
	assert.NotContains(t, id, "release_version_note")
	assert.NotContains(t, id, "501")

	sourceType, sourceID, err := DecodeReleaseReviewID(id)
	require.NoError(t, err)
	assert.Equal(t, ReleaseVersionNoteReviewSourceType, sourceType)
	assert.EqualValues(t, 501, sourceID)

	for _, invalid := range []string{"", "501", "not-base64", "e30"} {
		_, _, err := DecodeReleaseReviewID(invalid)
		assert.ErrorIs(t, err, ErrValidation)
	}
}

func TestReleaseReviewQueueFilterValidation(t *testing.T) {
	valid := ReleaseReviewQueueOptions{
		Scope: ReleaseReviewQueueScope{
			FansubGroupID: 21,
			View:          ReleaseReviewQueueViewHistory,
			ReviewKind:    ReviewKindImage,
			Category:      "typesetting_karaoke",
			Search:        "  Projekt A  ",
		},
		AllowedKinds: []string{ReviewKindImage},
		Limit:        50,
	}
	require.NoError(t, ValidateReleaseReviewQueueOptions(valid))

	tests := []ReleaseReviewQueueOptions{
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 0, View: ReleaseReviewQueueViewOpen}, AllowedKinds: []string{ReviewKindText}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: "foreign"}, AllowedKinds: []string{ReviewKindText}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen, ReviewKind: "foreign"}, AllowedKinds: []string{ReviewKindText}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen, Category: "foreign"}, AllowedKinds: []string{ReviewKindImage}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen, ReviewKind: ReviewKindText, Category: "screenshot"}, AllowedKinds: []string{ReviewKindText}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen}, AllowedKinds: nil},
	}
	for index, input := range tests {
		assert.ErrorIs(t, ValidateReleaseReviewQueueOptions(input), ErrValidation, "case %d", index)
	}
}
