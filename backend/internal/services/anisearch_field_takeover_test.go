package services

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// quick-261018-l5r Task 2: table-driven unit tests for the pure field-takeover decision function
// and its two normalization helpers. No DB, no HTTP -- genuinely pure.

func TestResolveFieldTakeover_AniSearchHasNoValueAlwaysKeeps(t *testing.T) {
	result := ResolveFieldTakeover("", nil, false)
	require.Equal(t, FieldTakeoverKeep, result.Action)
	require.NotEmpty(t, result.Reason)

	// Even a non-empty current value with a matching jellyfin value must still "keep" when
	// AniSearch itself has nothing -- there is nothing to take over.
	jellyfinValue := "action"
	result = ResolveFieldTakeover("action", &jellyfinValue, false)
	require.Equal(t, FieldTakeoverKeep, result.Action)
}

func TestResolveFieldTakeover_FillsWhenCurrentIsEmpty(t *testing.T) {
	result := ResolveFieldTakeover("", nil, true)
	require.Equal(t, FieldTakeoverFill, result.Action)
	require.NotEmpty(t, result.Reason)

	// Still fills even when a jellyfin comparison value exists but current is empty -- fill takes
	// priority over replace when there's nothing to "replace".
	jellyfinValue := "2020"
	result = ResolveFieldTakeover("", &jellyfinValue, true)
	require.Equal(t, FieldTakeoverFill, result.Action)
}

func TestResolveFieldTakeover_ReplacesWhenCurrentMatchesJellyfin(t *testing.T) {
	jellyfinValue := "fantasy, action"
	result := ResolveFieldTakeover("fantasy, action", &jellyfinValue, true)
	require.Equal(t, FieldTakeoverReplace, result.Action)
	require.NotEmpty(t, result.Reason)
}

func TestResolveFieldTakeover_KeepsWhenCurrentDiffersFromJellyfin(t *testing.T) {
	jellyfinValue := "fantasy"
	result := ResolveFieldTakeover("action", &jellyfinValue, true)
	require.Equal(t, FieldTakeoverKeep, result.Action)
	require.Contains(t, result.Reason, "manuell")
}

func TestResolveFieldTakeover_KeepsWhenNoJellyfinComparisonValueExists(t *testing.T) {
	result := ResolveFieldTakeover("action", nil, true)
	require.Equal(t, FieldTakeoverKeep, result.Action)
	require.Contains(t, result.Reason, "geschützt")
}

func TestNormalizeScalarForComparison(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		expected string
	}{
		{"trims and lowercases", "  Action Fantasy  ", "action fantasy"},
		{"empty stays empty", "   ", ""},
		{"already normalized", "ongoing", "ongoing"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			require.Equal(t, tc.expected, NormalizeScalarForComparison(tc.input))
		})
	}
}

func TestNormalizeListForComparison_OrderIndependentAndCaseInsensitive(t *testing.T) {
	a := NormalizeListForComparison([]string{"Action", "Fantasy"})
	b := NormalizeListForComparison([]string{"fantasy", "action"})
	require.Equal(t, a, b, "same set in different order/case must normalize identically")
}

func TestNormalizeListForComparison_DedupesAndDropsEmpties(t *testing.T) {
	result := NormalizeListForComparison([]string{"Action", "action", "  ", "Fantasy", ""})
	expected := NormalizeListForComparison([]string{"Action", "Fantasy"})
	require.Equal(t, expected, result)
}

func TestNormalizeListForComparison_PipeCharacterDoesNotCollideAcrossElements(t *testing.T) {
	// A naive "|"-joined key would make ["a|b", "c"] collide with ["a", "b|c"]. The unit-separator
	// based key must keep them distinct.
	first := NormalizeListForComparison([]string{"a|b", "c"})
	second := NormalizeListForComparison([]string{"a", "b|c"})
	require.NotEqual(t, first, second, "a genre/tag literally containing '|' must not collide with a different split")
}

func TestNormalizeListForComparison_EmptyInputIsEmptyString(t *testing.T) {
	require.Equal(t, "", NormalizeListForComparison(nil))
	require.Equal(t, "", NormalizeListForComparison([]string{}))
	require.Equal(t, "", NormalizeListForComparison([]string{"", "  "}))
}

func TestResolveAniSearchTypeTakeoverValue(t *testing.T) {
	t.Run("nil format has no value", func(t *testing.T) {
		value, hasValue := ResolveAniSearchTypeTakeoverValue(nil)
		require.False(t, hasValue)
		require.Empty(t, value)
	})

	t.Run("blank format has no value", func(t *testing.T) {
		blank := "   "
		value, hasValue := ResolveAniSearchTypeTakeoverValue(&blank)
		require.False(t, hasValue)
		require.Empty(t, value)
	})

	t.Run("movie format maps to film via the existing mapping function", func(t *testing.T) {
		movie := "Movie"
		value, hasValue := ResolveAniSearchTypeTakeoverValue(&movie)
		require.True(t, hasValue)
		require.Equal(t, "film", value)
	})

	t.Run("unrecognized but present format defaults to tv and still counts as a value", func(t *testing.T) {
		weird := "something-unexpected"
		value, hasValue := ResolveAniSearchTypeTakeoverValue(&weird)
		require.True(t, hasValue)
		require.Equal(t, "tv", value)
	})
}
