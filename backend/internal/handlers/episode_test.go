package handlers

import "testing"

func TestParseEpisodeID(t *testing.T) {
	if _, err := parseEpisodeID("0"); err == nil {
		t.Fatalf("expected error for zero")
	}

	if _, err := parseEpisodeID("abc"); err == nil {
		t.Fatalf("expected error for non-numeric id")
	}

	id, err := parseEpisodeID("7")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id != 7 {
		t.Fatalf("expected id 7, got %d", id)
	}
}
