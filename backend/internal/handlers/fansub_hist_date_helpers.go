package handlers

import (
	"fmt"
	"strings"
	"time"
)

func parseOptionalDate(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", trimmed)
	if err != nil {
		return nil, fmt.Errorf("Format JJJJ-MM-TT erwartet")
	}
	return &parsed, nil
}

func parseOptionalPatchDate(value **string) (**time.Time, error) {
	if value == nil {
		return nil, nil
	}
	if *value == nil {
		var cleared *time.Time
		return &cleared, nil
	}
	parsed, err := parseOptionalDate(*value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
