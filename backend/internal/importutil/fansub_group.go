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
	scenePrefixGroupPattern     = regexp.MustCompile(`^(?P<group>[A-Za-z0-9]+)-`)
	sceneEpisodeMarkerPattern   = regexp.MustCompile(`(?i)s\d{1,2}e\d{1,4}`)

	hex8Pattern            = regexp.MustCompile(`^[0-9a-fA-F]{8}$`)
	pureDigitsPattern      = regexp.MustCompile(`^\d+$`)
	resolutionPPattern     = regexp.MustCompile(`(?i)^\d{3,4}p$`)
	resolutionWxHPattern   = regexp.MustCompile(`^\d{3,4}x\d{3,4}$`)
	multiTokenSplitPattern = regexp.MustCompile(`[._\s-]+`)

	technicalCompoundTokens = map[string]bool{
		"h264": true, "x264": true, "x265": true, "hevc": true, "10bit": true,
		"aac": true, "flac": true, "bd": true, "web": true, "webdl": true,
		"bdrip": true, "dvdrip": true,
	}
	technicalLanguageTokens = map[string]bool{
		"ger": true, "gersub": true, "german": true, "dl": true, "eng": true,
		"subbed": true, "dub": true, "uncut": true,
	}
)

// DeriveFansubGroupName returns the best-effort visible release group name
// from a Jellyfin-backed file candidate. The import UI uses this for operator
// defaults, so the function intentionally preserves the raw detected spelling
// instead of trying to normalize typos.
//
// D-05: only the filename is evaluated; fullPath is used only as a fallback
// when the filename itself is empty (it is never concatenated into the
// search evidence alongside a non-empty filename).
// D-06: a technical bracket (CRC checksum, resolution, codec/container,
// language/source tag, pure digits) is never returned as a group name,
// regardless of its position among multiple brackets in the filename.
// D-07: the scene-release schema `gruppe-titel.sXXeYY...` is recognized,
// in addition to the four schemas that already worked. WR-01 (167-REVIEW.md):
// the scene-prefix candidate is only accepted when it is entirely lowercase
// (`dmpd-mashle...` — the real, all-lowercase, dot-separated scene-release
// convention this schema targets), because ordinary Title-Case hyphenated
// anime titles (`Attack-on-Titan`, `Re-Zero`, `K-On`, `One-Punch-Man`,
// `Non-Non-Biyori`) would otherwise false-positive on the first word before
// the hyphen whenever an sXXeYY marker appears anywhere later in the name.
// Per D-06 ("guess nothing when uncertain"), any candidate containing an
// uppercase letter is rejected rather than guessed.
func DeriveFansubGroupName(fileName string, fullPath string) string {
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

	if candidate, ok := firstNonTechnicalBracketGroup(baseName); ok {
		return candidate
	}

	if sceneEpisodeMarkerPattern.MatchString(baseName) {
		if match := scenePrefixGroupPattern.FindStringSubmatch(baseName); len(match) >= 2 {
			candidate := strings.TrimSpace(match[1])
			if candidate != "" && candidate == strings.ToLower(candidate) && !isTechnicalGroupToken(candidate) {
				return candidate
			}
		}
	}

	if match := suffixedFansubGroupPattern.FindStringSubmatch(baseName); len(match) >= 2 {
		candidate := strings.TrimSpace(strings.Trim(match[1], "-._ "))
		if candidate != "" && !isTechnicalGroupToken(candidate) {
			return candidate
		}
	}

	return ""
}

// firstNonTechnicalBracketGroup scans every `[...]` bracket in baseName, left
// to right, and returns the content of the first one that does not satisfy
// isTechnicalGroupToken (Pitfall 4: a technical bracket appearing before the
// real group bracket must not win just because it comes first).
func firstNonTechnicalBracketGroup(baseName string) (string, bool) {
	matches := bracketedFansubGroupPattern.FindAllStringSubmatch(baseName, -1)
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		candidate := strings.TrimSpace(match[1])
		if candidate == "" {
			continue
		}
		if !isTechnicalGroupToken(candidate) {
			return candidate, true
		}
	}
	return "", false
}

// isTechnicalGroupToken implements the D-06 denylist uniformly for every
// candidate (bracket content, scene-prefix capture, suffix capture): a CRC
// checksum, a resolution, a codec/container tag, a language/source tag, or a
// pure number is never a valid group name. A multi-token candidate (split on
// separators) is technical only if every one of its parts is individually
// technical, so real group names like "FH-Subs" or "Pure-Ani-me" survive.
func isTechnicalGroupToken(candidate string) bool {
	trimmed := strings.TrimSpace(candidate)
	if trimmed == "" {
		return true
	}
	if isTechnicalToken(trimmed) {
		return true
	}

	parts := multiTokenSplitPattern.Split(trimmed, -1)
	nonEmptyParts := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			nonEmptyParts = append(nonEmptyParts, part)
		}
	}
	if len(nonEmptyParts) == 0 {
		return true
	}
	for _, part := range nonEmptyParts {
		if !isTechnicalToken(part) {
			return false
		}
	}
	return true
}

// isTechnicalToken checks a single token (no further splitting) against the
// D-06 denylist categories: 8-char hex CRC, pure digits, resolution-with-p,
// resolution WxH, compound codec/container tag, exact language/source tag.
func isTechnicalToken(token string) bool {
	if token == "" {
		return false
	}
	if hex8Pattern.MatchString(token) {
		return true
	}
	if pureDigitsPattern.MatchString(token) {
		return true
	}
	if resolutionPPattern.MatchString(token) {
		return true
	}
	if resolutionWxHPattern.MatchString(token) {
		return true
	}
	compound := strings.ToLower(strings.NewReplacer(".", "", "_", "", " ", "").Replace(token))
	if technicalCompoundTokens[compound] {
		return true
	}
	if technicalLanguageTokens[strings.ToLower(token)] {
		return true
	}
	return false
}
