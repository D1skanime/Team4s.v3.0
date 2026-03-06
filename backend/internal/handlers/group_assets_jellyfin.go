package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
)

type jellyfinGroupItemsResponse struct {
	Items []jellyfinGroupItem `json:"Items"`
}

type jellyfinLibraryFoldersResponse struct {
	Items []jellyfinLibraryFolder `json:"Items"`
}

type jellyfinLibraryFolder struct {
	ID   string `json:"Id"`
	Name string `json:"Name"`
	Path string `json:"Path"`
}

type jellyfinGroupItem struct {
	ID                string            `json:"Id"`
	Name              string            `json:"Name"`
	Type              string            `json:"Type"`
	Path              string            `json:"Path"`
	ImageTags         map[string]string `json:"ImageTags"`
	BackdropImageTags []string          `json:"BackdropImageTags"`
	Width             *int32            `json:"Width"`
	Height            *int32            `json:"Height"`
	RunTimeTicks      *int64            `json:"RunTimeTicks"`
}

var episodeFolderPattern = regexp.MustCompile(`(?i)^episode\s+(\d+)$`)

func (h *GroupAssetsHandler) resolveGroupAssets(
	ctx context.Context,
	animeID int64,
	groupDetail *models.GroupDetail,
) (models.GroupAssetsData, error) {
	candidates := buildSubgroupSuffixCandidates(groupDetail.Fansub.Slug, groupDetail.Fansub.Name)
	payload := models.GroupAssetsData{
		AnimeID:  animeID,
		GroupID:  groupDetail.Fansub.ID,
		Hero:     models.GroupAssetHero{},
		Episodes: []models.GroupEpisodeAssets{},
	}

	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		return payload, nil
	}

	root, err := h.findSubgroupRoot(ctx, animeID, candidates)
	if err != nil || root == nil {
		return payload, err
	}

	payload.FolderName = root.Name
	payload.Hero = buildGroupAssetHero(*root)
	items, err := h.listSubgroupChildren(ctx, root.ID)
	if err != nil {
		return payload, err
	}
	payload.Episodes = buildGroupEpisodeAssets(root.Path, items)
	return payload, nil
}

func buildSubgroupSuffixCandidates(groupSlug string, groupName string) []string {
	candidates := make([]string, 0, 16)
	addRawVariants := func(raw string) {
		base := normalizeAssetToken(raw)
		if base == "" {
			return
		}
		pushUnique(&candidates, base)
		pushUnique(&candidates, strings.ReplaceAll(base, "-", " "))
		pushUnique(&candidates, strings.ReplaceAll(base, "-", ""))

		trimmedSubs := strings.TrimSuffix(base, "-subs")
		trimmedSubs = strings.TrimSuffix(trimmedSubs, "subs")
		trimmedSubs = strings.TrimSuffix(trimmedSubs, "-sub")
		trimmedSubs = strings.TrimSuffix(trimmedSubs, "sub")
		trimmedSubs = strings.Trim(trimmedSubs, "- ")
		if trimmedSubs == "" || trimmedSubs == base {
			return
		}

		pushUnique(&candidates, trimmedSubs)
		pushUnique(&candidates, trimmedSubs+"-subs")
		pushUnique(&candidates, strings.ReplaceAll(trimmedSubs+"-subs", "-", " "))
		pushUnique(&candidates, strings.ReplaceAll(trimmedSubs+"-subs", "-", ""))
	}

	addRawVariants(groupSlug)
	addRawVariants(groupName)
	return candidates
}

func pushUnique(target *[]string, value string) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" || slices.Contains(*target, trimmed) {
		return
	}
	*target = append(*target, trimmed)
}

