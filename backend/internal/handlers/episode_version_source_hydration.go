package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

// Shared by import apply and editor relink: provider paths and selectors are
// evidence only after exact item, anime and selected-source ownership agree.
func resolveReviewedJellyfinSource(item jellyfinEpisodeItem, itemID, sourceID string, owned []jellyfinOwnedSource, stored *models.JellyfinSourceSnapshot) (resolvedJellyfinMediaSource, error) {
	fail := func(message string) (resolvedJellyfinMediaSource, error) {
		return resolvedJellyfinMediaSource{}, fmt.Errorf("%s", message)
	}
	if item.ID != itemID || item.Type != "Episode" {
		return fail("Die Jellyfin-Datei gehört nicht zur gespeicherten Anime-Zuordnung.")
	}
	match, ok := matchOwnedJellyfinSource(owned, strings.TrimSpace(item.SeriesID), item.Path)
	if !ok {
		return fail("Die Jellyfin-Datei gehört nicht zur gespeicherten Anime-Zuordnung.")
	}
	resolved, err := resolveJellyfinMediaSourceSelection(item, sourceID, stored)
	if err != nil || (sourceID != "" && resolved.Snapshot.MediaSourceID != sourceID) {
		return fail("Die geprüfte Jellyfin-Quelle hat sich geändert. Bitte Vorschau neu laden.")
	}
	if match.FolderPath != "" && !jellyfinPathHasPrefix(resolved.Snapshot.SourcePath, match.FolderPath) {
		return fail("Die Jellyfin-Quelle gehört nicht zum gespeicherten Anime-Ordner.")
	}
	if !resolved.Snapshot.StreamsComplete && (stored == nil || !stored.StreamsComplete) {
		return fail("Die Jellyfin-Quelle enthält keine vollständigen Stream-Daten. Bitte Vorschau neu laden.")
	}
	return resolved, nil
}

func sourceHydrationRepositoryStatus(err error) int {
	if errors.Is(err, repository.ErrNotFound) {
		return http.StatusNotFound
	}
	if errors.Is(err, repository.ErrConflict) {
		return http.StatusConflict
	}
	return http.StatusInternalServerError
}

func (h *FansubHandler) resolveEpisodeVersionSource(ctx context.Context, animeID int64, itemID, selector string, current *models.EpisodeVersion) (resolvedJellyfinMediaSource, *string, int, error) {
	fail := func(status int, message string) (resolvedJellyfinMediaSource, *string, int, error) {
		return resolvedJellyfinMediaSource{}, nil, status, fmt.Errorf("%s", message)
	}
	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		return fail(503, "Jellyfin ist nicht konfiguriert.")
	}
	anime, err := h.episodeVersionRepo.GetAnimeSyncSource(ctx, animeID)
	if err != nil {
		return fail(sourceHydrationRepositoryStatus(err), "Die Anime-Zuordnung konnte nicht geladen werden.")
	}
	seriesID := jellyfinSeriesIDFromAnimeSource(anime.Source, anime.SourceLinks)
	if seriesID == "" && normalizeJellyfinPath(anime.FolderName) == "" {
		return fail(409, "Der Anime hat keine überprüfbare Jellyfin-Zuordnung.")
	}
	folders := hydrateFansubFolderPathsForRelink(ctx, collectJellyfinFolderOptions(anime.Source, anime.SourceLinks, anime.Source), h.getJellyfinSourceItems)
	owned := ownedJellyfinSourcesFromFolders(seriesID, anime.FolderName, folders)
	bindings, err := h.episodeVersionRepo.GetJellyfinSourceBindings(ctx, []string{itemID})
	if err != nil {
		return fail(sourceHydrationRepositoryStatus(err), "Die gespeicherte Jellyfin-Quelle konnte nicht geladen werden.")
	}
	var stored *models.JellyfinSourceSnapshot
	if binding, ok := bindings[models.JellyfinSourceKey{ItemID: itemID, SourceID: selector}]; ok {
		stored = &binding
	}
	items, err := h.getJellyfinSourceItems(ctx, []string{itemID})
	if err != nil {
		var batchErr *jellyfinSourceBatchError
		if errors.As(err, &batchErr) {
			return fail(409, "Jellyfin-Dateien haben sich geändert. Bitte Vorschau neu laden.")
		}
		return fail(502, "Jellyfin-Dateien konnten nicht geladen werden.")
	}
	resolved, err := resolveReviewedJellyfinSource(items[itemID], itemID, selector, owned, stored)
	if err != nil {
		return resolved, nil, 409, err
	}
	// A complete stored B snapshot must not hide an incomplete A-to-B relink.
	if !resolved.Snapshot.StreamsComplete && (current == nil || current.MediaProvider != "jellyfin" || current.MediaItemID != itemID || derefString(current.MediaSourceID) != resolved.Snapshot.MediaSourceID) {
		return fail(409, "Die neue Jellyfin-Quelle enthält keine vollständigen Stream-Daten.")
	}
	streamURL, err := buildJellyfinStreamURL(h.jellyfinBaseURL, h.jellyfinStreamPath, h.jellyfinAPIKey, itemID)
	if err != nil {
		return fail(503, "Die Jellyfin-Stream-Konfiguration ist ungültig.")
	}
	return resolved, &streamURL, 200, nil
}

