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
	EpisodeNumber    int32
	Title            *string
	TitlesByLanguage map[string]string
	FillerType       *string
	FillerSource     *string
	FillerNote       *string
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
		if isAniSearchEpisodeRow(node) {
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

func isAniSearchEpisodeRow(node *xhtml.Node) bool {
	if node == nil || node.Type != xhtml.ElementNode || node.Data != "tr" {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(nodeAttribute(node, "data-episode")), "true") {
		return true
	}
	if strings.EqualFold(strings.TrimSpace(nodeAttribute(node, "itemprop")), "episode") {
		return true
	}
	for parent := node.Parent; parent != nil; parent = parent.Parent {
		if parent.Type != xhtml.ElementNode {
			continue
		}
		if value := strings.ToLower(strings.TrimSpace(nodeAttribute(parent, "id"))); value == "episoden" || value == "episodes" {
			return true
		}
	}
	return false
}

func nodeAttribute(node *xhtml.Node, name string) string {
	for _, attr := range node.Attr {
		if strings.EqualFold(strings.TrimSpace(attr.Key), name) {
			return attr.Val
		}
	}
	return ""
}

func parseAniSearchEpisodeTableRow(row *xhtml.Node) (AniSearchEpisode, bool) {
	cells := make([]string, 0, 4)
	titleCell := (*xhtml.Node)(nil)
	for child := row.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == xhtml.ElementNode && (child.Data == "td" || child.Data == "th") {
			text := strings.TrimSpace(nodeText(child))
			cells = append(cells, text)
			if strings.EqualFold(strings.TrimSpace(nodeAttribute(child, "data-title")), "Titel") {
				titleCell = child
			}
		}
	}
	if len(cells) < 2 {
		return AniSearchEpisode{}, false
	}

	number := parseAniSearchEpisodeNumber(cells[0])
	if number <= 0 {
		return AniSearchEpisode{}, false
	}

	titlesByLanguage := parseAniSearchEpisodeTitles(titleCell)
	if len(titlesByLanguage) == 0 {
		titlesByLanguage = parseAniSearchEpisodeTitles(row)
	}
	if len(titlesByLanguage) == 0 && strings.TrimSpace(cells[len(cells)-1]) != "" {
		titlesByLanguage["de"] = strings.TrimSpace(cells[len(cells)-1])
	}
	titleFallback := ""
	if titleCell != nil {
		titleFallback = nodeText(titleCell)
	}
	title := normalizeStringPtr(episodeDisplayTitle(number, titlesByLanguage, firstNonEmpty(titleFallback, cells[len(cells)-1])))
	fillerType, fillerNote := parseAniSearchEpisodeFiller(cells)
	return AniSearchEpisode{
		EpisodeNumber:    number,
		Title:            title,
		TitlesByLanguage: titlesByLanguage,
		FillerType:       fillerType,
		FillerSource:     normalizeStringPtr("anisearch"),
		FillerNote:       fillerNote,
	}, true
}

func parseAniSearchEpisodeTitles(cell *xhtml.Node) map[string]string {
	result := make(map[string]string)
	if cell == nil {
		return result
	}

	var walk func(*xhtml.Node)
	walk = func(node *xhtml.Node) {
		if node == nil {
			return
		}
		if node.Type == xhtml.ElementNode {
			if lang := normalizeAniSearchEpisodeLanguage(cellLanguage(node)); lang != "" {
				if text := strings.TrimSpace(nodeText(node)); text != "" {
					result[lang] = text
				}
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(cell)
	return result
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

func cellLanguage(node *xhtml.Node) string {
	for _, attr := range node.Attr {
		key := strings.ToLower(strings.TrimSpace(attr.Key))
		value := strings.TrimSpace(attr.Val)
		if key == "lang" || key == "data-lang" || key == "data-language" {
			return value
		}
		if key == "class" {
			for _, part := range strings.Fields(strings.ToLower(value)) {
				switch part {
				case "de", "lang-de", "title-de", "german":
					return "de"
				case "en", "lang-en", "title-en", "english":
					return "en"
				case "ja", "jp", "lang-ja", "title-ja", "japanese":
					return "ja"
				}
			}
		}
	}
	return ""
}

func normalizeAniSearchEpisodeLanguage(raw string) string {
	normalized := strings.ToLower(strings.TrimSpace(raw))
	switch {
	case normalized == "de" || strings.HasPrefix(normalized, "de-"):
		return "de"
	case normalized == "en" || strings.HasPrefix(normalized, "en-"):
		return "en"
	case normalized == "ja" || normalized == "jp" || strings.HasPrefix(normalized, "ja-"):
		return "ja"
	default:
		return ""
	}
}

func episodeDisplayTitle(number int32, titlesByLanguage map[string]string, fallback string) string {
	for _, lang := range []string{"de", "en", "ja"} {
		if title := strings.TrimSpace(titlesByLanguage[lang]); title != "" {
			return title
		}
	}
	if trimmed := strings.TrimSpace(fallback); trimmed != "" {
		return trimmed
	}
	return fmt.Sprintf("Episode %d", number)
}

func parseAniSearchEpisodeFiller(cells []string) (*string, *string) {
	for _, cell := range cells {
		normalized := strings.ToLower(strings.TrimSpace(cell))
		if normalized == "" {
			continue
		}
		var fillerType string
		switch {
		case strings.Contains(normalized, "mixed"):
			fillerType = "mixed"
		case strings.Contains(normalized, "recap"):
			fillerType = "recap"
		case strings.Contains(normalized, "filler") || strings.Contains(normalized, "fueller") || strings.Contains(normalized, "füller"):
			fillerType = "filler"
		case strings.Contains(normalized, "canon") || strings.Contains(normalized, "kanon"):
			fillerType = "canon"
		}
		if fillerType != "" {
			return normalizeStringPtr(fillerType), normalizeStringPtr(strings.TrimSpace(cell))
		}
	}
	return nil, nil
}
