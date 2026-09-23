package importutil

import (
	"path/filepath"
	"regexp"
	"strings"
)

// releaseVersionPattern matches an explicit version suffix (v2..v9) anchored
// to the true end of the extension-stripped filename. No preceding-separator
// requirement is imposed, so it matches both a glued form (e.g. "...]v4")
// and a separated form (e.g. "...-v2", "...v3") uniformly. v1 is excluded by
// the [2-9] character class per D-04, since it is the implicit default and
// must never be reported as "detected".
var releaseVersionPattern = regexp.MustCompile(`(?i)v([2-9])$`)

// DeriveReleaseVersion detects an explicit release-version suffix (v2/v3/v4,
// ...) at the true end of a filename, distinct from the implicit default v1.
// It reports (version, true) when a version 2-9 is found, or ("", false)
// when there is none (including when the suffix is v1, or when a
// v-plus-digit sequence occurs anywhere other than the true end).
func DeriveReleaseVersion(fileName string) (version string, detected bool) {
	baseName := strings.TrimSpace(fileName)
	if baseName == "" {
		return "", false
	}

	baseName = strings.TrimSpace(strings.TrimSuffix(baseName, filepath.Ext(baseName)))
	if baseName == "" {
		return "", false
	}

	match := releaseVersionPattern.FindString(baseName)
	if match == "" {
		return "", false
	}

	return strings.ToLower(match), true
}
