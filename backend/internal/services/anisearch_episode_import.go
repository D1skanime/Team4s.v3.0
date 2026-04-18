package services

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	xhtml "golang.org/x/net/html"
)

type AniSearchEpisode struct {
	EpisodeNumber int32
	Title         *string
}

func (c *AniSearchClient) FetchAnimeEpisodes(ctx context.Context, aniSearchID string) ([]AniSearchEpisode, error) {
	normalizedID := strings.TrimSpace(aniSearchID)
	if normalizedID == "" {
		return nil, fmt.Errorf("anisearch id is required")
	}

	body, err := c.fetchPageHTML(ctx, normalizedID, "/episodes")
	if err != nil {
		return nil, err
	}
	episodes, err := parseAniSearchEpisodeListHTML(body)
	if err != nil {
		return nil, err
	}
	if len(episodes) > 0 {
		return episodes, nil
	}

	anime, err := c.FetchAnime(ctx, normalizedID)
	if err != nil {
		return nil, err
	}
	if anime.EpisodeCount == nil || *anime.EpisodeCount <= 0 {
		return nil, nil
	}
	fallback := make([]AniSearchEpisode, 0, *anime.EpisodeCount)
	for episodeNumber := int32(1); episodeNumber <= int32(*anime.EpisodeCount); episodeNumber++ {
		fallback = append(fallback, AniSearchEpisode{EpisodeNumber: episodeNumber})
	}
	return fallback, nil
}

func parseAniSearchEpisodeListHTML(rawHTML string) ([]AniSearchEpisode, error) {
	doc, err := xhtml.Parse(strings.NewReader(rawHTML))
	if err != nil {
		return nil, fmt.Errorf("parse anisearch episodes html: %w", err)
	}

	episodesByNumber := make(map[int32]AniSearchEpisode)
	var walk func(*xhtml.Node)
	walk = func(node *xhtml.Node) {
		if node == nil {
			return
		}
		if node.Type == xhtml.ElementNode && node.Data == "tr" {
			if episode, ok := parseAniSearchEpisodeTableRow(node); ok {
				episodesByNumber[episode.EpisodeNumber] = episode
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(doc)

	numbers := make([]int, 0, len(episodesByNumber))
	for number := range episodesByNumber {
		numbers = append(numbers, int(number))
	}
	sort.Ints(numbers)

	episodes := make([]AniSearchEpisode, 0, len(numbers))
	for _, number := range numbers {
		episodes = append(episodes, episodesByNumber[int32(number)])
	}
	return episodes, nil
}

func parseAniSearchEpisodeTableRow(row *xhtml.Node) (AniSearchEpisode, bool) {
	cells := make([]string, 0, 4)
	for child := row.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == xhtml.ElementNode && (child.Data == "td" || child.Data == "th") {
			cells = append(cells, strings.TrimSpace(nodeText(child)))
		}
	}
	if len(cells) < 2 {
		return AniSearchEpisode{}, false
	}

	number := parseAniSearchEpisodeNumber(cells[0])
	if number <= 0 {
		return AniSearchEpisode{}, false
	}
	title := normalizeStringPtr(firstNonEmpty(cells[1], cells[len(cells)-1]))
	return AniSearchEpisode{EpisodeNumber: number, Title: title}, true
}

func parseAniSearchEpisodeNumber(raw string) int32 {
	match := regexp.MustCompile(`\d+`).FindString(strings.TrimSpace(raw))
	if match == "" {
		return 0
	}
	parsed, err := strconv.Atoi(match)
	if err != nil || parsed <= 0 || parsed > 32767 {
		return 0
	}
	return int32(parsed)
}
