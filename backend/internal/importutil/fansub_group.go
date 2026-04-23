package importutil

import (
	"path"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	bracketedFansubGroupPattern = regexp.MustCompile(`\[(?P<group>[^\[\]]+)\]`)
	suffixedFansubGroupPattern  = regexp.MustCompile(`(?i)(?:^|[._\-\s])s\d{1,2}e\d{1,4}(?:-\d{1,4})?[-._\s]+(?P<group>[^.]+)$`)
)

// DeriveFansubGroupName returns the best-effort visible release group name
// from a Jellyfin-backed file candidate. The import UI uses this for operator
// defaults, so the function intentionally preserves the raw detected spelling
// instead of trying to normalize typos.
func DeriveFansubGroupName(fileName string, fullPath string) string {
	evidence := strings.TrimSpace(fileName + " " + fullPath)
	if match := bracketedFansubGroupPattern.FindStringSubmatch(evidence); len(match) >= 2 {
		return strings.TrimSpace(match[1])
	}

	baseName := strings.TrimSpace(fileName)
	if baseName == "" {
		normalizedPath := strings.ReplaceAll(strings.TrimSpace(fullPath), "\\", "/")
		if normalizedPath != "" {
			baseName = path.Base(normalizedPath)
		}
	}
	if baseName == "" {
		return ""
	}

	baseName = strings.TrimSpace(strings.TrimSuffix(baseName, filepath.Ext(baseName)))
	if baseName == "" {
		return ""
	}

	if match := suffixedFansubGroupPattern.FindStringSubmatch(baseName); len(match) >= 2 {
		return strings.TrimSpace(strings.Trim(match[1], "-._ "))
	}

	return ""
}
