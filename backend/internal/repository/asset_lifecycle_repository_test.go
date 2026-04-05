package repository

import (
	"encoding/json"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestNormalizeAssetLifecycleEntityType_TrimsAndNormalizes(t *testing.T) {
	if got := normalizeAssetLifecycleEntityType(" Anime "); got != "anime" {
		t.Fatalf("expected anime, got %q", got)
	}
}

func TestBuildLookupAssetLifecycleSubjectQuery_AnimeOnly(t *testing.T) {
	query, ok := buildLookupAssetLifecycleSubjectQuery("anime")
	if !ok {
		t.Fatal("expected anime lookup query to exist")
	}
	if !strings.Contains(query, "FROM anime") {
		t.Fatalf("expected anime query, got %q", query)
	}

	if _, ok := buildLookupAssetLifecycleSubjectQuery("group"); ok {
		t.Fatal("expected group lookup query to be out of scope for phase 6")
	}
}

func TestBuildAssetLifecycleAuditPayload_IncludesActorRelevantFields(t *testing.T) {
	payload, err := buildAssetLifecycleAuditPayload(models.AssetLifecycleAuditEntry{
		ActorUserID: 22,
		EntityType:  "anime",
		EntityID:    44,
		AssetType:   "cover",
		Action:      "provision",
		Outcome:     "success",
		Details: map[string]any{
			"root_path": "C:/media/anime/44",
		},
	})
	if err != nil {
		t.Fatalf("build payload: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}
	if decoded["entity_type"] != "anime" {
		t.Fatalf("expected anime entity_type, got %#v", decoded["entity_type"])
	}
	if decoded["asset_type"] != "cover" {
		t.Fatalf("expected cover asset_type, got %#v", decoded["asset_type"])
	}
	if decoded["action"] != "provision" {
		t.Fatalf("expected provision action, got %#v", decoded["action"])
	}
}

func TestBuildAssetLifecycleMutationKind_UsesProvisionConstant(t *testing.T) {
	if got := buildAssetLifecycleMutationKind("provision"); got != adminAnimeMutationKindAssetLifecycleProvision {
		t.Fatalf("expected provision constant, got %q", got)
	}
}
