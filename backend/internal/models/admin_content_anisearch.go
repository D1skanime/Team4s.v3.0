package models

// quick-261018-l5r Task 2 (CLAUDE.md 450-Zeilen-Regel): die AniSearch-Entwurf-/Anreicherungs-/
// Edit-/Link-/Uebernahme-Typen (inkl. der generischen Asset-Suche) wurden rein umbauend (kein
// Verhaltenswechsel) aus admin_content.go hierher verschoben, da die Uebernahme-Feature-
// Erweiterung diese Datei ueber das 450-Zeilen-Limit getrieben haette.

type AdminAnimeCreateDraftAssetSuggestions struct {
	Cover           *string  `json:"cover,omitempty"`
	Banner          *string  `json:"banner,omitempty"`
	Logo            *string  `json:"logo,omitempty"`
	Backgrounds     []string `json:"backgrounds,omitempty"`
	BackgroundVideo *string  `json:"background_video,omitempty"`
}

type AdminAnimeAltTitle struct {
	Language *string `json:"language,omitempty"`
	Kind     *string `json:"kind,omitempty"`
	Title    string  `json:"title"`
}

type AdminAnimeCreateDraftPayload struct {
	Title            string                                 `json:"title"`
	TitleDE          *string                                `json:"title_de,omitempty"`
	TitleEN          *string                                `json:"title_en,omitempty"`
	Type             string                                 `json:"type"`
	ContentType      string                                 `json:"content_type"`
	Status           string                                 `json:"status"`
	Year             *int16                                 `json:"year,omitempty"`
	MaxEpisodes      *int16                                 `json:"max_episodes,omitempty"`
	Genre            *string                                `json:"genre,omitempty"`
	Description      *string                                `json:"description,omitempty"`
	CoverImage       *string                                `json:"cover_image,omitempty"`
	Source           *string                                `json:"source,omitempty"`
	FolderName       *string                                `json:"folder_name,omitempty"`
	AltTitles        []AdminAnimeAltTitle                   `json:"alt_titles,omitempty"`
	Tags             []string                               `json:"tags,omitempty"`
	Relations        []AdminAnimeRelation                   `json:"relations,omitempty"`
	AssetSuggestions *AdminAnimeCreateDraftAssetSuggestions `json:"asset_suggestions,omitempty"`
}

type AdminAnimeAniSearchEnrichmentRequest struct {
	AniSearchID string                       `json:"anisearch_id"`
	Draft       AdminAnimeCreateDraftPayload `json:"draft"`
}

type AdminAnimeAniSearchSearchCandidate struct {
	AniSearchID     string  `json:"anisearch_id"`
	Title           string  `json:"title"`
	Type            string  `json:"type"`
	Year            *int16  `json:"year,omitempty"`
	ExistingAnimeID *int64  `json:"existing_anime_id,omitempty"`
	ExistingTitle   *string `json:"existing_title,omitempty"`
}

type AdminAnimeAniSearchSearchResult struct {
	Data []AdminAnimeAniSearchSearchCandidate `json:"data"`
}

type AdminAnimeAniSearchSearchResponse = AdminAnimeAniSearchSearchResult

type AdminAnimeAssetSearchSource string

const (
	AdminAnimeAssetSearchSourceTMDB      AdminAnimeAssetSearchSource = "tmdb"
	AdminAnimeAssetSearchSourceFanartTV  AdminAnimeAssetSearchSource = "fanart.tv"
	AdminAnimeAssetSearchSourceZerochan  AdminAnimeAssetSearchSource = "zerochan"
	AdminAnimeAssetSearchSourceKonachan  AdminAnimeAssetSearchSource = "konachan"
	AdminAnimeAssetSearchSourceAniList   AdminAnimeAssetSearchSource = "anilist"
	AdminAnimeAssetSearchSourceSafebooru AdminAnimeAssetSearchSource = "safebooru"
)

