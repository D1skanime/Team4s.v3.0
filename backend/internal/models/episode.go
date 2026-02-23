package models

type EpisodeDetail struct {
	ID                int64    `json:"id"`
	AnimeID           int64    `json:"anime_id"`
	AnimeTitle        string   `json:"anime_title"`
	EpisodeNumber     string   `json:"episode_number"`
	Title             *string  `json:"title,omitempty"`
	Status            string   `json:"status"`
	ViewCount         int32    `json:"view_count"`
	DownloadCount     int32    `json:"download_count"`
	StreamLinks       []string `json:"stream_links,omitempty"`
	PreviousEpisodeID *int64   `json:"previous_episode_id,omitempty"`
	NextEpisodeID     *int64   `json:"next_episode_id,omitempty"`
}
