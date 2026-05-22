package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
)

type AuditLogEntry struct {
	ActorAppUserID    *int64
	ActorLegacyUserID *int64
	EventType         string
	ScopeType         string
	ScopeID           *int64
	TargetType        string
	TargetID          *int64
	Action            string
	Outcome           string
	ReasonCode        *string
	Payload           map[string]any
}

type AuditLogRepository struct {
	db DBTX
}

type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
}

func NewAuditLogRepository(db DBTX) *AuditLogRepository {
	return &AuditLogRepository{db: db}
}

func (r *AuditLogRepository) Write(ctx context.Context, entry AuditLogEntry) error {
	if r == nil || r.db == nil {
		return nil
	}

	payload, err := json.Marshal(entry.Payload)
	if err != nil {
		return fmt.Errorf("marshal audit log payload: %w", err)
	}

	if _, err := r.db.Exec(ctx, `
		INSERT INTO audit_logs (
			actor_app_user_id,
			actor_legacy_user_id,
			event_type,
			scope_type,
			scope_id,
			target_type,
			target_id,
			action_name,
			outcome,
			reason_code,
			payload
		)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, NULLIF($6, ''), $7, NULLIF($8, ''), NULLIF($9, ''), $10, $11::jsonb)
	`,
		entry.ActorAppUserID,
		entry.ActorLegacyUserID,
		entry.EventType,
		entry.ScopeType,
		entry.ScopeID,
		entry.TargetType,
		entry.TargetID,
		entry.Action,
		entry.Outcome,
		entry.ReasonCode,
		string(payload),
	); err != nil {
		return fmt.Errorf("insert audit log %q: %w", entry.EventType, err)
	}

	return nil
}
