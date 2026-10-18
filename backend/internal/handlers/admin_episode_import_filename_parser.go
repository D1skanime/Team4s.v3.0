package handlers

// This file holds the raw-filename episode/season extraction helpers for the
// episode import pipeline (the "Exx"/"SxxExx"/range regex fallbacks used only
// when Jellyfin metadata does not already carry an episode/season number).
// Deliberately isolated into its own file because Plan 186-02 (D-03) replaces
// the Exx fallback here with a swappable services.ReleaseFilenameParser
// (anitogo-backed) -- keeping this cluster separate from admin_episode_import.go
// makes that follow-up change a small, reviewable diff.

import (
	"regexp"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
)

var episodeImportFilenameRangePattern = regexp.MustCompile(`(?i)e(\d{1,4})-(\d{1,4})`)
var episodeImportFilenameSeasonEpisodePattern = regexp.MustCompile(`(?i)(?:^|[^a-z0-9])s(\d{1,3})e(\d{1,4})(?:[^0-9]|$)`)
var episodeImportFilenameEpisodePattern = regexp.MustCompile(`(?i)(?:^|[^a-z0-9])e(\d{1,4})(?:[^0-9]|$)`)

func episodeImportEvidenceEpisodeNumber(media models.EpisodeImportMediaCandidate) *int32 {
	if media.JellyfinEpisodeNumber != nil && *media.JellyfinEpisodeNumber > 0 {
		return media.JellyfinEpisodeNumber
	}
	if _, episode := parseEpisodeImportFilenameSeasonEpisode(media.FileName); episode != nil {
		return episode
	}
	return parseEpisodeImportFilenameEpisode(media.FileName)
}

func episodeImportEvidenceSeasonNumber(media models.EpisodeImportMediaCandidate) *int32 {
	if media.JellyfinSeasonNumber != nil && *media.JellyfinSeasonNumber > 0 {
		return media.JellyfinSeasonNumber
	}
	season, _ := parseEpisodeImportFilenameSeasonEpisode(media.FileName)
	return season
}

func parseEpisodeImportFilenameSeasonEpisode(fileName string) (*int32, *int32) {
	match := episodeImportFilenameSeasonEpisodePattern.FindStringSubmatch(strings.TrimSpace(fileName))
	if len(match) != 3 {
		return nil, nil
	}
	season, err := strconv.Atoi(match[1])
	if err != nil || season <= 0 {
		return nil, nil
	}
	episode, err := strconv.Atoi(match[2])
	if err != nil || episode <= 0 {
		return nil, nil
	}
	seasonValue := int32(season)
	episodeValue := int32(episode)
	return &seasonValue, &episodeValue
}

func parseEpisodeImportFilenameEpisode(fileName string) *int32 {
	match := episodeImportFilenameEpisodePattern.FindStringSubmatch(strings.TrimSpace(fileName))
	if len(match) != 2 {
		return nil
	}
	episode, err := strconv.Atoi(match[1])
	if err != nil || episode <= 0 {
		return nil
	}
	value := int32(episode)
	return &value
}

func parseEpisodeImportFilenameRangeEnd(fileName string) *int32 {
	match := episodeImportFilenameRangePattern.FindStringSubmatch(strings.TrimSpace(fileName))
	if len(match) != 3 {
		return nil
	}
	start, err := strconv.Atoi(match[1])
	if err != nil || start <= 0 {
		return nil
	}
	end, err := strconv.Atoi(match[2])
	if err != nil || end <= start {
		return nil
	}
	value := int32(end)
	return &value
}
