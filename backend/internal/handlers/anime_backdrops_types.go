package handlers

type animeJellyfinSeriesListResponse struct {
	Items []animeJellyfinSeriesItem `json:"Items"`
}

type animeJellyfinSeriesItem struct {
	ID   string `json:"Id"`
	Name string `json:"Name"`
}

type animeJellyfinThemeVideosResponse struct {
	Items []animeJellyfinThemeVideoItem `json:"Items"`
}

type animeJellyfinThemeVideoItem struct {
	ID string `json:"Id"`
}
