package handlers

import "testing"

func TestValidateCreateWatchlistRequest(t *testing.T) {
	tests := []struct {
		name        string
		req         createWatchlistRequest
		wantAnimeID int64
		wantMessage string
	}{
		{
			name: "valid anime id",
			req: createWatchlistRequest{
				AnimeID: 42,
			},
			wantAnimeID: 42,
		},
		{
			name: "missing anime id",
			req: createWatchlistRequest{
				AnimeID: 0,
			},
			wantMessage: "anime_id ist erforderlich",
		},
		{
			name: "negative anime id",
			req: createWatchlistRequest{
				AnimeID: -5,
			},
			wantMessage: "anime_id ist erforderlich",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			animeID, message := validateCreateWatchlistRequest(tc.req)
			if message != tc.wantMessage {
				t.Fatalf("expected message %q, got %q", tc.wantMessage, message)
			}
			if animeID != tc.wantAnimeID {
				t.Fatalf("expected anime id %d, got %d", tc.wantAnimeID, animeID)
			}
		})
	}
}
