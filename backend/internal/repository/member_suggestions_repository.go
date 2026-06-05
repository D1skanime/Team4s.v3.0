package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SuggestionInput enthält die Eingabefelder für einen neuen Member-Vorschlag.
type SuggestionInput struct {
	SubmitterAppUserID int64
	SuggestionType     string
	TargetType         string
	TargetID           int64
	ContentText        *string
}

// MemberSuggestionRow ist die Rückgabe nach Create bzw. ListBySubmitter.
type MemberSuggestionRow struct {
	ID                 int64     `json:"id"`
	SubmitterAppUserID int64     `json:"submitter_app_user_id"`
	SuggestionType     string    `json:"suggestion_type"`
	TargetType         string    `json:"target_type"`
	TargetID           int64     `json:"target_id"`
	ContentText        *string   `json:"content_text"`
	Status             string    `json:"status"`
	ReviewNote         *string   `json:"review_note"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// MemberSuggestionsRepository verwaltet Datenbankoperationen für member_suggestions.
type MemberSuggestionsRepository struct {
	db *pgxpool.Pool
}

// NewMemberSuggestionsRepository erstellt ein neues MemberSuggestionsRepository.
func NewMemberSuggestionsRepository(db *pgxpool.Pool) *MemberSuggestionsRepository {
	return &MemberSuggestionsRepository{db: db}
}

// Create legt einen neuen Vorschlag an (status='pending').
// Gibt ErrNotFound zurück bei FK-Verletzung (Submitter nicht gefunden).
func (r *MemberSuggestionsRepository) Create(ctx context.Context, input SuggestionInput) (*MemberSuggestionRow, error) {
	var row MemberSuggestionRow
	err := r.db.QueryRow(ctx, `
		INSERT INTO member_suggestions (
			submitter_app_user_id, suggestion_type, target_type, target_id,
			content_text, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
		RETURNING id, submitter_app_user_id, suggestion_type, target_type, target_id,
		          content_text, status, review_note, created_at, updated_at
	`,
		input.SubmitterAppUserID,
		input.SuggestionType,
		input.TargetType,
		input.TargetID,
		input.ContentText,
	).Scan(
		&row.ID, &row.SubmitterAppUserID, &row.SuggestionType, &row.TargetType, &row.TargetID,
		&row.ContentText, &row.Status, &row.ReviewNote, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if isForeignKeyViolation(err) {
			return nil, fmt.Errorf("vorschlag erstellen: Submitter nicht gefunden: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("vorschlag erstellen: %w", err)
	}
	return &row, nil
}

// ListBySubmitter gibt alle Vorschläge eines Submitters zurück, sortiert nach created_at DESC.
// Gibt maximal 100 Einträge zurück.
func (r *MemberSuggestionsRepository) ListBySubmitter(ctx context.Context, appUserID int64) ([]MemberSuggestionRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, submitter_app_user_id, suggestion_type, target_type, target_id,
		       content_text, status, review_note, created_at, updated_at
		FROM member_suggestions
		WHERE submitter_app_user_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("vorschläge nach submitter: %w", err)
	}
	defer rows.Close()

	result := make([]MemberSuggestionRow, 0)
	for rows.Next() {
		var row MemberSuggestionRow
		if err := rows.Scan(
			&row.ID, &row.SubmitterAppUserID, &row.SuggestionType, &row.TargetType, &row.TargetID,
			&row.ContentText, &row.Status, &row.ReviewNote, &row.CreatedAt, &row.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("vorschläge nach submitter: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("vorschläge nach submitter: iterate: %w", err)
	}
	return result, nil
}
