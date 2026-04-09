package handlers

import (
	"context"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/services"
)

func (h *AdminContentHandler) previewJellysyncAnimeCreateFollowup(
	ctx context.Context,
	draft models.AdminAnimeCreateDraftPayload,
) (services.JellysyncFollowupResult, error) {
	seriesID := jellyfinSeriesIDFromSource(draft.Source)
	if seriesID == "" || !h.ensureJellyfinConfiguredForEditor() {
		return services.JellysyncFollowupResult{}, nil
	}

	detail, err := h.getJellyfinSeriesIntakeDetail(ctx, seriesID)
	if err != nil || detail == nil {
		return services.JellysyncFollowupResult{}, err
	}

	themeVideoIDs, err := h.listJellyfinThemeVideoIDs(ctx, seriesID)
	if err != nil {
		themeVideoIDs = nil
	}

	preview := buildAdminJellyfinIntakePreviewResult(*detail, themeVideoIDs)
	return services.BuildJellysyncFollowupResult(draft, preview), nil
}
