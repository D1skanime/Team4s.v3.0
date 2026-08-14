package repository

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	memberSlugNonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)
	memberSlugNumeric         = regexp.MustCompile(`^[0-9]+$`)
)

type publicMemberProfileBaseRow struct {
	memberID            int64
	publicSlug          string
	fansubName          string
	bio                 *string
	memberStoryHTML     *string
	activeFromDate      *string
	activeUntilDate     *string
	isCurrentlyActive   bool
	noindex             bool
	isVerified          bool
	profileStatus       string
	profileVisibility   *string
	avatarPath          *string
	backgroundImagePath *string
}

type MemberProfileRepository struct {
	db            *pgxpool.Pool
	publicBaseURL string
}

func NewMemberProfileRepository(db *pgxpool.Pool, publicBaseURL string) *MemberProfileRepository {
	return &MemberProfileRepository{
		db:            db,
		publicBaseURL: strings.TrimRight(strings.TrimSpace(publicBaseURL), "/"),
	}
}

func (r *MemberProfileRepository) publicURLForPath(filePath string) string {
	trimmed := strings.TrimSpace(filePath)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	normalized := strings.ReplaceAll(trimmed, "\\", "/")
	if strings.HasPrefix(normalized, "/app/media/") {
		trimmed = "/media/" + strings.TrimPrefix(normalized, "/app/media/")
	} else if strings.HasPrefix(normalized, "app/media/") {
		trimmed = "/media/" + strings.TrimPrefix(normalized, "app/media/")
	} else if strings.HasPrefix(normalized, "media/") {
		trimmed = "/" + normalized
	}
	if !strings.HasPrefix(trimmed, "/") {
		trimmed = "/" + trimmed
	}
	return r.publicBaseURL + trimmed
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	return &trimmed
}

func normalizeLoadedOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func rawJSONToNullableString(value *json.RawMessage) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(string(*value))
	if trimmed == "" || trimmed == "null" {
		return nil
	}
	return &trimmed
}

func rawJSONMessagePtr(value []byte) *json.RawMessage {
	trimmed := strings.TrimSpace(string(value))
	if trimmed == "" || trimmed == "null" {
		return nil
	}
	raw := json.RawMessage(append([]byte(nil), []byte(trimmed)...))
	return &raw
}

func normalizeProfileActivityDate(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", trimmed)
	if err != nil || parsed.Format("2006-01-02") != trimmed {
		return nil, ErrValidation
	}
	if parsed.Month() != time.January || parsed.Day() != 1 {
		return nil, ErrValidation
	}
	year := parsed.Year()
	if year < 1970 || year > 2100 {
		return nil, ErrValidation
	}
	return &trimmed, nil
}

func isValidProfileActivityRange(from *string, until *string) bool {
	if from == nil || until == nil {
		return true
	}
	return *until >= *from
}

func profileActivityDateOrYear(dateValue *string, yearValue *int32) *string {
	if dateValue != nil && strings.TrimSpace(*dateValue) != "" {
		trimmed := strings.TrimSpace(*dateValue)
		return &trimmed
	}
	if yearValue == nil || *yearValue < 1970 || *yearValue > 2100 {
		return nil
	}
	value := fmt.Sprintf("%04d-01-01", *yearValue)
	return &value
}

func valueOrDefault(value *string, fallback string) string {
	if value == nil {
		return fallback
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func valueOrNow(value *time.Time) time.Time {
	if value == nil {
		return time.Now().UTC()
	}
	return *value
}

func valueOrZeroInt64(value *int64) int64 {
	if value == nil {
		return 0
	}
	return *value
}

func isCheckViolation(err error) bool {
	return isPgErrorCode(err, "23514")
}
