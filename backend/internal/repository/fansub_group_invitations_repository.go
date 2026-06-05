package repository

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type InvitationMutationError struct {
	Code       string
	Message    string
	HTTPStatus int
}

func (e *InvitationMutationError) Error() string {
	if e == nil {
		return ""
	}
	return e.Message
}

func AsInvitationMutationError(err error) (*InvitationMutationError, bool) {
	var target *InvitationMutationError
	if errors.As(err, &target) {
		return target, true
	}
	return nil, false
}

type FansubGroupInvitationRepository struct {
	db         *pgxpool.Pool
	memberRepo *FansubGroupAppMemberRepository
}

func NewFansubGroupInvitationRepository(db *pgxpool.Pool, memberRepo *FansubGroupAppMemberRepository) *FansubGroupInvitationRepository {
	return &FansubGroupInvitationRepository{db: db, memberRepo: memberRepo}
}

func (r *FansubGroupInvitationRepository) ListByFansubGroup(ctx context.Context, fansubGroupID int64) ([]models.FansubGroupInvitation, error) {
	if fansubGroupID <= 0 {
		return nil, fmt.Errorf("list fansub group invitations: invalid fansub id")
	}
	if err := r.expirePendingInvitations(ctx, fansubGroupID); err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			fgi.id,
			fgi.fansub_group_id,
			fgi.email,
			fgi.invited_role_codes,
			fgi.status,
			fgi.expires_at,
			fgi.created_by_app_user_id,
			fgi.accepted_by_app_user_id,
			fgi.cancelled_by_app_user_id,
			fgi.accepted_at,
			fgi.cancelled_at,
			fgi.created_at,
			fgi.updated_at,
			COALESCE(claimed_m.id, legacy_m.id, 0) AS member_id,
			COALESCE(NULLIF(claimed_m.nickname, ''), NULLIF(legacy_m.nickname, ''), '') AS fansub_name
		FROM fansub_group_invitations fgi
		LEFT JOIN app_users au
			ON lower(au.email) = fgi.normalized_email
		LEFT JOIN LATERAL (
			SELECT member_id
			FROM member_claims
			WHERE app_user_id = au.id
			  AND claim_status = 'verified'
			ORDER BY verified_at DESC NULLS LAST, id DESC
			LIMIT 1
		) mc ON true
		LEFT JOIN members claimed_m
			ON claimed_m.id = mc.member_id
		LEFT JOIN members legacy_m
			ON legacy_m.user_id = au.legacy_user_id
		WHERE fgi.fansub_group_id = $1
		  AND fgi.status = 'pending'
		ORDER BY fgi.created_at DESC, fgi.id DESC
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list fansub group invitations: %w", err)
	}
	defer rows.Close()

	invitations := make([]models.FansubGroupInvitation, 0)
	for rows.Next() {
		invitation, err := scanFansubGroupInvitationWithMember(rows)
		if err != nil {
			return nil, err
		}
		invitations = append(invitations, invitation)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list fansub group invitations: iterate: %w", err)
	}

	return invitations, nil
}

