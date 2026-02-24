package handlers

import (
	"reflect"
	"testing"
)

func TestNormalizeMergeSourceIDs_Deduplicates(t *testing.T) {
	normalized, message := normalizeMergeSourceIDs(10, []int64{1, 2, 2, 3, 1})
	if message != "" {
		t.Fatalf("expected no validation message, got %q", message)
	}

	expected := []int64{1, 2, 3}
	if !reflect.DeepEqual(normalized, expected) {
		t.Fatalf("expected %v, got %v", expected, normalized)
	}
}

func TestNormalizeMergeSourceIDs_RejectsInvalidSource(t *testing.T) {
	_, message := normalizeMergeSourceIDs(10, []int64{1, 0, 2})
	if message != "ungueltige source_id" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestNormalizeMergeSourceIDs_RejectsTargetInSources(t *testing.T) {
	_, message := normalizeMergeSourceIDs(10, []int64{1, 10, 2})
	if message != "zielgruppe darf nicht in quellgruppen enthalten sein" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestNormalizeMergeSourceIDs_RejectsEmptySourceList(t *testing.T) {
	_, message := normalizeMergeSourceIDs(10, []int64{})
	if message != "source_ids darf nicht leer sein" {
		t.Fatalf("unexpected message: %q", message)
	}
}
