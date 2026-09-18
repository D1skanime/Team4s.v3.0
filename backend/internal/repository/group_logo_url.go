package repository

import (
	"fmt"
	"net/url"
	"strings"
)

// group_logo_url.go is the single backend location for the GAP-01 group-logo
// public URL rule (164-UAT.md), reused by episode_version_public_query.go (the
// public anime page) and release_detail_public_repository_helpers.go (the
// release detail page). The UAT root-cause note for GAP-01 explicitly flagged
// that the same broken logo-URL-from-file_path expression existed
// independently in both files; centralizing it here (WR-02) is what keeps a
// future edit -- like the escaping fix below (WR-03) -- from having to be
// made twice and risking the two pages disagreeing again.
//
// The URL itself is assembled in Go, not SQL: SQL only ever emits the raw
// basename (or the raw fallback external URL), and buildGroupLogoURL does the
// percent-encoding here using the same url.PathEscape call every other
// stored-filename-to-public-URL path in this codebase already uses
// (MediaRepository.buildPublicURL, fansub_media_upload.go,
// admin_content_anime_themes.go). Escaping in SQL via string concatenation
// would have to reimplement PathEscape byte-for-byte; doing it once in Go
// instead means a filename with a space or a special character round-trips to
// a valid URL rather than a broken link.

// groupLogoFileNameSQL returns a SQL expression yielding the group's uploaded
// logo's raw basename (NULL if the group has no logo asset or its file_path
// is blank). logoAlias must reference a media_assets row joined as the
// group's logo (fg.logo_id = <logoAlias>.id).
func groupLogoFileNameSQL(logoAlias string) string {
	return fmt.Sprintf(`CASE WHEN NULLIF(TRIM(%[1]s.file_path), '') IS NOT NULL
    THEN regexp_replace(TRIM(%[1]s.file_path), '^.*/', '')
    ELSE NULL END`, logoAlias)
}

// groupLogoFallbackURLSQL returns a SQL expression yielding the group's
// externally-stored logo_url (NULL if blank), used only when the group has no
// uploaded logo asset. groupAlias must reference the fansub_groups row.
func groupLogoFallbackURLSQL(groupAlias string) string {
	return fmt.Sprintf(`NULLIF(TRIM(%s.logo_url), '')`, groupAlias)
}

// buildGroupLogoURL turns the raw SQL-side parts (see above) into the final
// public logo URL: a properly percent-escaped `/api/v1/media/files/<name>`
// path when the group has an uploaded logo asset, otherwise the externally
// stored fallback URL verbatim (it is not a locally-served filename, so it is
// not re-escaped), otherwise nil.
func buildGroupLogoURL(fileName, fallbackURL *string) *string {
	if fileName != nil {
		if trimmed := strings.TrimSpace(*fileName); trimmed != "" {
			built := "/api/v1/media/files/" + url.PathEscape(trimmed)
			return &built
		}
	}
	if fallbackURL != nil {
		if trimmed := strings.TrimSpace(*fallbackURL); trimmed != "" {
			return &trimmed
		}
	}
	return nil
}
