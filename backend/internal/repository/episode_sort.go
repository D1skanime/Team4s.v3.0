package repository

import (
	"math/big"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"
)

type episodeIdentity struct {
	ID            int64
	EpisodeNumber string
}

func compareEpisodeOrder(aNumber string, aID int64, bNumber string, bID int64) int {
	aTrimmed := strings.TrimSpace(aNumber)
	bTrimmed := strings.TrimSpace(bNumber)

	aNumeric, aValue := parseEpisodeNumeric(aTrimmed)
	bNumeric, bValue := parseEpisodeNumeric(bTrimmed)

	if aNumeric != bNumeric {
		if aNumeric {
			return -1
		}
		return 1
	}

	if aNumeric {
		if cmp := aValue.Cmp(bValue); cmp != 0 {
			return cmp
		}
		if len(aTrimmed) != len(bTrimmed) {
			if len(aTrimmed) < len(bTrimmed) {
				return -1
			}
			return 1
		}
		if cmp := strings.Compare(aTrimmed, bTrimmed); cmp != 0 {
			return cmp
		}
	} else {
		aLower := strings.ToLower(aTrimmed)
		bLower := strings.ToLower(bTrimmed)
		if cmp := strings.Compare(aLower, bLower); cmp != 0 {
			return cmp
		}
		if cmp := strings.Compare(aTrimmed, bTrimmed); cmp != 0 {
			return cmp
		}
	}

	if aID < bID {
		return -1
	}
	if aID > bID {
		return 1
	}
	return 0
}

func sortEpisodeListItems(items []models.EpisodeListItem) {
	sort.Slice(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		return compareEpisodeOrder(left.EpisodeNumber, left.ID, right.EpisodeNumber, right.ID) < 0
	})
}

func sortEpisodeIdentities(items []episodeIdentity) {
	sort.Slice(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		return compareEpisodeOrder(left.EpisodeNumber, left.ID, right.EpisodeNumber, right.ID) < 0
	})
}

func findAdjacentEpisodeIDs(sorted []episodeIdentity, currentID int64) (*int64, *int64) {
	for index, item := range sorted {
		if item.ID != currentID {
			continue
		}

		var previousID *int64
		var nextID *int64

		if index > 0 {
			prev := sorted[index-1].ID
			previousID = &prev
		}
		if index+1 < len(sorted) {
			next := sorted[index+1].ID
			nextID = &next
		}

		return previousID, nextID
	}

	return nil, nil
}

func parseEpisodeNumeric(value string) (bool, *big.Int) {
	if value == "" {
		return false, nil
	}
	for _, character := range value {
		if character < '0' || character > '9' {
			return false, nil
		}
	}

	number, ok := new(big.Int).SetString(value, 10)
	if !ok {
		return false, nil
	}

	return true, number
}
