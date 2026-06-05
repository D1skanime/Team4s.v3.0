package repository

// MemberCorrectionRepository implementiert review-gebundene Korrektur-Vorschläge
// zu Member-Profilen/-Contributions/-Rollen.
// Lock H: Eigene Tabelle — strikt getrennt von Claims/Requests/Contributions.
// Vorschläge werden NIE direkt veröffentlicht (D-18); status ist immer 'in_review'.

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// CorrectionReportInput enthält die Eingabefelder für einen neuen Korrektur-Vorschlag.
type CorrectionReportInput struct {
	SubmitterAppUserID int64
	MemberID           int64
	TargetType         string // 'profile' | 'contribution' | 'role'
	TargetID           *int64 // Kontext-Referenz (z. B. contribution-id oder role-id), nil für Profil
	ReasonText         string
}

// CorrectionReportRow ist die Rückgabe nach erfolgreichem Insert.
type CorrectionReportRow struct {
	ID                 int64     `json:"id"`
	SubmitterAppUserID int64     `json:"submitter_app_user_id"`
	MemberID           int64     `json:"member_id"`
	TargetType         string    `json:"target_type"`
	TargetID           *int64    `json:"target_id,omitempty"`
	ReasonText         string    `json:"reason_text"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// MemberCorrectionRepo ist das Interface für Handler-Stub-Tests (analog ProposalRepository in
// contribution_proposals_me_handler.go Z. 25-29). Ermöglicht DB-freie Tests via Stub.
type MemberCorrectionRepo interface {
	CreateCorrectionReport(ctx context.Context, input CorrectionReportInput) (*CorrectionReportRow, error)
}

// MemberCorrectionRepository kapselt den DB-Zugriff für Korrektur-Vorschläge.
type MemberCorrectionRepository struct {
	db *pgxpool.Pool
}

// NewMemberCorrectionRepository erstellt ein neues MemberCorrectionRepository mit der übergebenen DB-Verbindung.
func NewMemberCorrectionRepository(db *pgxpool.Pool) *MemberCorrectionRepository {
	return &MemberCorrectionRepository{db: db}
}

// CreateCorrectionReport legt einen neuen Korrektur-Vorschlag an.
// Status wird implizit auf 'in_review' gesetzt (review-gebunden, NIE direkt veröffentlicht, D-18).
// SubmitterAppUserID wird serverseitig aus der Identität gesetzt, NICHT aus dem Request-Body (T-74-03-SPOOF).
func (r *MemberCorrectionRepository) CreateCorrectionReport(ctx context.Context, input CorrectionReportInput) (*CorrectionReportRow, error) {
	var row CorrectionReportRow
	err := r.db.QueryRow(ctx, `
		INSERT INTO member_correction_reports (
			submitter_app_user_id,
			member_id,
			target_type,
			target_id,
			reason_text,
			status,
			created_at,
			updated_at
		) VALUES ($1, $2, $3, $4, $5, 'in_review', NOW(), NOW())
		RETURNING id, submitter_app_user_id, member_id, target_type, target_id,
		          reason_text, status, created_at, updated_at
	`,
		input.SubmitterAppUserID,
		input.MemberID,
		input.TargetType,
		input.TargetID,
		input.ReasonText,
	).Scan(
		&row.ID,
		&row.SubmitterAppUserID,
		&row.MemberID,
		&row.TargetType,
		&row.TargetID,
		&row.ReasonText,
		&row.Status,
		&row.CreatedAt,
		&row.UpdatedAt,
	)
	if err != nil {
		if isForeignKeyViolation(err) {
			return nil, fmt.Errorf("korrektur-vorschlag erstellen: Referenz nicht gefunden: %w", ErrNotFound)
		}
		return nil, fmt.Errorf("korrektur-vorschlag erstellen: insert: %w", err)
	}
	return &row, nil
}
