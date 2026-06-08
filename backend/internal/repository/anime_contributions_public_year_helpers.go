package repository

// Jahr-Pointer-Helfer für die öffentlichen Contributions-Aggregationen
// (GetPublicAnimeContributions). Ausgelagert aus anime_contributions_public_repository.go,
// um die 450-Zeilen-Grenze der Hauptdatei einzuhalten.

// minYearPtr liefert den kleineren der beiden Jahreswerte; nil-Kandidaten werden ignoriert.
func minYearPtr(cur, candidate *int) *int {
	if candidate == nil {
		return cur
	}
	if cur == nil || *candidate < *cur {
		v := *candidate
		return &v
	}
	return cur
}

// maxYearPtr liefert den größeren der beiden Jahreswerte; nil-Kandidaten werden ignoriert.
func maxYearPtr(cur, candidate *int) *int {
	if candidate == nil {
		return cur
	}
	if cur == nil || *candidate > *cur {
		v := *candidate
		return &v
	}
	return cur
}
