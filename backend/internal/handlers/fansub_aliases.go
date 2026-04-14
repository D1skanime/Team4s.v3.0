package handlers

import (
	"path"
	"regexp"
	"strings"

	"team4s.v3/backend/internal/models"
)

var releaseGroupMarkerRegex = regexp.MustCompile(`(?i)s\d{1,2}e\d{1,3}`)

type fansubAliasResolver struct {
	aliases map[string]int64
}

func newFansubAliasResolver(candidates []models.AnimeFansubAliasCandidate) *fansubAliasResolver {
	resolver := &fansubAliasResolver{
		aliases: make(map[string]int64, len(candidates)),
	}
	for _, candidate := range candidates {
		if candidate.FansubGroupID <= 0 {
			continue
		}
		key := normalizeFansubAliasKey(candidate.Alias)
		if key == "" {
			continue
		}

		existingGroupID, exists := resolver.aliases[key]
		if !exists {
			resolver.aliases[key] = candidate.FansubGroupID
			continue
		}
		if existingGroupID == candidate.FansubGroupID {
			continue
		}
		// Mark ambiguous alias keys as unusable for auto-linking.
		resolver.aliases[key] = 0
	}

	return resolver
}

// Resolve sucht anhand von Dateiname und Pfad eine eindeutige Fansub-Gruppen-ID über bekannte Aliase.
// Gibt nil zurück, wenn kein eindeutiger Treffer gefunden wird.
func (r *fansubAliasResolver) Resolve(itemName string, itemPath string) *int64 {
	if r == nil || len(r.aliases) == 0 {
		return nil
	}

	for _, key := range extractReleaseGroupAliasCandidates(itemName, itemPath) {
		groupID, ok := r.aliases[key]
		if !ok || groupID <= 0 {
			continue
		}
		matchedGroupID := groupID
		return &matchedGroupID
	}

	return nil
}

func extractReleaseGroupAliasCandidates(itemName string, itemPath string) []string {
	candidates := make([]string, 0, 4)
	seen := make(map[string]struct{}, 4)

	appendCandidate := func(raw string) {
		key := normalizeFansubAliasKey(raw)
		if key == "" {
			return
		}
		if _, exists := seen[key]; exists {
			return
		}
		seen[key] = struct{}{}
		candidates = append(candidates, key)
	}

	basename := fileBaseWithoutExt(itemPath)
	if suffix := releaseGroupSuffix(basename); suffix != "" {
		appendCandidate(suffix)
	}
	if suffix := releaseGroupSuffix(itemName); suffix != "" {
		appendCandidate(suffix)
	}

	return candidates
}

func releaseGroupSuffix(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}

	indices := releaseGroupMarkerRegex.FindAllStringIndex(trimmed, -1)
	if len(indices) == 0 {
		return ""
	}

	last := indices[len(indices)-1]
	if len(last) != 2 || last[1] >= len(trimmed) {
		return ""
	}

	suffix := strings.TrimSpace(trimmed[last[1]:])
	suffix = strings.Trim(suffix, " ._-[]()")
	if suffix == "" {
		return ""
	}

	return suffix
}

func fileBaseWithoutExt(rawPath string) string {
	normalized := strings.TrimSpace(rawPath)
	if normalized == "" {
		return ""
	}
	normalized = strings.ReplaceAll(normalized, "\\", "/")
	base := path.Base(normalized)
	ext := path.Ext(base)
	if ext != "" {
		base = strings.TrimSuffix(base, ext)
	}
	return strings.TrimSpace(base)
}

func normalizeFansubAliasKey(raw string) string {
	trimmed := strings.ToLower(strings.TrimSpace(raw))
	if trimmed == "" {
		return ""
	}

	var builder strings.Builder
	builder.Grow(len(trimmed))
	for _, r := range trimmed {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
		}
	}

	return builder.String()
}