func normalizeAssetToken(value string) string {
	lowered := strings.ToLower(strings.TrimSpace(value))
	if lowered == "" {
		return ""
	}
	var builder strings.Builder
	lastDash := false
	for _, r := range lowered {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}

func (h *GroupAssetsHandler) findSubgroupRoot(
	ctx context.Context,
	animeID int64,
	suffixCandidates []string,
) (*jellyfinGroupItem, error) {
	subgroupsLibraryID, err := h.getSubgroupsLibraryID(ctx)
	if err != nil || strings.TrimSpace(subgroupsLibraryID) == "" {
		return nil, err
	}

	values := url.Values{}
	values.Set("ParentId", subgroupsLibraryID)
	values.Set("Limit", "500")
	values.Set("Fields", "Path,ImageTags,BackdropImageTags")
	values.Set("IncludeItemTypes", "PhotoAlbum,Folder")

	var payload jellyfinGroupItemsResponse
	if err := h.fetchGroupAssetsJSON(ctx, "/Items", values, &payload); err != nil {
		return nil, err
	}

	normalizedPrefix := strconv.FormatInt(animeID, 10) + "-"
	bestScore := -1
	var best *jellyfinGroupItem
	for _, item := range payload.Items {
		baseName := strings.TrimSpace(filepath.Base(strings.ReplaceAll(item.Path, "\\", "/")))
		if baseName == "." || baseName == "" {
			baseName = item.Name
		}
		normalizedName := normalizeAssetToken(baseName)
		if !strings.HasPrefix(normalizedName, normalizedPrefix) {
			continue
		}

		score := scoreSubgroupFolderMatch(normalizedName, suffixCandidates)
		if score <= bestScore {
			continue
		}
		found := item
		bestScore = score
		best = &found
	}
	return best, nil
}

func (h *GroupAssetsHandler) getSubgroupsLibraryID(ctx context.Context) (string, error) {
	var payload jellyfinLibraryFoldersResponse
	if err := h.fetchGroupAssetsJSON(ctx, "/Library/MediaFolders", url.Values{}, &payload); err != nil {
		return "", err
	}
	for _, item := range payload.Items {
		if strings.EqualFold(strings.TrimSpace(item.Name), "Subgroups") {
			return item.ID, nil
		}
	}
	return "", nil
}

func scoreSubgroupFolderMatch(normalizedName string, suffixCandidates []string) int {
	best := -1
	for _, candidate := range suffixCandidates {
		normalizedCandidate := normalizeAssetToken(candidate)
		if normalizedCandidate == "" {
			continue
		}
		switch {
		case strings.HasSuffix(normalizedName, "-"+normalizedCandidate):
			if score := 80 + len(normalizedCandidate); score > best {
				best = score
			}
		case strings.HasSuffix(normalizedName, normalizedCandidate):
			if score := 60 + len(normalizedCandidate); score > best {
				best = score
			}
		}
	}
	return best
}

func (h *GroupAssetsHandler) listSubgroupChildren(ctx context.Context, rootID string) ([]jellyfinGroupItem, error) {
	values := url.Values{}
	values.Set("ParentId", rootID)
	values.Set("Recursive", "true")
	values.Set("Limit", "200")
	values.Set("Fields", "Path,Width,Height,ImageTags,RunTimeTicks")

	var payload jellyfinGroupItemsResponse
	if err := h.fetchGroupAssetsJSON(ctx, "/Items", values, &payload); err != nil {
		return nil, err
	}
	slices.SortFunc(payload.Items, func(left, right jellyfinGroupItem) int {
		return strings.Compare(left.Path, right.Path)
	})
	return payload.Items, nil
}

func (h *GroupAssetsHandler) fetchGroupAssetsJSON(ctx context.Context, apiPath string, query url.Values, target any) error {
	baseURL := strings.TrimSpace(h.jellyfinBaseURL)
	parsedBase, err := url.Parse(baseURL)
	if err != nil {
		return fmt.Errorf("parse jellyfin base url: %w", err)
	}
	parsedBase.Path = strings.TrimRight(parsedBase.Path, "/") + "/" + strings.TrimLeft(apiPath, "/")
	query.Set("api_key", strings.TrimSpace(h.jellyfinAPIKey))
	parsedBase.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsedBase.String(), nil)
	if err != nil {
		return fmt.Errorf("create jellyfin request: %w", err)
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("call jellyfin: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("jellyfin returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read jellyfin response: %w", err)
	}
	if err := json.Unmarshal(body, target); err != nil {
		return fmt.Errorf("decode jellyfin response: %w", err)
	}
	return nil
}

func buildGroupAssetHero(root jellyfinGroupItem) models.GroupAssetHero {
	hero := models.GroupAssetHero{}
	if len(root.BackdropImageTags) > 0 {
		url := buildGroupMediaImageURL(root.ID, "backdrop")
		hero.BackdropURL = &url
	}
	if _, ok := root.ImageTags["Primary"]; ok {
		url := buildGroupMediaImageURL(root.ID, "primary")
		hero.PrimaryURL = &url
		hero.PosterURL = &url
	}
	return hero
}

func buildGroupEpisodeAssets(rootPath string, items []jellyfinGroupItem) []models.GroupEpisodeAssets {
	episodes := make(map[int32]*models.GroupEpisodeAssets)
	for _, item := range items {
		episodeNumber, folderName, ok := resolveEpisodeFolder(rootPath, item.Path)
		if !ok {
			continue
		}
		entry := ensureEpisodeAssets(episodes, episodeNumber, folderName, path.Join(rootPath, folderName))
		switch item.Type {
		case "Photo":
			entry.Images = append(entry.Images, buildGroupAssetImage(int32(len(entry.Images)), item))
		case "Video":
			asset, ok := buildGroupAssetMedia(int32(len(entry.MediaAssets)), item)
			if ok {
				entry.MediaAssets = append(entry.MediaAssets, asset)
			}
		}
	}

	numbers := make([]int32, 0, len(episodes))
	for number := range episodes {
		numbers = append(numbers, number)
	}
	slices.Sort(numbers)

	result := make([]models.GroupEpisodeAssets, 0, len(numbers))
	for _, number := range numbers {
		result = append(result, *episodes[number])
	}
	return result
}

func ensureEpisodeAssets(
	items map[int32]*models.GroupEpisodeAssets,
	episodeNumber int32,
	folderName string,
	folderPath string,
) *models.GroupEpisodeAssets {
	if existing, ok := items[episodeNumber]; ok {
		return existing
	}
	items[episodeNumber] = &models.GroupEpisodeAssets{
		EpisodeNumber: episodeNumber,
		FolderName:    folderName,
		FolderPath:    folderPath,
		Images:        []models.GroupAssetImage{},
		MediaAssets:   []models.GroupAssetMedia{},
	}
	return items[episodeNumber]
}

func resolveEpisodeFolder(rootPath string, itemPath string) (int32, string, bool) {
	relativePath := strings.TrimPrefix(itemPath, strings.TrimRight(rootPath, "/")+"/")
	if relativePath == itemPath || relativePath == "" {
		return 0, "", false
	}
	parts := strings.Split(relativePath, "/")
	if len(parts) < 2 {
		return 0, "", false
	}
	match := episodeFolderPattern.FindStringSubmatch(parts[0])
	if len(match) != 2 {
		return 0, "", false
	}
	number, err := strconv.Atoi(match[1])
	if err != nil || number <= 0 {
		return 0, "", false
	}
	return int32(number), parts[0], true
}

func buildGroupAssetImage(order int32, item jellyfinGroupItem) models.GroupAssetImage {
	return models.GroupAssetImage{
		ID:           item.ID,
		Title:        item.Name,
		ImageURL:     buildGroupMediaImageURL(item.ID, "primary"),
		ThumbnailURL: buildGroupMediaImageURL(item.ID, "primary"),
		Width:        item.Width,
		Height:       item.Height,
		Order:        order + 1,
	}
}

func buildGroupAssetMedia(order int32, item jellyfinGroupItem) (models.GroupAssetMedia, bool) {
	assetType, ok := classifyGroupMediaType(item.Name, item.Path)
	if !ok {
		return models.GroupAssetMedia{}, false
	}
	return models.GroupAssetMedia{
		ID:              item.ID,
		Type:            assetType,
		Title:           item.Name,
		ThumbnailURL:    stringPtr(buildGroupMediaImageURL(item.ID, "primary")),
		DurationSeconds: durationSecondsFromTicks(item.RunTimeTicks),
		Order:           order + 1,
		StreamPath:      buildGroupMediaVideoURL(item.ID),
	}, true
}

func classifyGroupMediaType(name string, itemPath string) (models.GroupAssetMediaType, bool) {
	normalized := strings.ToLower(strings.TrimSpace(name + " " + itemPath))
	switch {
	case strings.Contains(normalized, "opening") || strings.Contains(normalized, "/op"):
		return models.GroupAssetMediaTypeOpening, true
	case strings.Contains(normalized, "ending") || strings.Contains(normalized, "/ed"):
		return models.GroupAssetMediaTypeEnding, true
	case strings.Contains(normalized, "karaoke") || strings.Contains(normalized, "kara"):
		return models.GroupAssetMediaTypeKaraoke, true
	case strings.Contains(normalized, "insert"):
		return models.GroupAssetMediaTypeInsert, true
	default:
		return "", false
	}
}

func durationSecondsFromTicks(value *int64) *int32 {
	if value == nil || *value <= 0 {
		return nil
	}
	seconds := int32(*value / 10000000)
	return &seconds
}

func buildGroupMediaImageURL(itemID string, kind string) string {
	values := url.Values{}
	values.Set("provider", "jellyfin")
	values.Set("item_id", itemID)
	values.Set("kind", kind)
	return "/api/v1/media/image?" + values.Encode()
}

func buildGroupMediaVideoURL(itemID string) string {
	values := url.Values{}
	values.Set("provider", "jellyfin")
	values.Set("item_id", itemID)
	return "/api/v1/media/video?" + values.Encode()
}

func stringPtr(value string) *string {
	return &value
}
