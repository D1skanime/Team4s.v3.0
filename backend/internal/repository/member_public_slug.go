package repository

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"github.com/jackc/pgx/v5"
	"golang.org/x/text/unicode/norm"
)

const publicMemberSlugMaxLength = 120

var (
	publicMemberSlugSeparators = regexp.MustCompile(`[^a-z0-9]+`)
	publicMemberSlugNumeric    = regexp.MustCompile(`^[0-9]+$`)
	publicMemberSlugReserved   = map[string]struct{}{
		"admin":    {},
		"api":      {},
		"edit":     {},
		"me":       {},
		"members":  {},
		"new":      {},
		"profile":  {},
		"ranking":  {},
		"settings": {},
	}
)

func normalizePublicMemberSlug(nickname string) (string, error) {
	for _, char := range nickname {
		if unicode.IsControl(char) || char == '/' || char == '\\' {
			return "", fmt.Errorf("normalize public member slug: control and path separator characters are not allowed: %w", ErrValidation)
		}
	}

	replaced := strings.NewReplacer(
		"\u00e4", "ae",
		"\u00f6", "oe",
		"\u00fc", "ue",
		"\u00df", "ss",
		"&", " und ",
	).Replace(strings.ToLower(strings.TrimSpace(nickname)))
	decomposed := norm.NFD.String(replaced)
	runes := make([]rune, 0, len(decomposed))
	for _, char := range decomposed {
		if unicode.Is(unicode.Mn, char) {
			continue
		}
		runes = append(runes, char)
	}

	slug := strings.Trim(publicMemberSlugSeparators.ReplaceAllString(string(runes), "-"), "-")
	if slug == "" {
		return "", fmt.Errorf("normalize public member slug: nickname has no usable characters: %w", ErrValidation)
	}
	if len(slug) > publicMemberSlugMaxLength {
		return "", fmt.Errorf("normalize public member slug: result exceeds %d characters: %w", publicMemberSlugMaxLength, ErrValidation)
	}
	if publicMemberSlugNumeric.MatchString(slug) {
		return "", fmt.Errorf("normalize public member slug: numeric-only results are not allowed: %w", ErrValidation)
	}
	if _, reserved := publicMemberSlugReserved[slug]; reserved {
		return "", fmt.Errorf("normalize public member slug: %q is reserved: %w", slug, ErrValidation)
	}
	return slug, nil
}

func allocatePublicMemberSlugTx(ctx context.Context, tx pgx.Tx, nickname string) (string, error) {
	if tx == nil {
		return "", fmt.Errorf("allocate public member slug: transaction is required: %w", ErrValidation)
	}
	base, err := normalizePublicMemberSlug(nickname)
	if err != nil {
		return "", fmt.Errorf("allocate public member slug: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		SELECT pg_advisory_xact_lock(hashtextextended('members.public_slug', 0))
	`); err != nil {
		return "", fmt.Errorf("allocate public member slug: lock namespace: %w", err)
	}

	for suffix := 1; ; suffix++ {
		candidate := publicMemberSlugCandidate(base, suffix)
		var exists bool
		if err := tx.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT 1
				FROM members
				WHERE public_slug = $1
			)
		`, candidate).Scan(&exists); err != nil {
			return "", fmt.Errorf("allocate public member slug: check candidate %q: %w", candidate, err)
		}
		if !exists {
			return candidate, nil
		}
	}
}

func publicMemberSlugCandidate(base string, suffix int) string {
	if suffix <= 1 {
		return base
	}
	suffixText := fmt.Sprintf("-%d", suffix)
	baseLimit := publicMemberSlugMaxLength - len(suffixText)
	candidateBase := base
	if len(candidateBase) > baseLimit {
		candidateBase = strings.TrimRight(candidateBase[:baseLimit], "-")
	}
	return candidateBase + suffixText
}
