package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
)

const jellyfinSourceBatchSize = 100
const jellyfinSourceFields = "MediaSources,MediaStreams,Path,ParentId"

// jellyfinSourceBatchError reports incomplete identity sets without returning a
// partially hydrated selection. ItemIDs are internal provider IDs, never paths.
type jellyfinSourceBatchError struct {
	Kind    string
	ItemIDs []string
}

func (e *jellyfinSourceBatchError) Error() string {
	return fmt.Sprintf("jellyfin item batch %s (%d identities)", e.Kind, len(e.ItemIDs))
}

func (h *AdminContentHandler) getJellyfinSourceItems(ctx context.Context, itemIDs []string) (map[string]jellyfinEpisodeItem, error) {
	return fetchJellyfinSourceBatch(ctx, h.httpClient, h.jellyfinBaseURL, h.jellyfinAPIKey, itemIDs)
}

func (h *FansubHandler) getJellyfinSourceItems(ctx context.Context, itemIDs []string) (map[string]jellyfinEpisodeItem, error) {
	return fetchJellyfinSourceBatch(ctx, h.httpClient, h.jellyfinBaseURL, h.jellyfinAPIKey, itemIDs)
}

// fetchJellyfinSourceBatch hydrates real Item IDs only. Nested source IDs never
// trigger discovery requests. Every chunk must match its exact requested set.
func fetchJellyfinSourceBatch(ctx context.Context, client *http.Client, baseURL, apiKey string, itemIDs []string) (map[string]jellyfinEpisodeItem, error) {
	unique := make([]string, 0, len(itemIDs))
	seen := make(map[string]bool, len(itemIDs))
	for _, raw := range itemIDs {
		id := strings.TrimSpace(raw)
		if id == "" || strings.Contains(id, ",") {
			return nil, &jellyfinSourceBatchError{Kind: "invalid", ItemIDs: []string{id}}
		}
		if !seen[id] {
			unique = append(unique, id)
			seen[id] = true
		}
	}
	result := make(map[string]jellyfinEpisodeItem, len(unique))
	for start := 0; start < len(unique); start += jellyfinSourceBatchSize {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		end := min(start+jellyfinSourceBatchSize, len(unique))
		chunk := unique[start:end]
		query := url.Values{
			"Ids": {strings.Join(chunk, ",")}, "Limit": {strconv.Itoa(len(chunk))},
			"Fields": {jellyfinSourceFields}, "EnableUserData": {"false"}, "EnableTotalRecordCount": {"true"},
		}
		var payload jellyfinEpisodeListResponse
		if _, err := fetchJellyfinJSON(ctx, client, baseURL, apiKey, "/Items", query, &payload); err != nil {
			return nil, err
		}
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		expected := make(map[string]bool, len(chunk))
		for _, id := range chunk {
			expected[id] = true
		}
		returned := make(map[string]bool, len(payload.Items))
		for _, item := range payload.Items {
			id := strings.TrimSpace(item.ID)
			if !expected[id] {
				return nil, &jellyfinSourceBatchError{Kind: "unexpected", ItemIDs: []string{id}}
			}
			if returned[id] {
				return nil, &jellyfinSourceBatchError{Kind: "duplicate", ItemIDs: []string{id}}
			}
			returned[id] = true
			item.ID = id
			result[id] = item
		}
		missing := make([]string, 0)
		for _, id := range chunk {
			if !returned[id] {
				missing = append(missing, id)
			}
		}
		if len(missing) > 0 {
			return nil, &jellyfinSourceBatchError{Kind: "missing", ItemIDs: missing}
		}
		if payload.TotalRecordCount != nil && *payload.TotalRecordCount != len(chunk) {
			return nil, &jellyfinSourceBatchError{Kind: "incomplete", ItemIDs: append([]string(nil), chunk...)}
		}
	}
	return result, nil
}

// Existing callers use own-source selection; callers with a persisted binding
// pass it here so enrichment follows the exact same resolver as import/playback.
func (h *AdminContentHandler) getJellyfinSourceDurationSeconds(ctx context.Context, itemID string, stored *models.JellyfinSourceSnapshot) (*int32, error) {
	id := strings.TrimSpace(itemID)
	if id == "" {
		return nil, nil
	}
	items, err := h.getJellyfinSourceItems(ctx, []string{id})
	if err != nil {
		return nil, err
	}
	resolved, err := resolveJellyfinMediaSource(items[id], stored)
	if err != nil {
		return nil, err
	}
	return resolved.DurationSeconds, nil
}
