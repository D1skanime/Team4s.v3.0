package models

import "time"

// CommentFilter enthält die Paginierungsparameter für Kommentarlistenabfragen.
type CommentFilter struct {
	Page    int // Seitennummer (1-basiert)
	PerPage int // Einträge pro Seite
}

// CommentListItem repräsentiert einen einzelnen Kommentar in der öffentlichen Kommentarliste
// eines Anime.
type CommentListItem struct {
	ID         int64     `json:"id"`
	AnimeID    int64     `json:"anime_id"`
	AuthorName string    `json:"author_name"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
}

// CommentCreateInput enthält die Eingabedaten zum Erstellen eines neuen Kommentars.
type CommentCreateInput struct {
	AuthorName string
	Content    string
}
