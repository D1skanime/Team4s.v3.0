package repository

import (
	"context"
	"errors"
	"fmt"
	"regexp"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

var publicMemberSlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// PublicMemberAccess is the minimal, server-computed decision passed to
// public profile detail loaders. It deliberately exposes no app-user identity.
type PublicMemberAccess struct {
	MemberID         int64
	Slug             string
	IsOwner          bool
	IsPrivatePreview bool
}

// ResolvePublicMemberAccess resolves canonical stored identity and visibility
// before any public profile detail is loaded. Missing members and every denied
// private profile deliberately share ErrNotFound.
func (r *MemberProfileRepository) ResolvePublicMemberAccess(
	ctx context.Context,
	requestedSlug string,
	viewerAppUserID int64,
) (PublicMemberAccess, error) {
	if len(requestedSlug) == 0 ||
		len(requestedSlug) > 512 ||
		!publicMemberSlugPattern.MatchString(requestedSlug) ||
		memberSlugNumeric.MatchString(requestedSlug) {
		return PublicMemberAccess{}, ErrNotFound
	}

	var access PublicMemberAccess
	var visibility string
	err := r.db.QueryRow(ctx, `
		SELECT
			m.id,
			m.public_slug,
			m.profile_visibility,
			EXISTS (
				SELECT 1
				FROM member_claims mc
				WHERE mc.member_id = m.id
				  AND mc.app_user_id = $2
				  AND mc.claim_status = 'verified'
			) AS is_owner
		FROM members m
		WHERE m.public_slug = $1
	`, requestedSlug, viewerAppUserID).Scan(
		&access.MemberID,
		&access.Slug,
		&visibility,
		&access.IsOwner,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return PublicMemberAccess{}, ErrNotFound
	}
	if err != nil {
		return PublicMemberAccess{}, fmt.Errorf("resolve public member access: %w", err)
	}

	switch visibility {
	case models.ProfileVisibilityPublic:
		return access, nil
	case models.ProfileVisibilityPrivate:
		if !access.IsOwner {
			return PublicMemberAccess{}, ErrNotFound
		}
		access.IsPrivatePreview = true
		return access, nil
	default:
		return PublicMemberAccess{}, ErrNotFound
	}
}
