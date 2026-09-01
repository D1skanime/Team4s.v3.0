package handlers

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

type phase142OpenAPI struct {
	Components struct {
		Parameters map[string]struct {
			Schema struct {
				Enum []string `yaml:"enum"`
			} `yaml:"schema"`
		} `yaml:"parameters"`
		Schemas map[string]struct {
			Required   []string            `yaml:"required"`
			Properties map[string]struct{} `yaml:"properties"`
		} `yaml:"schemas"`
	} `yaml:"components"`
}

func TestPhase142ReleaseReviewContractMatchesRuntime(t *testing.T) {
	_, current, _, _ := runtime.Caller(0)
	root := filepath.Clean(filepath.Join(filepath.Dir(current), "../../.."))

	contractBytes, err := os.ReadFile(filepath.Join(root, "shared/contracts/openapi.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	var contract phase142OpenAPI
	if err := yaml.Unmarshal(contractBytes, &contract); err != nil {
		t.Fatal(err)
	}

	view := contract.Components.Parameters["ReleaseReviewView"].Schema.Enum
	if !phase142SameStrings(view, []string{"open", "history", "own"}) {
		t.Fatalf("ReleaseReviewView enum = %v, want [open history own]", view)
	}

	counts := contract.Components.Schemas["ReleaseReviewCounts"]
	if !phase142Contains(counts.Required, "allowed_types") {
		t.Fatal("ReleaseReviewCounts.allowed_types must be required")
	}
	if _, ok := counts.Properties["allowed_types"]; !ok {
		t.Fatal("ReleaseReviewCounts.allowed_types property missing")
	}

	tsBytes, err := os.ReadFile(filepath.Join(root, "frontend/src/types/releaseReviews.ts"))
	if err != nil {
		t.Fatal(err)
	}
	ts := string(tsBytes)
	if !strings.Contains(ts, "export type ReleaseReviewView = 'open' | 'history' | 'own'") {
		t.Fatal("frontend ReleaseReviewView must expose open, history, and own")
	}
	if !strings.Contains(ts, "allowed_types: ReleaseReviewType[]") {
		t.Fatal("frontend ReleaseReviewCounts must expose allowed_types")
	}
}

func phase142SameStrings(actual, expected []string) bool {
	if len(actual) != len(expected) {
		return false
	}
	for index, value := range actual {
		if value != expected[index] {
			return false
		}
	}
	return true
}

func phase142Contains(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
