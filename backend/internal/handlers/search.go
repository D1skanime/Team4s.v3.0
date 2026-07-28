package handlers

import (
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

const (
	// searchMinQueryLen erzwingt eine serverseitige Mindestlänge (DoS-Mitigation,
	// D-09): kürzere Terme lösen keine teure trgm-/tsvector-Suche aus.
	searchMinQueryLen = 2
	// searchMaxQueryLen begrenzt den Suchbegriff (analog /api/v1/anime, maxLength 100).
	searchMaxQueryLen = 100
	// searchMaxFilterLen begrenzt freie Filter-Strings (genre/tag/format/status).
	searchMaxFilterLen = 100
)

// allowedSearchTypes ist die Enum-Whitelist für den öffentlichen type-Parameter und
// bildet zugleich den API-Wert (deutsch "alle") auf den internen Repository-Diskriminator
// ("all") ab. Ungültige Werte werden vor jedem Repository-Aufruf mit 400 abgewiesen
// (T-115-04-04 — invalider Enum darf keine teure Query auslösen).
var allowedSearchTypes = map[string]string{
	"alle":   "all",
	"anime":  "anime",
	"fansub": "fansub",
}

// allowedSearchSorts ist die Enum-Whitelist für sort. In v1 ist ausschließlich das
// deterministische D-05-Relevanz-Ranking implementiert; weitere Sortierungen sind
// bewusst noch nicht verdrahtet (kein Over-Claim) und werden mit 400 abgewiesen.
var allowedSearchSorts = map[string]struct{}{
	"relevance": {},
}

// errSearchFilterTooLong signalisiert einen überlangen Filter-String.
var errSearchFilterTooLong = errors.New("search filter exceeds maximum length")

// SearchHandler bündelt die Abhängigkeiten des öffentlichen Suchendpunkts. Explizite
// DI wie beim AnimeHandler; das Repository ist die einzige Postgres-Impl (D-02, D-07).
type SearchHandler struct {
	repo *repository.SearchRepository
}

// NewSearchHandler erstellt einen SearchHandler mit dem übergebenen Such-Repository.
func NewSearchHandler(repo *repository.SearchRepository) *SearchHandler {
	return &SearchHandler{repo: repo}
}

// Search verarbeitet GET /api/v1/search: validiert alle Query-Parameter nach den
// bestehenden Handler-Konventionen (parsePositiveInt, badRequest, Enum-Whitelist,
// per_page-Cap, q-Mindestlänge), gated disabled-Anime über die Admin-Identität und
// liefert den {"data": …, "meta": PaginationMeta}-Envelope. Alle Werte fließen
// ausschließlich als Struct-Felder in das Repository (keine SQL-String-Bildung, V5).
func (h *SearchHandler) Search(c *gin.Context) {
	page, err := parsePositiveInt(c.DefaultQuery("page", "1"))
	if err != nil {
		badRequest(c, "ungültiger page parameter")
		return
	}

	perPage, err := parsePositiveInt(c.DefaultQuery("per_page", "24"))
	if err != nil {
		badRequest(c, "ungültiger per_page parameter")
		return
	}
	if perPage > 100 {
		perPage = 100
	}

	q, ok := parseSearchQueryTerm(c)
	if !ok {
		badRequest(c, "der Suchbegriff muss mindestens 2 Zeichen lang sein")
		return
	}
	if len(q) > searchMaxQueryLen {
		badRequest(c, "ungültiger q parameter")
		return
	}

	searchType, ok := allowedSearchTypes[strings.TrimSpace(c.DefaultQuery("type", "alle"))]
	if !ok {
		badRequest(c, "ungültiger type parameter")
		return
	}

	sort := strings.TrimSpace(c.DefaultQuery("sort", "relevance"))
	if _, ok := allowedSearchSorts[sort]; !ok {
		badRequest(c, "ungültiger sort parameter")
		return
	}

	yearFrom, err := parseOptionalInt16(c.Query("year_from"))
	if err != nil {
		badRequest(c, "ungültiger year_from parameter")
		return
	}
	yearTo, err := parseOptionalInt16(c.Query("year_to"))
	if err != nil {
		badRequest(c, "ungültiger year_to parameter")
		return
	}

	genre, err := parseOptionalFilterString(c.Query("genre"))
	if err != nil {
		badRequest(c, "ungültiger genre parameter")
		return
	}
	tag, err := parseOptionalFilterString(c.Query("tag"))
	if err != nil {
		badRequest(c, "ungültiger tag parameter")
		return
	}
	format, err := parseOptionalFilterString(c.Query("format"))
	if err != nil {
		badRequest(c, "ungültiger format parameter")
		return
	}
	status, err := parseOptionalFilterString(c.Query("status"))
	if err != nil {
		badRequest(c, "ungültiger status parameter")
		return
	}

	var fansubGroup *int64
	fansubGroupRaw := strings.TrimSpace(c.Query("fansub_group"))
	if fansubGroupRaw != "" {
		parsed, err := strconv.ParseInt(fansubGroupRaw, 10, 64)
		if err != nil || parsed <= 0 {
			badRequest(c, "ungültiger fansub_group parameter")
			return
		}
		fansubGroup = &parsed
	}

	includeDisabled, err := parseOptionalBoolQuery(c.Query("include_disabled"))
	if err != nil {
		badRequest(c, "ungültiger include_disabled parameter")
		return
	}
	if includeDisabled {
		identity, ok := middleware.CommentAuthIdentityFromContext(c)
		includeDisabled = ok && identity.IsPlatformAdmin
	}

	query := models.SearchQuery{
		Q:               q,
		Type:            searchType,
		YearFrom:        yearFrom,
		YearTo:          yearTo,
		Genre:           genre,
		Tag:             tag,
		Format:          format,
		Status:          status,
		FansubGroup:     fansubGroup,
		Page:            page,
		PerPage:         perPage,
		Sort:            sort,
		IncludeDisabled: includeDisabled,
	}

	result, err := h.repo.Search(c.Request.Context(), query)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Suche konnte nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": buildSearchMeta(result, page, perPage),
	})
}

