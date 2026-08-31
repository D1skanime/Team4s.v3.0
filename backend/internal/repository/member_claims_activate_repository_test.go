package repository

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestCollectActivatableHistoricalRolesIncludesFansubLead(t *testing.T) {
	pool := testsupport.OpenPhase137Postgres(t)
	ctx := context.Background()
	repo := NewMemberClaimsRepository(pool)

	_, err := pool.Exec(ctx, `
		ALTER TABLE hist_group_member_roles
			ADD COLUMN hist_fansub_group_member_id BIGINT REFERENCES hist_fansub_group_members(id),
			ADD COLUMN ended_date DATE NULL
	`)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO members (id) VALUES (301)
	`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES (401)`)
	require.NoError(t, err)

	var historicalMembershipID int64
	err = pool.QueryRow(ctx, `
		INSERT INTO hist_fansub_group_members (fansub_group_id, member_id)
		VALUES (401, 301)
		RETURNING id
	`).Scan(&historicalMembershipID)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO hist_group_member_roles (hist_fansub_group_member_id, role_code)
		VALUES ($1, 'fansub_lead')
	`, historicalMembershipID)
	require.NoError(t, err)

	roles, err := repo.collectActivatableHistoricalRoles(ctx, 301, 401)
	require.NoError(t, err)
	require.Equal(t, []string{"fansub_lead"}, roles)
}
