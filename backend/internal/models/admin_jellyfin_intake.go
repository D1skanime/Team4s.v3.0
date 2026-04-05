package models

type AdminJellyfinIntakeTypeHint struct {
	SuggestedType *string  `json:"suggested_type,omitempty"`
	Confidence    string   `json:"confidence"`
	Reasons       []string `json:"reasons"`
}

type AdminJellyfinIntakeAssetSlot struct {
	Present bool    `json:"present"`
	Kind    string  `json:"kind"`
	Source  string  `json:"source"`
	Index   *int    `json:"index,omitempty"`
	URL     *string `json:"url,omitempty"`
}

type AdminJellyfinIntakeAssetSlots struct {
	Cover           AdminJellyfinIntakeAssetSlot   `json:"cover"`
	Logo            AdminJellyfinIntakeAssetSlot   `json:"logo"`
	Banner          AdminJellyfinIntakeAssetSlot   `json:"banner"`
	Backgrounds     []AdminJellyfinIntakeAssetSlot `json:"backgrounds"`
	BackgroundVideo AdminJellyfinIntakeAssetSlot   `json:"background_video"`
}

type AdminJellyfinIntakeSearchItem struct {
	JellyfinSeriesID string                      `json:"jellyfin_series_id"`
	Name             string                      `json:"name"`
	ProductionYear   *int                        `json:"production_year,omitempty"`
	Path             *string                     `json:"path,omitempty"`
	ParentContext    *string                     `json:"parent_context,omitempty"`
	LibraryContext   *string                     `json:"library_context,omitempty"`
	Confidence       string                      `json:"confidence"`
	TypeHint         AdminJellyfinIntakeTypeHint `json:"type_hint"`
	PosterURL        *string                     `json:"poster_url,omitempty"`
	BannerURL        *string                     `json:"banner_url,omitempty"`
	LogoURL          *string                     `json:"logo_url,omitempty"`
	BackgroundURL    *string                     `json:"background_url,omitempty"`
	AlreadyImported  bool                        `json:"already_imported"`
	ExistingAnimeID  *int64                      `json:"existing_anime_id,omitempty"`
	ExistingTitle    *string                     `json:"existing_title,omitempty"`
}

type AdminJellyfinIntakePreviewResult struct {
	JellyfinSeriesID    string                        `json:"jellyfin_series_id"`
	JellyfinSeriesName  string                        `json:"jellyfin_series_name"`
	JellyfinSeriesPath  *string                       `json:"jellyfin_series_path,omitempty"`
	FolderNameTitleSeed *string                       `json:"folder_name_title_seed,omitempty"`
	ParentContext       *string                       `json:"parent_context,omitempty"`
	LibraryContext      *string                       `json:"library_context,omitempty"`
	Description         *string                       `json:"description,omitempty"`
	Year                *int16                        `json:"year,omitempty"`
	Genre               *string                       `json:"genre,omitempty"`
	Tags                []string                      `json:"tags"`
	AniDBID             *string                       `json:"anidb_id,omitempty"`
	TypeHint            AdminJellyfinIntakeTypeHint   `json:"type_hint"`
	AssetSlots          AdminJellyfinIntakeAssetSlots `json:"asset_slots"`
}
