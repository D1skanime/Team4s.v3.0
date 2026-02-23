package repository

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestCompareEpisodeOrder(t *testing.T) {
	tests := []struct {
		name       string
		leftNum    string
		leftID     int64
		rightNum   string
		rightID    int64
		wantResult int
	}{
		{
			name:       "numeric values are compared numerically",
			leftNum:    "2",
			leftID:     1,
			rightNum:   "10",
			rightID:    2,
			wantResult: -1,
		},
		{
			name:       "numeric episodes come before text episodes",
			leftNum:    "10",
			leftID:     1,
			rightNum:   "SP1",
			rightID:    2,
			wantResult: -1,
		},
		{
			name:       "shorter numeric representation comes first on same numeric value",
			leftNum:    "2",
			leftID:     1,
			rightNum:   "02",
			rightID:    2,
			wantResult: -1,
		},
		{
			name:       "id is final tiebreaker",
			leftNum:    "OVA",
			leftID:     4,
			rightNum:   "OVA",
			rightID:    7,
			wantResult: -1,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got := compareEpisodeOrder(tc.leftNum, tc.leftID, tc.rightNum, tc.rightID)
			if got != tc.wantResult {
				t.Fatalf("expected %d, got %d", tc.wantResult, got)
			}
		})
	}
}

func TestSortEpisodeIdentities(t *testing.T) {
	items := []episodeIdentity{
		{ID: 10, EpisodeNumber: "SP1"},
		{ID: 2, EpisodeNumber: "10"},
		{ID: 3, EpisodeNumber: "2"},
		{ID: 1, EpisodeNumber: "1"},
	}

	sortEpisodeIdentities(items)

	gotOrder := []int64{items[0].ID, items[1].ID, items[2].ID, items[3].ID}
	wantOrder := []int64{1, 3, 2, 10}
	for index := range wantOrder {
		if gotOrder[index] != wantOrder[index] {
			t.Fatalf("unexpected order at index %d: want %d, got %d", index, wantOrder[index], gotOrder[index])
		}
	}
}

func TestSortEpisodeListItems(t *testing.T) {
	items := []models.EpisodeListItem{
		{ID: 4, EpisodeNumber: "12"},
		{ID: 5, EpisodeNumber: "OVA"},
		{ID: 2, EpisodeNumber: "2"},
	}

	sortEpisodeListItems(items)

	if items[0].ID != 2 || items[1].ID != 4 || items[2].ID != 5 {
		t.Fatalf("unexpected sorted ids: %d,%d,%d", items[0].ID, items[1].ID, items[2].ID)
	}
}

func TestFindAdjacentEpisodeIDs(t *testing.T) {
	ordered := []episodeIdentity{
		{ID: 1, EpisodeNumber: "1"},
		{ID: 2, EpisodeNumber: "2"},
		{ID: 3, EpisodeNumber: "3"},
	}

	prev, next := findAdjacentEpisodeIDs(ordered, 2)
	if prev == nil || *prev != 1 {
		t.Fatalf("expected prev id 1, got %v", prev)
	}
	if next == nil || *next != 3 {
		t.Fatalf("expected next id 3, got %v", next)
	}

	firstPrev, firstNext := findAdjacentEpisodeIDs(ordered, 1)
	if firstPrev != nil {
		t.Fatalf("expected nil previous id for first episode, got %v", firstPrev)
	}
	if firstNext == nil || *firstNext != 2 {
		t.Fatalf("expected next id 2, got %v", firstNext)
	}
}