// Suggestions verarbeitet GET /api/v1/search/suggestions: dieselbe Mindestlänge/
// Maxlänge-Validierung wie Search, liefert die serverseitig je Gruppe begrenzten
// (D-09) Autocomplete-Treffer gruppiert nach Anime/Fansubgruppen.
func (h *SearchHandler) Suggestions(c *gin.Context) {
	q, ok := parseSearchQueryTerm(c)
	if !ok {
		badRequest(c, "der Suchbegriff muss mindestens 2 Zeichen lang sein")
		return
	}
	if len(q) > searchMaxQueryLen {
		badRequest(c, "ungültiger q parameter")
		return
	}

	result, err := h.repo.SearchSuggestions(c.Request.Context(), q)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Suchvorschläge konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// parseSearchQueryTerm trimmt den q-Parameter und erzwingt die Mindestlänge über die
// ZEICHEN-Anzahl (runen-basiert), damit ein einzelner Umlaut nicht per Byte-Länge die
// Mindestlänge umgeht. Rückgabe false ⇒ q ist zu kurz (< searchMinQueryLen).
func parseSearchQueryTerm(c *gin.Context) (string, bool) {
	q := strings.TrimSpace(c.Query("q"))
	if utf8.RuneCountInString(q) < searchMinQueryLen {
		return "", false
	}
	return q, true
}

// buildSearchMeta baut den Pagination-Envelope aus dem strukturierten Suchergebnis.
// total = Summe beider Entitäten; total_pages basiert auf der GRÖSSEREN Trefferzahl,
// da jede Entität unabhängig mit page/per_page paginiert wird (Seiten sind erst
// erschöpft, wenn die größere Trefferliste durch ist). PaginationMeta wird bewusst
// wiederverwendet, nicht neu definiert.
func buildSearchMeta(result models.SearchResult, page, perPage int) models.PaginationMeta {
	total := result.Anime.Total + result.Fansub.Total

	maxEntityTotal := result.Anime.Total
	if result.Fansub.Total > maxEntityTotal {
		maxEntityTotal = result.Fansub.Total
	}

	totalPages := 0
	if maxEntityTotal > 0 && perPage > 0 {
		totalPages = int(math.Ceil(float64(maxEntityTotal) / float64(perPage)))
	}

	return models.PaginationMeta{
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}
}

// parseOptionalInt16 konvertiert einen optionalen Query-Parameter in ein *int16
// (nil = nicht gesetzt). Fehlerhafte oder außerhalb des int16-Bereichs liegende Werte
// führen zu einem Fehler, damit der Handler mit 400 antworten kann.
func parseOptionalInt16(raw string) (*int16, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}
	value, err := strconv.ParseInt(trimmed, 10, 16)
	if err != nil {
		return nil, err
	}
	year := int16(value)
	return &year, nil
}

// parseOptionalFilterString trimmt einen optionalen Filter-String und begrenzt seine
// Länge (DoS-Mitigation). nil = nicht gesetzt. Der Wert selbst fließt später nur als
// $n-Bind-Parameter in die SQL-Schicht.
func parseOptionalFilterString(raw string) (*string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}
	if len(trimmed) > searchMaxFilterLen {
		return nil, errSearchFilterTooLong
	}
	return &trimmed, nil
}
