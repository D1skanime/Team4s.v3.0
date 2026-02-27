package handlers

import (
	"fmt"
	"strings"
	"time"
)

// jellyfinSeasonNumber extracts the season number from a Jellyfin ParentIndexNumber.
// Returns 1 if nil or invalid.
func jellyfinSeasonNumber(value *int) int32 {
	if value == nil || *value <= 0 {
		return 1
	}
	return int32(*value)
}

// jellyfinEpisodeNumber extracts the episode number from a Jellyfin IndexNumber.
// Returns 0 if nil or invalid.
func jellyfinEpisodeNumber(value *int) int32 {
	if value == nil || *value <= 0 {
		return 0
	}
	return int32(*value)
}

// parseJellyfinPremiereDate parses an RFC3339Nano date string from Jellyfin.
func parseJellyfinPremiereDate(raw *string) *time.Time {
	if raw == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}

	parsed, err := time.Parse(time.RFC3339Nano, trimmed)
	if err != nil {
		return nil
	}
	return &parsed
}

// jellyfinVideoQuality determines the video quality label from media streams.
func jellyfinVideoQuality(streams []jellyfinMediaStream) *string {
	maxHeight := 0
	for _, stream := range streams {
		if !strings.EqualFold(strings.TrimSpace(stream.Type), "Video") {
			continue
		}
		if stream.Height == nil || *stream.Height <= 0 {
			continue
		}
		if *stream.Height > maxHeight {
			maxHeight = *stream.Height
		}
	}

	if maxHeight == 0 {
		return nil
	}
	label := ""
	switch {
	case maxHeight >= 2000:
		label = "2160p"
	case maxHeight >= 1400:
		label = "1440p"
	case maxHeight >= 1000:
		label = "1080p"
	case maxHeight >= 700:
		label = "720p"
	case maxHeight >= 540:
		label = "576p"
	default:
		label = "480p"
	}

	return &label
}

// normalizeJellyfinPath normalizes a file path for comparison.
func normalizeJellyfinPath(raw *string) string {
	if raw == nil {
		return ""
	}

	path := strings.TrimSpace(*raw)
	path = strings.ReplaceAll(path, "\\", "/")
	path = strings.TrimSuffix(path, "/")
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}

	return strings.ToLower(path)
}

// jellyfinPathHasPrefix checks if an item path starts with the given prefix.
func jellyfinPathHasPrefix(itemPath string, normalizedPrefix string) bool {
	candidate := strings.TrimSpace(itemPath)
	candidate = strings.ReplaceAll(candidate, "\\", "/")
	candidate = strings.TrimSuffix(candidate, "/")
	candidate = strings.TrimSpace(candidate)
	if candidate == "" || normalizedPrefix == "" {
		return false
	}

	normalizedCandidate := strings.ToLower(candidate)
	if normalizedCandidate == normalizedPrefix {
		return true
	}

	return strings.HasPrefix(normalizedCandidate, normalizedPrefix+"/")
}

// buildJellyfinSyncMismatchReason checks if the episode count is suspicious.
func buildJellyfinSyncMismatchReason(maxEpisodes *int16, acceptedUniqueEpisodes int32) *string {
	if maxEpisodes == nil || *maxEpisodes <= 0 || acceptedUniqueEpisodes <= 0 {
		return nil
	}

	expected := int32(*maxEpisodes)
	allowedUpperBound := expected + 2
	if expected >= 6 {
		allowedUpperBound = expected + (expected / 2)
	}
	if allowedUpperBound < expected+2 {
		allowedUpperBound = expected + 2
	}

	if acceptedUniqueEpisodes <= allowedUpperBound {
		return nil
	}

	message := fmt.Sprintf(
		"sync blockiert: %d eindeutige episoden gefunden, anime.max_episodes=%d (erlaubte obergrenze=%d). Bitte jellyfin_series_id/pfad pruefen oder allow_mismatch=true setzen.",
		acceptedUniqueEpisodes,
		expected,
		allowedUpperBound,
	)
	return &message
}

// normalizeNullableStringPtr trims and returns nil for empty strings.
func normalizeNullableStringPtr(raw string) *string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

// int16FromCount safely converts a count to *int16.
func int16FromCount(count int) *int16 {
	if count <= 0 || count > 32767 {
		return nil
	}
	value := int16(count)
	return &value
}

// int16FromInt safely converts *int to *int16.
func int16FromInt(raw *int) *int16 {
	if raw == nil || *raw <= 0 || *raw > 32767 {
		return nil
	}
	value := int16(*raw)
	return &value
}
