package services

import (
	"context"
	"encoding/json"
	"fmt"
	stdhtml "html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	xhtml "golang.org/x/net/html"
)

type AniSearchAnimeRelation struct {
	RelationLabel string
	Title         string
}

type AniSearchAnime struct {
	AniSearchID   string
	PrimaryTitle  string
	OriginalTitle *string
	RomajiTitle   *string
	EnglishTitle  *string
	GermanTitle   *string
	Description   *string
	EpisodeCount  *int16
	Format        *string
	Year          *int16
	Genres        []string
	Tags          []string
	Relations     []AniSearchAnimeRelation
}

type contextSleeper func(ctx context.Context, wait time.Duration) error

type AniSearchRateLimiter struct {
	mu    sync.Mutex
	last  time.Time
	now   func() time.Time
	sleep contextSleeper
}

func NewAniSearchRateLimiter() *AniSearchRateLimiter {
	return newAniSearchRateLimiter(time.Now, sleepWithContext)
}

func newAniSearchRateLimiter(now func() time.Time, sleep contextSleeper) *AniSearchRateLimiter {
	if now == nil {
		now = time.Now
	}
	if sleep == nil {
		sleep = sleepWithContext
	}
	return &AniSearchRateLimiter{now: now, sleep: sleep}
}

func (l *AniSearchRateLimiter) Do(ctx context.Context, fn func() error) error {
	if fn == nil {
		return nil
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	if !l.last.IsZero() {
		wait := l.last.Add(2 * time.Second).Sub(now)
		if wait > 0 {
			if err := l.sleep(ctx, wait); err != nil {
				return err
			}
		}
	}

	l.last = l.now()
	return fn()
}

func sleepWithContext(ctx context.Context, wait time.Duration) error {
	timer := time.NewTimer(wait)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

type AniSearchClient struct {
	baseURL    string
	httpClient *http.Client
	limiter    *AniSearchRateLimiter
}

func NewAniSearchClient(baseURL string, httpClient *http.Client) *AniSearchClient {
	trimmedBaseURL := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if trimmedBaseURL == "" {
		trimmedBaseURL = "https://www.anisearch.de/anime"
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 20 * time.Second}
	}

	return &AniSearchClient{
		baseURL:    trimmedBaseURL,
		httpClient: httpClient,
		limiter:    NewAniSearchRateLimiter(),
	}
}

func (c *AniSearchClient) WithLimiter(limiter *AniSearchRateLimiter) *AniSearchClient {
	if limiter != nil {
		c.limiter = limiter
	}
	return c
}

func (c *AniSearchClient) FetchAnime(ctx context.Context, aniSearchID string) (AniSearchAnime, error) {
	normalizedID := strings.TrimSpace(aniSearchID)
	if normalizedID == "" {
		return AniSearchAnime{}, fmt.Errorf("anisearch id is required")
	}

	pageBody, err := c.fetchPageHTML(ctx, normalizedID, "")
	if err != nil {
		return AniSearchAnime{}, err
	}

	result, err := parseAniSearchAnimeHTML(normalizedID, pageBody)
	if err != nil {
		return AniSearchAnime{}, err
	}

	if relationsBody, err := c.fetchPageHTML(ctx, normalizedID, "/relations"); err == nil {
		result.Relations = parseAniSearchRelationsPageHTML(normalizedID, relationsBody)
	}

	return result, nil
}

func (c *AniSearchClient) fetchPageHTML(ctx context.Context, aniSearchID string, suffix string) (string, error) {
	var body string
	err := c.limiter.Do(ctx, func() error {
		requestURL := c.baseURL + "/" + url.PathEscape(aniSearchID) + suffix
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
		if err != nil {
			return fmt.Errorf("build anisearch request: %w", err)
		}
		req.Header.Set("User-Agent", "Team4sBot/1.0 (+controlled AniSearch enrichment)")
		req.Header.Set("Accept", "text/html,application/xhtml+xml")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return fmt.Errorf("fetch anisearch anime %s%s: %w", aniSearchID, suffix, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("fetch anisearch anime %s%s: unexpected status %d", aniSearchID, suffix, resp.StatusCode)
		}

		raw, err := io.ReadAll(resp.Body)
		if err != nil {
			return fmt.Errorf("read anisearch anime %s%s: %w", aniSearchID, suffix, err)
		}
		body = string(raw)
		return nil
	})
	if err != nil {
		return "", err
	}
	return body, nil
}

func parseAniSearchAnimeHTML(aniSearchID string, rawHTML string) (AniSearchAnime, error) {
	doc, err := xhtml.Parse(strings.NewReader(rawHTML))
	if err != nil {
		return AniSearchAnime{}, fmt.Errorf("parse anisearch html %s: %w", aniSearchID, err)
	}

	ldJSON := parseAniSearchLDJSON(doc)
	titleEntries := parseAniSearchTitleEntries(doc)
	description := findAniSearchDescription(doc)
	formatText := firstNonEmpty(findAniSearchInfoValue(doc, "Typ"), ldJSON.SchemaType)
	yearText := firstNonEmpty(findAniSearchReleaseYear(doc), ldJSON.StartDate)
	episodeText := firstNonEmpty(findAniSearchEpisodeCount(doc), ldJSON.NumberOfEpisodes)
	genres := appendUniqueNormalizedValues(nil, ldJSON.Genres...)

	result := AniSearchAnime{
		AniSearchID: aniSearchID,
	}

	result.PrimaryTitle = firstNonEmpty(
		findAniSearchHeaderTitle(doc),
		titleEntries["de"],
		titleEntries["en"],
		titleEntries["ja"],
		ldJSON.Name,
		findMetaContent(doc, "property", "og:title"),
		findDataText(doc, "primary_title"),
		findTitleText(doc),
	)
	if strings.TrimSpace(result.PrimaryTitle) == "" {
		return AniSearchAnime{}, fmt.Errorf("parse anisearch html %s: missing primary title", aniSearchID)
	}

	result.Description = normalizeStringPtr(firstNonEmpty(
		description,
		findMetaContent(doc, "name", "description"),
		findDataText(doc, "description"),
		ldJSON.Description,
	))
	result.OriginalTitle = normalizeStringPtr(firstNonEmpty(
		titleEntries["ja"],
		findAniSearchSubtitleTitle(doc),
		findDataText(doc, "original_title"),
	))
	result.RomajiTitle = normalizeStringPtr(firstNonEmpty(
		titleEntries["ja-Latn"],
		findDataText(doc, "romaji_title"),
	))
	result.EnglishTitle = normalizeStringPtr(firstNonEmpty(
		titleEntries["en"],
		findDataText(doc, "english_title"),
	))
	result.GermanTitle = normalizeStringPtr(firstNonEmpty(
		titleEntries["de"],
		findAniSearchHeaderTitle(doc),
		findMetaContent(doc, "property", "og:title"),
		findDataText(doc, "german_title"),
	))
	result.Format = normalizeStringPtr(firstNonEmpty(
		normalizeAniSearchFormat(formatText),
		findDataText(doc, "format"),
		findDataText(doc, "type"),
	))
	result.Year = parseInt16Ptr(yearText)
	result.EpisodeCount = parseInt16Ptr(firstNonEmpty(findDataText(doc, "episodes"), findDataText(doc, "episode_count"), episodeText))
	result.Genres = genres
	result.Tags = findAniSearchTagLinks(doc)
	result.Relations = parseAniSearchRelations(doc)

	return result, nil
}

type aniSearchLDJSON struct {
	SchemaType       string
	Name             string
	Description      string
	NumberOfEpisodes string
	StartDate        string
	Genres           []string
}

func parseAniSearchLDJSON(doc *xhtml.Node) aniSearchLDJSON {
	var result aniSearchLDJSON
	scriptContent := findFirstScriptByType(doc, "application/ld+json")
	if strings.TrimSpace(scriptContent) == "" {
		return result
	}

	var raw map[string]any
	if err := json.Unmarshal([]byte(scriptContent), &raw); err != nil {
		return result
	}

	result.SchemaType = stringifyJSONValue(raw["@type"])
	result.Name = stringifyJSONValue(raw["name"])
	result.Description = stringifyJSONValue(raw["description"])
	result.NumberOfEpisodes = stringifyJSONValue(raw["numberOfEpisodes"])
	result.StartDate = stringifyJSONValue(raw["startDate"])
	result.Genres = stringifyJSONArray(raw["genre"])
	return result
}

func parseAniSearchTitleEntries(doc *xhtml.Node) map[string]string {
	result := make(map[string]string)

	information := findNodeByID(doc, "information")
	if information == nil {
		return result
	}

	var walk func(*xhtml.Node)
	walk = func(node *xhtml.Node) {
		if node == nil {
			return
		}
		if node.Type == xhtml.ElementNode && node.Data == "div" && hasClass(node, "title") {
			lang := normalizeAniSearchLang(attrValueFor(node, "lang"))
			if lang != "" {
				if title := strings.TrimSpace(findFirstChildTextByTagAndClass(node, "strong", "f16")); title != "" {
					result[lang] = title
				}
				if lang == "ja" {
					if romaji := strings.TrimSpace(findFirstChildTextByTagAndClass(node, "div", "grey")); isUsefulAniSearchTitle(romaji) {
						result["ja-Latn"] = romaji
					}
				}
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}

	walk(information)
	return result
}

func findAniSearchHeaderTitle(doc *xhtml.Node) string {
	header := findNodeByID(doc, "htitle")
	if header == nil {
		return ""
	}
	return strings.TrimSpace(directNodeText(header))
}

func findAniSearchReleaseYear(doc *xhtml.Node) string {
	header := findNodeByID(doc, "htitle")
	if header == nil {
		return ""
	}
	for child := header.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == xhtml.ElementNode && child.Data == "span" && hasClass(child, "release_year") {
			return extractFirstNumber(nodeText(child))
		}
	}
	return extractFirstNumber(nodeText(header))
}

func findAniSearchSubtitleTitle(doc *xhtml.Node) string {
	var walk func(*xhtml.Node) string
	walk = func(node *xhtml.Node) string {
		if node == nil {
			return ""
		}
		if node.Type == xhtml.ElementNode && node.Data == "span" && hasClass(node, "subheader") {
			raw := strings.TrimSpace(nodeText(node))
			if raw == "" {
				return ""
			}
			for _, part := range strings.Split(raw, "/") {
				candidate := strings.TrimSpace(part)
				if isUsefulAniSearchTitle(candidate) {
					return candidate
				}
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if value := walk(child); value != "" {
				return value
			}
		}
		return ""
	}
	return walk(doc)
}

func findAniSearchDescription(doc *xhtml.Node) string {
	descriptionSection := findNodeByID(doc, "description")
	if descriptionSection == nil {
		return ""
	}

	candidates := make(map[string]string)
	var walk func(*xhtml.Node)
	walk = func(node *xhtml.Node) {
		if node == nil {
			return
		}
		if node.Type == xhtml.ElementNode && node.Data == "div" && hasClass(node, "textblock") && hasClass(node, "details-text") && !hasClass(node, "hidden") {
			lang := normalizeAniSearchLang(attrValueFor(node, "lang"))
			text := strings.TrimSpace(visibleNodeText(node))
			if text != "" && lang != "" {
				candidates[lang] = text
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(descriptionSection)

	return firstNonEmpty(candidates["de"], candidates["en"], candidates["ja"])
}

func findAniSearchInfoValue(doc *xhtml.Node, label string) string {
	information := findNodeByID(doc, "information")
	if information == nil {
		return ""
	}

	var walk func(*xhtml.Node) string
	walk = func(node *xhtml.Node) string {
		if node == nil {
			return ""
		}
		if node.Type == xhtml.ElementNode && node.Data == "div" {
			header := strings.TrimSpace(findDirectChildTextByTagAndClass(node, "span", "header"))
			header = strings.TrimSuffix(header, ":")
			if strings.EqualFold(header, strings.TrimSpace(label)) {
				return strings.TrimSpace(nodeTextWithoutChildClass(node, "header"))
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if value := walk(child); value != "" {
				return value
			}
		}
		return ""
	}
	return walk(information)
}

func findDirectChildTextByTagAndClass(node *xhtml.Node, tag string, className string) string {
	if node == nil {
		return ""
	}
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == xhtml.ElementNode && child.Data == tag && hasClass(child, className) {
			return strings.TrimSpace(nodeText(child))
		}
	}
	return ""
}

func findAniSearchEpisodeCount(doc *xhtml.Node) string {
	typeText := findAniSearchInfoValue(doc, "Typ")
	if typeText == "" {
		return ""
	}
	parts := strings.Split(typeText, ",")
	if len(parts) < 2 {
		return ""
	}
	return extractFirstNumber(parts[1])
}

func findFirstScriptByType(doc *xhtml.Node, scriptType string) string {
	var walk func(*xhtml.Node) string
	walk = func(node *xhtml.Node) string {
		if node == nil {
			return ""
		}
		if node.Type == xhtml.ElementNode && node.Data == "script" && hasAttr(node, "type", scriptType) {
			return strings.TrimSpace(directNodeText(node))
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if value := walk(child); value != "" {
				return value
			}
		}
		return ""
	}
	return walk(doc)
}

func findNodeByID(doc *xhtml.Node, id string) *xhtml.Node {
	var walk func(*xhtml.Node) *xhtml.Node
	walk = func(node *xhtml.Node) *xhtml.Node {
		if node == nil {
			return nil
		}
		if node.Type == xhtml.ElementNode && hasAttr(node, "id", id) {
			return node
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if found := walk(child); found != nil {
				return found
			}
		}
		return nil
	}
	return walk(doc)
}

func directNodeText(node *xhtml.Node) string {
	if node == nil {
		return ""
	}
	var builder strings.Builder
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == xhtml.TextNode {
			builder.WriteString(child.Data)
			builder.WriteString(" ")
		}
	}
	return strings.Join(strings.Fields(builder.String()), " ")
}

func visibleNodeText(node *xhtml.Node) string {
	var builder strings.Builder
	var walk func(*xhtml.Node)
	walk = func(current *xhtml.Node) {
		if current == nil {
			return
		}
		if current.Type == xhtml.ElementNode && hasClass(current, "hidden") {
			return
		}
		if current.Type == xhtml.TextNode {
			builder.WriteString(current.Data)
			builder.WriteString(" ")
		}
		for child := current.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(node)
	return strings.Join(strings.Fields(builder.String()), " ")
}

func nodeTextWithoutChildClass(node *xhtml.Node, childClass string) string {
	var builder strings.Builder
	var walk func(*xhtml.Node)
	walk = func(current *xhtml.Node) {
		if current == nil {
			return
		}
		if current != node && current.Type == xhtml.ElementNode && hasClass(current, childClass) {
			return
		}
		if current.Type == xhtml.TextNode {
			builder.WriteString(current.Data)
			builder.WriteString(" ")
		}
		for child := current.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(node)
	return strings.Join(strings.Fields(builder.String()), " ")
}

func findFirstChildTextByTagAndClass(node *xhtml.Node, tag string, className string) string {
	var walk func(*xhtml.Node) string
	walk = func(current *xhtml.Node) string {
		if current == nil {
			return ""
		}
		if current.Type == xhtml.ElementNode && current.Data == tag && hasClass(current, className) {
			return strings.TrimSpace(nodeText(current))
		}
		for child := current.FirstChild; child != nil; child = child.NextSibling {
			if value := walk(child); value != "" {
				return value
			}
		}
		return ""
	}
	return walk(node)
}

func findTitleText(doc *xhtml.Node) string {
	var walk func(*xhtml.Node) string
	walk = func(node *xhtml.Node) string {
		if node == nil {
			return ""
		}
		if node.Type == xhtml.ElementNode && node.Data == "title" {
			return strings.TrimSpace(nodeText(node))
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if value := walk(child); value != "" {
				return value
			}
		}
		return ""
	}
	return walk(doc)
}

func findMetaContent(doc *xhtml.Node, attrKey string, attrValue string) string {
	var walk func(*xhtml.Node) string
	walk = func(node *xhtml.Node) string {
		if node == nil {
			return ""
		}
		if node.Type == xhtml.ElementNode && node.Data == "meta" && hasAttr(node, attrKey, attrValue) {
			return attrValueFor(node, "content")
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if value := walk(child); value != "" {
				return value
			}
		}
		return ""
	}
	return strings.TrimSpace(walk(doc))
}

func findDataText(doc *xhtml.Node, field string) string {
	var walk func(*xhtml.Node) string
	walk = func(node *xhtml.Node) string {
		if node == nil {
			return ""
		}
		if node.Type == xhtml.ElementNode && hasAttr(node, "data-field", field) {
			return strings.TrimSpace(nodeText(node))
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if value := walk(child); value != "" {
				return value
			}
		}
		return ""
	}
	return walk(doc)
}

func findAniSearchTagLinks(doc *xhtml.Node) []string {
	result := make([]string, 0)
	seen := make(map[string]struct{})

	var walk func(*xhtml.Node)
	walk = func(node *xhtml.Node) {
		if node == nil {
			return
		}
		if node.Type == xhtml.ElementNode && node.Data == "a" {
			href := attrValueFor(node, "href")
			if strings.Contains(href, "anime/genre/tag/") {
				text := strings.TrimSpace(nodeText(node))
				if text != "" {
					key := strings.ToLower(text)
					if _, ok := seen[key]; !ok {
						seen[key] = struct{}{}
						result = append(result, text)
					}
				}
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}

	walk(doc)
	return result
}

func parseAniSearchRelations(doc *xhtml.Node) []AniSearchAnimeRelation {
	result := make([]AniSearchAnimeRelation, 0)

	var walk func(*xhtml.Node)
	walk = func(node *xhtml.Node) {
		if node == nil {
			return
		}
		if node.Type == xhtml.ElementNode {
			label := strings.TrimSpace(attrValueFor(node, "data-relation-label"))
			title := strings.TrimSpace(attrValueFor(node, "data-title"))
			if label != "" && title != "" {
				result = append(result, AniSearchAnimeRelation{
					RelationLabel: label,
					Title:         title,
				})
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}

	walk(doc)
	return result
}

type aniSearchRelationsGraph struct {
	Nodes  map[string]map[string]aniSearchRelationsNode `json:"nodes"`
	Edges  []aniSearchRelationsEdge                     `json:"edges"`
	Legend []string                                     `json:"legend"`
}

type aniSearchRelationsNode struct {
	Title string `json:"title"`
	URL   string `json:"url"`
	Group string `json:"group"`
}

type aniSearchRelationsEdge struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Group    string `json:"group"`
	Relation int    `json:"relation"`
}

func parseAniSearchRelationsPageHTML(aniSearchID string, rawHTML string) []AniSearchAnimeRelation {
	doc, err := xhtml.Parse(strings.NewReader(rawHTML))
	if err != nil {
		return nil
	}

	flowchart := findNodeByID(doc, "flowchart")
	if flowchart == nil {
		return nil
	}

	encodedGraph := attrValueFor(flowchart, "data-graph")
	if strings.TrimSpace(encodedGraph) == "" {
		return nil
	}

	var graph aniSearchRelationsGraph
	if err := json.Unmarshal([]byte(stdhtml.UnescapeString(encodedGraph)), &graph); err != nil {
		return nil
	}

	currentNodeID := "a" + strings.TrimSpace(aniSearchID)
	nodes := graph.Nodes["anime"]
	if len(nodes) == 0 {
		return nil
	}

	result := make([]AniSearchAnimeRelation, 0)
	for _, edge := range graph.Edges {
		if edge.Group != "" && edge.Group != "anime" {
			continue
		}

		var (
			targetNodeID string
			label        string
		)

		switch {
		case edge.From == currentNodeID:
			targetNodeID = edge.To
			label = mapAniSearchGraphRelation(graph.Legend, edge.Relation, true)
		case edge.To == currentNodeID:
			targetNodeID = edge.From
			label = mapAniSearchGraphRelation(graph.Legend, edge.Relation, false)
		default:
			continue
		}

		if label == "" {
			continue
		}

		targetNode, ok := nodes[targetNodeID]
		if !ok {
			continue
		}
		title := normalizeAniSearchGraphNodeTitle(targetNode.Title)
		if title == "" {
			continue
		}

		result = appendUniqueRelations(result, AniSearchAnimeRelation{
			RelationLabel: label,
			Title:         title,
		})
	}

	return result
}

func nodeText(node *xhtml.Node) string {
	var builder strings.Builder
	var walk func(*xhtml.Node)
	walk = func(current *xhtml.Node) {
		if current == nil {
			return
		}
		if current.Type == xhtml.TextNode {
			builder.WriteString(current.Data)
			builder.WriteString(" ")
		}
		for child := current.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(node)
	return strings.Join(strings.Fields(builder.String()), " ")
}

func hasAttr(node *xhtml.Node, key string, value string) bool {
	for _, attr := range node.Attr {
		if strings.EqualFold(attr.Key, key) && strings.TrimSpace(attr.Val) == value {
			return true
		}
	}
	return false
}

func hasClass(node *xhtml.Node, className string) bool {
	classes := strings.Fields(attrValueFor(node, "class"))
	for _, class := range classes {
		if class == className {
			return true
		}
	}
	return false
}

func attrValueFor(node *xhtml.Node, key string) string {
	for _, attr := range node.Attr {
		if strings.EqualFold(attr.Key, key) {
			return strings.TrimSpace(attr.Val)
		}
	}
	return ""
}

func normalizeStringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func parseDelimitedValues(raw string) []string {
	fields := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == ';' || r == '|'
	})
	result := make([]string, 0, len(fields))
	seen := make(map[string]struct{}, len(fields))
	for _, field := range fields {
		trimmed := strings.TrimSpace(field)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func parseInt16Ptr(raw string) *int16 {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}

	var value int
	if _, err := fmt.Sscanf(trimmed, "%d", &value); err != nil || value <= 0 || value > 32767 {
		return nil
	}
	parsed := int16(value)
	return &parsed
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func stringifyJSONValue(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case float64:
		return strconv.FormatInt(int64(typed), 10)
	default:
		return ""
	}
}

func stringifyJSONArray(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	result := make([]string, 0, len(items))
	for _, item := range items {
		if text := stringifyJSONValue(item); text != "" {
			result = append(result, text)
		}
	}
	return result
}

func normalizeAniSearchLang(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "de":
		return "de"
	case "en":
		return "en"
	case "ja", "jp":
		return "ja"
	default:
		return strings.TrimSpace(raw)
	}
}

func normalizeAniSearchFormat(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch {
	case strings.HasPrefix(value, "tv"):
		return "TV"
	case strings.HasPrefix(value, "film"), strings.HasPrefix(value, "movie"):
		return "Film"
	case strings.HasPrefix(value, "ova"):
		return "OVA"
	case strings.HasPrefix(value, "ona"), strings.HasPrefix(value, "web"):
		return "ONA"
	case strings.HasPrefix(value, "special"):
		return "Special"
	default:
		return strings.TrimSpace(raw)
	}
}

func extractFirstNumber(raw string) string {
	re := regexp.MustCompile(`\d{1,4}`)
	return re.FindString(raw)
}

func isUsefulAniSearchTitle(value string) bool {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return false
	}
	return !strings.Contains(trimmed, "?")
}

func appendUniqueNormalizedValues(target []string, values ...string) []string {
	seen := make(map[string]struct{}, len(target))
	for _, value := range target {
		seen[strings.ToLower(strings.TrimSpace(value))] = struct{}{}
	}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		target = append(target, trimmed)
	}
	return target
}

func mapAniSearchGraphRelation(legend []string, relationIndex int, outgoing bool) string {
	if relationIndex < 0 || relationIndex >= len(legend) {
		return ""
	}

	relationName := strings.TrimSpace(legend[relationIndex])
	if outgoing {
		switch relationName {
		case "Sequel":
			return "Fortsetzung"
		case "Nebengeschichte":
			return "Nebengeschichte"
		case "Hauptgeschichte":
			return "Hauptgeschichte"
		case "Zusammenfassung":
			return "Zusammenfassung"
		default:
			return ""
		}
	}

	switch relationName {
	case "Nebengeschichte":
		return "Hauptgeschichte"
	case "Hauptgeschichte":
		return "Nebengeschichte"
	default:
		return ""
	}
}

func normalizeAniSearchGraphNodeTitle(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	spanRe := regexp.MustCompile(`(?is)<span[^>]*>.*?</span>`)
	tagRe := regexp.MustCompile(`<[^>]+>`)
	withoutMeta := spanRe.ReplaceAllString(trimmed, " ")
	clean := strings.TrimSpace(tagRe.ReplaceAllString(withoutMeta, " "))
	return strings.Join(strings.Fields(stdhtml.UnescapeString(clean)), " ")
}

func appendUniqueRelations(target []AniSearchAnimeRelation, relation AniSearchAnimeRelation) []AniSearchAnimeRelation {
	titleKey := strings.ToLower(strings.TrimSpace(relation.Title))
	labelKey := strings.ToLower(strings.TrimSpace(relation.RelationLabel))
	for _, existing := range target {
		if strings.ToLower(strings.TrimSpace(existing.Title)) == titleKey && strings.ToLower(strings.TrimSpace(existing.RelationLabel)) == labelKey {
			return target
		}
	}
	return append(target, relation)
}