type AdminAnimeAssetSearchRequest struct {
	AssetKind string
	Query     string
	Limit     int
	Page      int // 1-indexed; 0 treated as 1
	Sources   []AdminAnimeAssetSearchSource
}

type AdminAnimeAssetSearchCandidate struct {
	ID         string                      `json:"id"`
	AssetKind  string                      `json:"asset_kind"`
	Source     AdminAnimeAssetSearchSource `json:"source"`
	Title      *string                     `json:"title,omitempty"`
	PreviewURL string                      `json:"preview_url"`
	ImageURL   string                      `json:"image_url"`
	SourceURL  *string                     `json:"source_url,omitempty"`
	Width      *int32                      `json:"width,omitempty"`
	Height     *int32                      `json:"height,omitempty"`
	Year       *int16                      `json:"year,omitempty"`
}

type AdminAnimeAssetSearchResponse struct {
	Data []AdminAnimeAssetSearchCandidate `json:"data"`
}

type AdminAnimeAniSearchEnrichmentProviderSummary struct {
	AniSearchID        string `json:"anisearch_id"`
	JellysyncApplied   bool   `json:"jellysync_applied"`
	RelationCandidates int32  `json:"relation_candidates"`
	RelationMatches    int32  `json:"relation_matches"`
}

type AdminAnimeAniSearchEnrichmentDraftResult struct {
	Mode             string                                       `json:"mode"`
	AniSearchID      string                                       `json:"anisearch_id"`
	Source           string                                       `json:"source"`
	Draft            AdminAnimeCreateDraftPayload                 `json:"draft"`
	ManualFieldsKept []string                                     `json:"manual_fields_kept,omitempty"`
	FilledFields     []string                                     `json:"filled_fields,omitempty"`
	FilledAssets     []string                                     `json:"filled_assets,omitempty"`
	Provider         AdminAnimeAniSearchEnrichmentProviderSummary `json:"provider"`
}

type AdminAnimeAniSearchEnrichmentRedirectResult struct {
	Mode            string `json:"mode"`
	AniSearchID     string `json:"anisearch_id"`
	ExistingAnimeID int64  `json:"existing_anime_id"`
	ExistingTitle   string `json:"existing_title"`
	RedirectPath    string `json:"redirect_path"`
}