func (h *FansubHandler) hydrateEpisodeVersionCreate(ctx context.Context, input models.EpisodeVersionCreateInput) (models.EpisodeVersionCreateInput, int, error) {
	if input.MediaProvider != "jellyfin" {
		return input, 200, nil
	}
	resolved, url, status, err := h.resolveEpisodeVersionSource(ctx, input.AnimeID, input.MediaItemID, derefString(input.MediaSourceID), nil)
	if err != nil {
		return input, status, err
	}
	input.MediaSourceID = &resolved.Snapshot.MediaSourceID
	input.JellyfinSource = &resolved.Snapshot
	input.FileName = &resolved.FileName
	input.Container = resolved.Container
	input.VideoCodec = resolved.VideoCodec
	input.AudioCodec = resolved.AudioCodec
	input.VideoQuality = resolved.VideoQuality
	input.DurationSeconds = resolved.DurationSeconds
	input.StreamURL = url
	return input, 200, nil
}

func (h *FansubHandler) hydrateEpisodeVersionPatch(ctx context.Context, versionID int64, input models.EpisodeVersionPatchInput) (models.EpisodeVersionPatchInput, int, error) {
	if !input.MediaProvider.Set && !input.MediaItemID.Set && !input.MediaSourceID.Set && !input.StreamURL.Set {
		return input, 200, nil
	}
	current, err := h.episodeVersionRepo.GetByID(ctx, versionID)
	if err != nil {
		return input, sourceHydrationRepositoryStatus(err), fmt.Errorf("Die Episodenversion konnte nicht geladen werden.")
	}
	provider, itemID, selector := current.MediaProvider, current.MediaItemID, derefString(current.MediaSourceID)
	if input.MediaProvider.Set {
		provider = derefString(input.MediaProvider.Value)
	}
	if input.MediaItemID.Set {
		itemID = derefString(input.MediaItemID.Value)
	}
	if input.MediaSourceID.Set {
		selector = derefString(input.MediaSourceID.Value)
	} else if itemID != current.MediaItemID {
		selector = ""
	}
	if provider != "jellyfin" {
		return input, 200, nil
	}
	actualChange := provider != current.MediaProvider || itemID != current.MediaItemID || selector != derefString(current.MediaSourceID) ||
		(input.StreamURL.Set && derefString(input.StreamURL.Value) != derefString(current.StreamURL))
	if !actualChange {
		input.MediaProvider = models.OptionalString{}
		input.MediaItemID = models.OptionalString{}
		input.MediaSourceID = models.OptionalString{}
		input.StreamURL = models.OptionalString{}
		return input, 200, nil
	}
	resolved, url, status, err := h.resolveEpisodeVersionSource(ctx, current.AnimeID, itemID, selector, current)
	if err != nil {
		return input, status, err
	}
	input.MediaProvider = models.OptionalString{Set: true, Value: &provider}
	input.MediaItemID = models.OptionalString{Set: true, Value: &itemID}
	input.MediaSourceID = models.OptionalString{Set: true, Value: &resolved.Snapshot.MediaSourceID}
	input.StreamURL = models.OptionalString{Set: true, Value: url}
	input.JellyfinSource = &resolved.Snapshot
	input.FileName = &resolved.FileName
	input.Container = resolved.Container
	input.VideoCodec = resolved.VideoCodec
	input.AudioCodec = resolved.AudioCodec
	if resolved.Snapshot.StreamsComplete {
		input.VideoQuality = models.OptionalString{Set: true, Value: resolved.VideoQuality}
		input.DurationSeconds = models.OptionalInt32{Set: true, Value: resolved.DurationSeconds}
	}
	return input, 200, nil
}
