package models

import (
	"encoding/json"
	"testing"
)

func TestOptionalStringUnmarshalJSON(t *testing.T) {
	var value OptionalString
	if err := json.Unmarshal([]byte(`" Nico "`), &value); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !value.Set {
		t.Fatalf("expected field to be marked as set")
	}
	if value.Value == nil || *value.Value != " Nico " {
		t.Fatalf("unexpected optional string value: %+v", value.Value)
	}
}

func TestOptionalStringUnmarshalJSON_Null(t *testing.T) {
	var value OptionalString
	if err := json.Unmarshal([]byte(`null`), &value); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !value.Set {
		t.Fatalf("expected field to be marked as set")
	}
	if value.Value != nil {
		t.Fatalf("expected nil optional string value")
	}
}

func TestOptionalInt16UnmarshalJSON(t *testing.T) {
	var value OptionalInt16
	if err := json.Unmarshal([]byte(`42`), &value); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !value.Set {
		t.Fatalf("expected field to be marked as set")
	}
	if value.Value == nil || *value.Value != 42 {
		t.Fatalf("unexpected optional int16 value: %+v", value.Value)
	}
}
