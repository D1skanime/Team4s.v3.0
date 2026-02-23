package repository

import (
	"strings"
	"testing"
)

func TestBuildApplyJellyfinSyncMetadataQuery_UsesExplicitCasts(t *testing.T) {
	query, _ := buildApplyJellyfinSyncMetadataQuery(25, "jellyfin:abc", nil, nil, nil, false)

	requiredFragments := []string{
		"WHEN $6 = true AND $2 <> '' THEN $2",
		"WHEN (source IS NULL OR btrim(source) = '') AND $2 <> '' THEN $2",
		"year = COALESCE(year, $3::smallint)",
		"THEN $4::text",
		"max_episodes = COALESCE(max_episodes, $5::smallint)",
	}

	for _, fragment := range requiredFragments {
		if !strings.Contains(query, fragment) {
			t.Fatalf("expected query to contain %q, got: %s", fragment, query)
		}
	}
}

func TestBuildApplyJellyfinSyncMetadataQuery_TrimmedSourceAndNullableArgs(t *testing.T) {
	query, args := buildApplyJellyfinSyncMetadataQuery(25, " jellyfin:abc123 ", nil, nil, nil, true)

	if strings.TrimSpace(query) == "" {
		t.Fatalf("expected query to be non-empty")
	}
	if len(args) != 6 {
		t.Fatalf("expected 6 args, got %d", len(args))
	}
	if got := args[0]; got != int64(25) {
		t.Fatalf("expected anime id 25, got %#v", got)
	}
	if got := args[1]; got != "jellyfin:abc123" {
		t.Fatalf("expected trimmed source tag, got %#v", got)
	}
	yearArg, ok := args[2].(*int16)
	if !ok || yearArg != nil {
		t.Fatalf("expected typed nil *int16 year arg, got %#v", args[2])
	}
	descriptionArg, ok := args[3].(*string)
	if !ok || descriptionArg != nil {
		t.Fatalf("expected typed nil *string description arg, got %#v", args[3])
	}
	maxEpisodesArg, ok := args[4].(*int16)
	if !ok || maxEpisodesArg != nil {
		t.Fatalf("expected typed nil *int16 max_episodes arg, got %#v", args[4])
	}
	forceSourceArg, ok := args[5].(bool)
	if !ok || !forceSourceArg {
		t.Fatalf("expected forceSourceUpdate bool arg=true, got %#v", args[5])
	}
}