func (r *FansubGroupInvitationRepository) Create(
	ctx context.Context,
	fansubGroupID int64,
	input models.FansubGroupInvitationCreateInput,
) (*models.FansubGroupInvitationCreateResult, error) {
	if fansubGroupID <= 0 {
		return nil, fmt.Errorf("create fansub group invitation: invalid fansub id")
	}
	if r.memberRepo == nil {
		return nil, fmt.Errorf("create fansub group invitation: member repo unavailable")
	}

	email, normalizedEmail, err := normalizeInvitationEmail(input.Email)
	if err != nil {
		return nil, err
	}
	roles := normalizeDistinctStrings(input.InvitedRoleCodes)
	if len(roles) == 0 {
		return nil, &InvitationMutationError{Code: "missing_roles", Message: "Mindestens eine Gruppenrolle ist erforderlich.", HTTPStatus: 400}
	}
	for _, role := range roles {
		if _, err := normalizeInvitationRole(role); err != nil {
			return nil, err
		}
	}
	if err := r.expirePendingInvitations(ctx, fansubGroupID); err != nil {
		return nil, err
	}
	if err := r.rejectInvitationForActiveMember(ctx, fansubGroupID, normalizedEmail); err != nil {
		return nil, err
	}

	rawToken, tokenHash, err := generateInvitationToken()
	if err != nil {
		return nil, fmt.Errorf("create fansub group invitation: %w", err)
	}
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	if input.ExpiresAt != nil {
		expiresAt = input.ExpiresAt.UTC()
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO fansub_group_invitations (
			fansub_group_id,
			email,
			normalized_email,
			invited_role_codes,
			token_hash,
			status,
			expires_at,
			created_by_app_user_id,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, NOW(), NOW())
		RETURNING
			id,
			fansub_group_id,
			email,
			invited_role_codes,
			status,
			expires_at,
			created_by_app_user_id,
			accepted_by_app_user_id,
			cancelled_by_app_user_id,
			accepted_at,
			cancelled_at,
			created_at,
			updated_at
	`, fansubGroupID, email, normalizedEmail, roles, tokenHash, expiresAt, input.CreatedByAppUserID)

	invitation, err := scanFansubGroupInvitation(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, &InvitationMutationError{Code: "duplicate_pending_invitation", Message: "Für diese E-Mail existiert bereits eine offene Einladung.", HTTPStatus: 409}
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &models.FansubGroupInvitationCreateResult{
		Invitation: invitation,
		InviteLink: fmt.Sprintf("/invitations/accept?token=%s", rawToken),
	}, nil
}

func (r *FansubGroupInvitationRepository) Cancel(
	ctx context.Context,
	fansubGroupID int64,
	invitationID int64,
	input models.FansubGroupInvitationCancelInput,
) (*models.FansubGroupInvitation, error) {
	if fansubGroupID <= 0 || invitationID <= 0 {
		return nil, fmt.Errorf("cancel fansub group invitation: invalid ids")
	}
	row := r.db.QueryRow(ctx, `
		UPDATE fansub_group_invitations
		SET status = 'cancelled',
			cancelled_by_app_user_id = $3,
			cancelled_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
		  AND fansub_group_id = $2
		  AND status = 'pending'
		  AND expires_at > NOW()
		RETURNING
			id,
			fansub_group_id,
			email,
			invited_role_codes,
			status,
			expires_at,
			created_by_app_user_id,
			accepted_by_app_user_id,
			cancelled_by_app_user_id,
			accepted_at,
			cancelled_at,
			created_at,
			updated_at
	`, invitationID, fansubGroupID, input.CancelledByAppUserID)

	invitation, err := scanFansubGroupInvitation(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &invitation, nil
}

func (r *FansubGroupInvitationRepository) Accept(
	ctx context.Context,
	input models.AcceptFansubInvitationInput,
) (*models.FansubGroupInvitation, *models.FansubGroupAppMember, error) {
	if r.memberRepo == nil {
		return nil, nil, fmt.Errorf("accept fansub group invitation: member repo unavailable")
	}
	token := strings.TrimSpace(input.Token)
	if token == "" {
		return nil, nil, &InvitationMutationError{Code: "missing_token", Message: "Einladungs-Token fehlt.", HTTPStatus: 400}
	}
	normalizedActorEmail := strings.ToLower(strings.TrimSpace(input.ActorAppUser.Email))
	if normalizedActorEmail == "" {
		return nil, nil, &InvitationMutationError{Code: "missing_email", Message: "Der aktuelle App-Benutzer hat keine E-Mail-Adresse.", HTTPStatus: 403}
	}

	tokenHash := hashInvitationToken(token)

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, nil, fmt.Errorf("accept fansub group invitation: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	row := tx.QueryRow(ctx, `
		SELECT
			id,
			fansub_group_id,
			email,
			invited_role_codes,
			status,
			expires_at,
			created_by_app_user_id,
			accepted_by_app_user_id,
			cancelled_by_app_user_id,
			accepted_at,
			cancelled_at,
			created_at,
			updated_at,
			normalized_email
		FROM fansub_group_invitations
		WHERE token_hash = $1
		FOR UPDATE
	`, tokenHash)

	var invitation models.FansubGroupInvitation
	var normalizedEmail string
	err = row.Scan(
		&invitation.ID,
		&invitation.FansubGroupID,
		&invitation.Email,
		&invitation.InvitedRoleCodes,
		&invitation.Status,
		&invitation.ExpiresAt,
		&invitation.CreatedByAppUserID,
		&invitation.AcceptedByAppUser,
		&invitation.CancelledByAppUser,
		&invitation.AcceptedAt,
		&invitation.CancelledAt,
		&invitation.CreatedAt,
		&invitation.UpdatedAt,
		&normalizedEmail,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, fmt.Errorf("accept fansub group invitation: query invitation: %w", err)
	}

	if invitation.Status != models.FansubGroupInvitationStatusPending {
		return nil, nil, mapTerminalInvitationState(invitation.Status)
	}
	if invitation.ExpiresAt.UTC().Before(time.Now().UTC()) {
		if _, err := tx.Exec(ctx, `
			UPDATE fansub_group_invitations
			SET status = 'expired', updated_at = NOW()
			WHERE id = $1
		`, invitation.ID); err != nil {
			return nil, nil, fmt.Errorf("accept fansub group invitation: mark expired: %w", err)
		}
		return nil, nil, &InvitationMutationError{Code: "invitation_expired", Message: "Diese Einladung ist bereits abgelaufen.", HTTPStatus: 410}
	}
	if normalizedEmail != normalizedActorEmail {
		return nil, nil, &InvitationMutationError{Code: "email_mismatch", Message: "Diese Einladung gehört zu einer anderen E-Mail-Adresse.", HTTPStatus: 403}
	}
	if err := r.rejectInvitationForActiveMember(ctx, invitation.FansubGroupID, normalizedActorEmail); err != nil {
		return nil, nil, err
	}

	member, err := r.memberRepo.EnsureInvitationAcceptance(ctx, invitation.FansubGroupID, input.ActorAppUser.ID, invitation.InvitedRoleCodes, &input.ActorAppUser.ID)
	if err != nil {
		if errors.Is(err, ErrConflict) {
			return nil, nil, &InvitationMutationError{Code: "membership_conflict", Message: "Der Benutzer ist bereits aktives Gruppenmitglied.", HTTPStatus: 409}
		}
		return nil, nil, err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE fansub_group_invitations
		SET status = 'accepted',
			accepted_by_app_user_id = $2,
			accepted_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`, invitation.ID, input.ActorAppUser.ID); err != nil {
		return nil, nil, fmt.Errorf("accept fansub group invitation: update invitation: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("accept fansub group invitation: commit: %w", err)
	}

	invitation.Status = models.FansubGroupInvitationStatusAccepted
	invitation.AcceptedByAppUser = &input.ActorAppUser.ID
	now := time.Now().UTC()
	invitation.AcceptedAt = &now
	invitation.UpdatedAt = now

	return &invitation, member, nil
}

func (r *FansubGroupInvitationRepository) expirePendingInvitations(ctx context.Context, fansubGroupID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE fansub_group_invitations
		SET status = 'expired',
			updated_at = NOW()
		WHERE fansub_group_id = $1
		  AND status = 'pending'
		  AND expires_at <= NOW()
	`, fansubGroupID)
	if err != nil {
		return fmt.Errorf("expire pending fansub group invitations: %w", err)
	}
	return nil
}

func (r *FansubGroupInvitationRepository) rejectInvitationForActiveMember(ctx context.Context, fansubGroupID int64, normalizedEmail string) error {
	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM fansub_group_members fgm
			JOIN app_users au ON au.id = fgm.app_user_id
			WHERE fgm.fansub_group_id = $1
			  AND fgm.status = 'active'
			  AND LOWER(TRIM(au.email)) = $2
		)
	`, fansubGroupID, normalizedEmail).Scan(&exists); err != nil {
		return fmt.Errorf("reject invitation for active member: %w", err)
	}
	if exists {
		return &InvitationMutationError{Code: "already_active_member", Message: "Diese E-Mail ist bereits aktives Gruppenmitglied.", HTTPStatus: 409}
	}
	return nil
}

