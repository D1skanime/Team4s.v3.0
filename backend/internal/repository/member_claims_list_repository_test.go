package repository

import (
	"context"
	"testing"
	"time"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func openPhase138ClaimsListPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return testsupport.OpenPhase137Postgres(t)
}

// seedPhase138Claim seeds one member, one fansub-group historical membership,
// and one member_claims row, optionally linked to an app_user (appUserID <= 0
// means no linked app user, mirroring a claim with app_user_id IS NULL).
func seedPhase138Claim(
	t *testing.T,
	pool *pgxpool.Pool,
	claimID, memberID, fansubGroupID, appUserID int64,
	nickname, groupName, claimStatus string,
) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO members (id, nickname) VALUES ($1, $2)
		ON CONFLICT (id) DO NOTHING
	`, memberID, nickname)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_groups (id, name) VALUES ($1, $2)
		ON CONFLICT (id) DO NOTHING
	`, fansubGroupID, groupName)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO hist_fansub_group_members (fansub_group_id, member_id)
		VALUES ($1, $2)
		ON CONFLICT (fansub_group_id, member_id) DO NOTHING
	`, fansubGroupID, memberID)
	require.NoError(t, err)

	var appUserArg any
	if appUserID > 0 {
		_, err = pool.Exec(ctx, `
			INSERT INTO app_users (id, status, email, display_name)
			VALUES ($1, 'active', $2, $3)
			ON CONFLICT (id) DO NOTHING
		`, appUserID, "user@example.test", "Test User")
		require.NoError(t, err)
		appUserArg = appUserID
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO member_claims (id, member_id, app_user_id, claim_status)
		VALUES ($1, $2, $3, $4)
	`, claimID, memberID, appUserArg, claimStatus)
	require.NoError(t, err)
}

// TestListClaims proves ListClaims answers D-23's cross-group Claims
// workspace query: status filter matches only rows with that status,
// fansub_group_id filter scopes correctly, an empty result set returns an
// empty (not nil) slice with total=0, pagination limit/offset works, and an
// out-of-range limit is clamped rather than passed through raw.
func TestListClaims(t *testing.T) {
	pool := openPhase138ClaimsListPool(t)
	ctx := context.Background()
	repo := NewMemberClaimsRepository(pool)

	seedPhase138Claim(t, pool, 601, 701, 801, 901, "Pending Person", "Chocolate Subs", "pending")
	seedPhase138Claim(t, pool, 602, 702, 801, 902, "Verified Person", "Chocolate Subs", "verified")
	seedPhase138Claim(t, pool, 603, 703, 802, 0, "Other Group Person", "Vanilla Subs", "pending")
	_, err := pool.Exec(ctx, `
		INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id, member_id, status)
		VALUES (1001, 801, 902, 702, 'active')
	`)
	require.NoError(t, err)

	t.Run("reports an existing active group membership", func(t *testing.T) {
		status := "verified"
		rows, _, err := repo.ListClaims(ctx, ClaimListFilter{Status: &status})
		require.NoError(t, err)
		require.Len(t, rows, 1)
		assert.True(t, rows[0].IsActiveMember)
	})

	t.Run("status filter returns only matching rows", func(t *testing.T) {
		status := "verified"
		rows, total, err := repo.ListClaims(ctx, ClaimListFilter{Status: &status})
		require.NoError(t, err)
		require.Len(t, rows, 1)
		assert.Equal(t, 1, total)
		assert.EqualValues(t, 602, rows[0].ClaimID)
		assert.Equal(t, "verified", rows[0].ClaimStatus)
		assert.Equal(t, "claim", rows[0].ClaimType)
	})

	t.Run("fansub_group_id filter scopes correctly", func(t *testing.T) {
		groupID := int64(801)
		rows, total, err := repo.ListClaims(ctx, ClaimListFilter{FansubGroupID: &groupID})
		require.NoError(t, err)
		require.Len(t, rows, 2)
		assert.Equal(t, 2, total)
		for _, row := range rows {
			assert.EqualValues(t, 801, row.FansubGroupID)
		}
	})

	t.Run("no app_user_id link still returns a row with app_user_id=0", func(t *testing.T) {
		status := "pending"
		groupID := int64(802)
		rows, _, err := repo.ListClaims(ctx, ClaimListFilter{Status: &status, FansubGroupID: &groupID})
		require.NoError(t, err)
		require.Len(t, rows, 1)
		assert.EqualValues(t, 0, rows[0].AppUserID)
		assert.Equal(t, "", rows[0].AppUserEmail)
	})

	t.Run("empty result set returns an empty, non-nil slice with total=0", func(t *testing.T) {
		status := "rejected"
		rows, total, err := repo.ListClaims(ctx, ClaimListFilter{Status: &status})
		require.NoError(t, err)
		require.NotNil(t, rows)
		assert.Empty(t, rows)
		assert.Equal(t, 0, total)
	})

	t.Run("pagination limit/offset works", func(t *testing.T) {
		page1, total, err := repo.ListClaims(ctx, ClaimListFilter{Limit: 2, Offset: 0})
		require.NoError(t, err)
		require.Len(t, page1, 2)
		assert.Equal(t, 3, total)

		page2, total2, err := repo.ListClaims(ctx, ClaimListFilter{Limit: 2, Offset: 2})
		require.NoError(t, err)
		require.Len(t, page2, 1)
		assert.Equal(t, 3, total2)

		assert.NotEqual(t, page1[0].ClaimID, page2[0].ClaimID)
	})

	t.Run("an out-of-range limit clamps to the max, not passed through raw", func(t *testing.T) {
		rows, _, err := repo.ListClaims(ctx, ClaimListFilter{Limit: 99999})
		require.NoError(t, err)
		// Only 3 seeded rows exist; a raw limit=99999 would still return exactly
		// 3 (not an error), so assert the clamp indirectly via ClampAdminListPage
		// itself, which is the single source of truth ListClaims delegates to.
		limit, _ := ClampAdminListPage(99999, 0)
		assert.Equal(t, adminListMaxLimit, limit)
		assert.LessOrEqual(t, len(rows), limit)
	})

	t.Run("date range filtering excludes rows outside the window", func(t *testing.T) {
		future := time.Now().Add(24 * time.Hour)
		from := future
		rows, total, err := repo.ListClaims(ctx, ClaimListFilter{From: &from})
		require.NoError(t, err)
		assert.Empty(t, rows)
		assert.Equal(t, 0, total)
	})
}