// AdminAnimeEditDraftPayload mirrors the edit PATCH surface after JSON binding.
// AniSearch edit enrichment returns this draft-first payload so the normal PATCH
// save seam remains the only metadata persistence step.
type AdminAnimeEditDraftPayload struct {
	Title       *string  `json:"title,omitempty"`
	TitleDE     *string  `json:"title_de,omitempty"`
	TitleEN     *string  `json:"title_en,omitempty"`
	Type        *string  `json:"type,omitempty"`
	ContentType *string  `json:"content_type,omitempty"`
	Status      *string  `json:"status,omitempty"`
	Year        *int16   `json:"year,omitempty"`
	MaxEpisodes *int16   `json:"max_episodes,omitempty"`
	Genre       *string  `json:"genre,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Description *string  `json:"description,omitempty"`
	CoverImage  *string  `json:"cover_image,omitempty"`
	Source      *string  `json:"source,omitempty"`
	FolderName  *string  `json:"folder_name,omitempty"`
}

type AdminAnimeAniSearchEditRequest struct {
	AniSearchID     string                     `json:"anisearch_id"`
	Draft           AdminAnimeEditDraftPayload `json:"draft"`
	ProtectedFields []string                   `json:"protected_fields,omitempty"`
}

type AdminAnimeAniSearchEditSuccessResult struct {
	Mode                     string                     `json:"mode"`
	AniSearchID              string                     `json:"anisearch_id"`
	Source                   string                     `json:"source"`
	Draft                    AdminAnimeEditDraftPayload `json:"draft"`
	UpdatedFields            []string                   `json:"updated_fields,omitempty"`
	AppliedRelations         []AdminAnimeRelation       `json:"applied_relations,omitempty"`
	RelationsApplied         int32                      `json:"relations_applied"`
	RelationsSkippedExisting int32                      `json:"relations_skipped_existing"`
	SkippedProtectedFields   []string                   `json:"skipped_protected_fields,omitempty"`
}

type AdminAnimeAniSearchEditConflictResult struct {
	Mode            string `json:"mode"`
	AniSearchID     string `json:"anisearch_id"`
	ExistingAnimeID int64  `json:"existing_anime_id"`
	ExistingTitle   string `json:"existing_title"`
	RedirectPath    string `json:"redirect_path"`
}

// AdminAnimeAniSearchLinkResult (quick-261018-l5r Task 1) ist die Erfolgsantwort des additiven
// AniSearch-Verknüpfungs-Endpunkts (POST /admin/anime/:id/anisearch/link). Seit Task 2 übernimmt
// derselbe Endpunkt zusätzlich, in der GLEICHEN Transaktion wie der Link-Schreibvorgang, einen
// definierten Satz an Feldern von AniSearch (siehe Takeover) -- Takeover ist nil, wenn die
// Übernahme-Prüfung gar nicht erst versucht wurde (z. B. AniSearch-Fetch fehlgeschlagen).
type AdminAnimeAniSearchLinkResult struct {
	Mode        string                              `json:"mode"` // "linked"
	AniSearchID string                              `json:"anisearch_id"`
	Source      string                              `json:"source"` // "anisearch:<id>"
	Takeover    *AdminAnimeAniSearchTakeoverResult `json:"takeover,omitempty"`
}

// AdminAnimeAniSearchFieldOutcome (quick-261018-l5r Task 2) beschreibt die Entscheidung für EIN
// Übernahme-Feld, das NICHT übernommen wurde ("keep") -- inklusive der für die Admin-UI lesbaren
// Begründung (z. B. "Weicht von Jellyfin ab, gilt als manuell gepflegt").
type AdminAnimeAniSearchFieldOutcome struct {
	Field  string `json:"field"`
	Action string `json:"action"` // "keep"
	Reason string `json:"reason"`
}

// AdminAnimeAniSearchTakeoverResult (quick-261018-l5r Task 2) ist die vollständige Zusammenfassung
// der Fill/Replace/Keep-Entscheidung über alle 8 Übernahme-Felder (title_de, title_en, year,
// max_episodes, genre, tags, description, type) für einen additiven AniSearch-Link.
// JellyfinUnreachable ist true, wenn der Anime keinen Jellyfin-Link hat oder der Live-Lookup
// fehlgeschlagen ist -- in diesem Fall lief für JEDES Feld nur die Fill-wenn-leer/Keep-sonst-Regel,
// nie der Jellyfin-Vergleichszweig.
type AdminAnimeAniSearchTakeoverResult struct {
	Filled              []string                           `json:"filled"`
	Replaced            []string                           `json:"replaced"`
	Kept                []AdminAnimeAniSearchFieldOutcome `json:"kept"`
	JellyfinUnreachable bool                                `json:"jellyfin_unreachable"`
}

// AdminAnimeAniSearchTakeoverSnapshot (quick-261018-l5r Task 2) sind die aktuellen Werte der 8
// Übernahme-Felder eines BESTEHENDEN Anime, gelesen VOR dem additiven Link-Schreibvorgang (siehe
// AdminContentRepository.GetAnimeAniSearchTakeoverSnapshot). Title/ContentType/Status sind bewusst
// NICHT Teil dieses Snapshots -- sie sind laut PLAN.md explizit von der Übernahme ausgeschlossen.
type AdminAnimeAniSearchTakeoverSnapshot struct {
	TitleDE     *string
	TitleEN     *string
	Year        *int16
	MaxEpisodes *int16
	Description *string
	Genres      []string
	Tags        []string
	Type        string
}