type invitationScanner interface {
	Scan(dest ...any) error
}

func scanFansubGroupInvitation(row invitationScanner) (models.FansubGroupInvitation, error) {
	var invitation models.FansubGroupInvitation
	err := row.Scan(
		&invitation.ID,
		&invitation.FansubGroupID,
		&invitation.Email,
		&invitation.InvitedRoleCodes,
		&invitation.Status,
		&invitation.ExpiresAt,
		&invitation.CreatedByAppUserID,
		&invitation.AcceptedByAppUser,
		&invitation.CancelledByAppUser,
		&invitation.AcceptedAt,
		&invitation.CancelledAt,
		&invitation.CreatedAt,
		&invitation.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.FansubGroupInvitation{}, err
		}
		return models.FansubGroupInvitation{}, fmt.Errorf("scan fansub group invitation: %w", err)
	}
	return invitation, nil
}

func scanFansubGroupInvitationWithMember(row invitationScanner) (models.FansubGroupInvitation, error) {
	var invitation models.FansubGroupInvitation
	var memberIdentity models.FansubGroupMemberIdentity
	err := row.Scan(
		&invitation.ID,
		&invitation.FansubGroupID,
		&invitation.Email,
		&invitation.InvitedRoleCodes,
		&invitation.Status,
		&invitation.ExpiresAt,
		&invitation.CreatedByAppUserID,
		&invitation.AcceptedByAppUser,
		&invitation.CancelledByAppUser,
		&invitation.AcceptedAt,
		&invitation.CancelledAt,
		&invitation.CreatedAt,
		&invitation.UpdatedAt,
		&memberIdentity.MemberID,
		&memberIdentity.FansubName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.FansubGroupInvitation{}, err
		}
		return models.FansubGroupInvitation{}, fmt.Errorf("scan fansub group invitation with member: %w", err)
	}
	if memberIdentity.MemberID > 0 && strings.TrimSpace(memberIdentity.FansubName) != "" {
		invitation.Member = &memberIdentity
	}
	return invitation, nil
}

