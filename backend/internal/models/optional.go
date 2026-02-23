package models

import (
	"bytes"
	"encoding/json"
	"time"
)

type OptionalInt32 struct {
	Set   bool
	Value *int32
}

func (o *OptionalInt32) UnmarshalJSON(data []byte) error {
	o.Set = true
	trimmed := bytes.TrimSpace(data)
	if bytes.Equal(trimmed, []byte("null")) {
		o.Value = nil
		return nil
	}

	var value int32
	if err := json.Unmarshal(trimmed, &value); err != nil {
		return err
	}

	o.Value = &value
	return nil
}

type OptionalInt64 struct {
	Set   bool
	Value *int64
}

func (o *OptionalInt64) UnmarshalJSON(data []byte) error {
	o.Set = true
	trimmed := bytes.TrimSpace(data)
	if bytes.Equal(trimmed, []byte("null")) {
		o.Value = nil
		return nil
	}

	var value int64
	if err := json.Unmarshal(trimmed, &value); err != nil {
		return err
	}

	o.Value = &value
	return nil
}

type OptionalBool struct {
	Set   bool
	Value *bool
}

func (o *OptionalBool) UnmarshalJSON(data []byte) error {
	o.Set = true
	trimmed := bytes.TrimSpace(data)
	if bytes.Equal(trimmed, []byte("null")) {
		o.Value = nil
		return nil
	}

	var value bool
	if err := json.Unmarshal(trimmed, &value); err != nil {
		return err
	}

	o.Value = &value
	return nil
}

type OptionalTime struct {
	Set   bool
	Value *time.Time
}

func (o *OptionalTime) UnmarshalJSON(data []byte) error {
	o.Set = true
	trimmed := bytes.TrimSpace(data)
	if bytes.Equal(trimmed, []byte("null")) {
		o.Value = nil
		return nil
	}

	var raw string
	if err := json.Unmarshal(trimmed, &raw); err != nil {
		return err
	}

	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return err
	}

	o.Value = &parsed
	return nil
}
