package handlers

import (
	"context"
	"strings"

	"team4s.v3/backend/internal/models"
)

type episodeVersionEditorResolved struct {
	version          *models.EpisodeVersion
	animeSource      *models.AdminAnimeSyncSource
	animeFolderPath  *string
	jellyfinSeriesID string
	selectedGroups   []models.FansubGroupSummary
	collaborationID  *int64
}

func (h *AdminContentHandler) loadEpisodeVersionEditorContext(
	ctx context.Context,
	versionID int64,
) (*models.EpisodeVersionEditorContext, error) {
	resolved, err := h.resolveEpisodeVersionEditor(ctx, versionID)
	if err != nil {
		return nil, err
	}

	return &models.EpisodeVersionEditorContext{
		Version:              *resolved.version,
		AnimeTitle:           resolved.animeSource.Title,
		AnimeFolderPath:      resolved.animeFolderPath,
		CollaborationGroupID: resolved.collaborationID,
		SelectedGroups:       resolved.selectedGroups,
	}, nil
}

func (h *AdminContentHandler) resolveEpisodeVersionEditor(
	ctx context.Context,
	versionID int64,
) (*episodeVersionEditorResolved, error) {
	version, err := h.episodeVersionRepo.GetByID(ctx, versionID)
	if err != nil {
		return nil, err
	}

	animeSource, err := h.repo.GetAnimeSyncSource(ctx, version.AnimeID)
	if err != nil {
		return nil, err
	}

	folderPath, seriesID, err := h.resolveEpisodeVersionFolderPath(ctx, animeSource)
	if err != nil {
		return nil, err
	}

	selectedGroups, collaborationID, err := h.resolveEpisodeVersionSelectedGroups(ctx, version)
	if err != nil {
		return nil, err
	}

	return &episodeVersionEditorResolved{
		version:          version,
		animeSource:      animeSource,
		animeFolderPath:  folderPath,
		jellyfinSeriesID: seriesID,
		selectedGroups:   selectedGroups,
		collaborationID:  collaborationID,
	}, nil
}

func (h *AdminContentHandler) resolveEpisodeVersionFolderPath(
	ctx context.Context,
	animeSource *models.AdminAnimeSyncSource,
) (*string, string, error) {
	if animeSource == nil {
		return nil, "", nil
	}

	if seriesID := extractJellyfinSourceID(animeSource.Source); seriesID != "" {
		if h.ensureJellyfinConfiguredForEditor() {
			series, err := h.getJellyfinSeriesByID(ctx, seriesID)
			if err != nil {
				return nil, "", err
			}
			if series != nil {
				return normalizeNullableStringPtr(series.Path), seriesID, nil
			}
		}
		return normalizeNullableStringPtr(derefString(animeSource.FolderName)), seriesID, nil
	}

	if rawSource := strings.TrimSpace(derefString(animeSource.Source)); rawSource != "" {
		return normalizeNullableStringPtr(rawSource), "", nil
	}

	return normalizeNullableStringPtr(derefString(animeSource.FolderName)), "", nil
}

func (h *AdminContentHandler) resolveEpisodeVersionSelectedGroups(
	ctx context.Context,
	version *models.EpisodeVersion,
) ([]models.FansubGroupSummary, *int64, error) {
	if version == nil || version.FansubGroup == nil {
		return []models.FansubGroupSummary{}, nil, nil
	}

	group, err := h.fansubRepo.GetGroupByID(ctx, version.FansubGroup.ID)
	if err != nil {
		return []models.FansubGroupSummary{*version.FansubGroup}, nil, nil
	}
	if group.GroupType != models.FansubGroupTypeCollaboration {
		return []models.FansubGroupSummary{*version.FansubGroup}, nil, nil
	}

	members, err := h.fansubRepo.ListCollaborationMembers(ctx, group.ID)
	if err != nil {
		return nil, nil, err
	}

	selected := make([]models.FansubGroupSummary, 0, len(members))
	for _, member := range members {
		if member.MemberGroup == nil {
			continue
		}
		selected = append(selected, *member.MemberGroup)
	}
	if len(selected) == 0 {
		selected = append(selected, *version.FansubGroup)
	}

	collaborationID := group.ID
	return selected, &collaborationID, nil
}

func (h *AdminContentHandler) ensureJellyfinConfiguredForEditor() bool {
	return strings.TrimSpace(h.jellyfinBaseURL) != "" && strings.TrimSpace(h.jellyfinAPIKey) != ""
}

func (h *AdminContentHandler) buildJellyfinEditorStreamURL(itemID string) *string {
	streamURL, err := buildProviderStreamURL(
		h.jellyfinBaseURL,
		normalizeStreamPathTemplate(h.jellyfinStreamPath),
		h.jellyfinAPIKey,
		itemID,
	)
	if err != nil {
		return nil
	}
	return &streamURL
}