func normalizeInvitationEmail(value string) (string, string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", "", &InvitationMutationError{Code: "missing_email", Message: "E-Mail ist erforderlich.", HTTPStatus: 400}
	}
	parsed, err := mail.ParseAddress(trimmed)
	if err != nil {
		return "", "", &InvitationMutationError{Code: "invalid_email", Message: "E-Mail ist ungültig.", HTTPStatus: 400}
	}
	email := strings.TrimSpace(parsed.Address)
	return email, strings.ToLower(email), nil
}

func normalizeInvitationRole(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", &InvitationMutationError{Code: "missing_role", Message: "Leere Rollen sind nicht erlaubt.", HTTPStatus: 400}
	}
	if !permissions.IsKnownFansubGroupRole(trimmed) {
		return "", &InvitationMutationError{Code: "unknown_role", Message: "Unbekannte Gruppenrolle.", HTTPStatus: 400}
	}
	return trimmed, nil
}

func generateInvitationToken() (string, string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", "", err
	}
	rawToken := base64.RawURLEncoding.EncodeToString(buffer)
	return rawToken, hashInvitationToken(rawToken), nil
}

func hashInvitationToken(raw string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
	return hex.EncodeToString(sum[:])
}

func mapTerminalInvitationState(status string) error {
	switch strings.TrimSpace(status) {
	case models.FansubGroupInvitationStatusCancelled:
		return &InvitationMutationError{Code: "invitation_cancelled", Message: "Diese Einladung wurde bereits zurückgezogen.", HTTPStatus: 410}
	case models.FansubGroupInvitationStatusAccepted:
		return &InvitationMutationError{Code: "invitation_used", Message: "Diese Einladung wurde bereits verwendet.", HTTPStatus: 409}
	case models.FansubGroupInvitationStatusExpired:
		return &InvitationMutationError{Code: "invitation_expired", Message: "Diese Einladung ist bereits abgelaufen.", HTTPStatus: 410}
	default:
		return &InvitationMutationError{Code: "invalid_invitation_state", Message: "Diese Einladung kann nicht mehr verwendet werden.", HTTPStatus: 409}
	}
}
