package repository

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

var (
	phase128PublicSlugPattern  = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	phase128NumericSlugPattern = regexp.MustCompile(`^[0-9]+$`)
)

// This is the minimal deny-first result expected from Plan 128-09. Ownership
// is reduced to server-computed facts; no app-user identifier is exposed.
type phase128ReferencePublicMemberAccess struct {
	MemberID         int64
	Slug             string
	IsOwner          bool
	IsPrivatePreview bool
}

func TestPhase128PublicMemberAccessContract(t *testing.T) {
	path := filepath.Join(phase128AccessRepositoryDir(t), "member_public_access_repository.go")
	source, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		t.Fatalf("missing Phase-128 resolver contract: %s", path)
	}
	require.NoError(t, err)
	normalized := strings.ToLower(string(source))
	for _, fragment := range []string{
		"type publicmemberaccess", "memberid", "slug", "isowner", "isprivatepreview",
		"func (r *memberprofilerepository) resolvepublicmemberaccess", "member_claims",
		"claim_status = 'verified'", "app_user_id", "public_slug", "errnotfound",
	} {
		require.Contains(t, normalized, fragment, "missing resolver contract fragment %q", fragment)
	}
	require.NotContains(t, normalized, "isplatformadmin")
	require.NotContains(t, normalized, "m.user_id")
}

func TestPhase128VisibilityFirstReferenceMatrix(t *testing.T) {
	pool := testsupport.OpenPhase128Postgres(t)
	preparePhase128PublicAccessFixture(t, pool)

	type accessCase struct {
		name            string
		slug            string
		viewerAppUserID int64
		isAdmin         bool
		want            phase128ReferencePublicMemberAccess
		wantNotFound    bool
	}
	cases := []accessCase{
		{name: "public anonymous", slug: "public-member", want: phase128ReferencePublicMemberAccess{MemberID: 1, Slug: "public-member"}},
		{name: "private anonymous", slug: "stable-private", wantNotFound: true},
		{name: "verified owner", slug: "stable-private", viewerAppUserID: 301, want: phase128ReferencePublicMemberAccess{MemberID: 2, Slug: "stable-private", IsOwner: true, IsPrivatePreview: true}},
		{name: "private non-owner login pending claim and members.user_id", slug: "stable-private", viewerAppUserID: 302, wantNotFound: true},
		{name: "admin non-owner with rejected claim", slug: "stable-private", viewerAppUserID: 303, isAdmin: true, wantNotFound: true},
		{name: "missing", slug: "missing-member", wantNotFound: true},
		{name: "numeric", slug: "2", viewerAppUserID: 301, wantNotFound: true},
		{name: "guessed post-nickname slug", slug: "renamed-private", viewerAppUserID: 301, wantNotFound: true},
	}
	require.Len(t, cases, 8)

	for _, test := range cases {
		got, err := phase128ResolvePublicMemberAccess(t.Context(), pool, test.slug, test.viewerAppUserID)
		if test.wantNotFound {
			require.ErrorIs(t, err, ErrNotFound, test.name)
			require.Zero(t, got, test.name)
			continue
		}
		require.NoError(t, err, test.name)
		require.Equal(t, test.want, got, test.name)
	}
}

func TestPhase128PublicMemberAccessResultHasNoAppUserID(t *testing.T) {
	typ := reflect.TypeOf(phase128ReferencePublicMemberAccess{})
	for index := 0; index < typ.NumField(); index++ {
		require.NotEqual(t, "AppUserID", typ.Field(index).Name)
	}
}

func phase128ResolvePublicMemberAccess(ctx context.Context, pool *pgxpool.Pool, slug string, viewerAppUserID int64) (phase128ReferencePublicMemberAccess, error) {
	slug = strings.TrimSpace(slug)
	if !phase128PublicSlugPattern.MatchString(slug) || phase128NumericSlugPattern.MatchString(slug) {
		return phase128ReferencePublicMemberAccess{}, ErrNotFound
	}
	var result phase128ReferencePublicMemberAccess
	var visibility string
	err := pool.QueryRow(ctx, `
		SELECT m.id, m.public_slug, m.profile_visibility,
			EXISTS (
				SELECT 1 FROM member_claims mc
				WHERE mc.member_id = m.id AND mc.app_user_id = $2
				  AND mc.claim_status = 'verified'
			) AS is_owner
		FROM members m
		WHERE m.public_slug = $1
	`, slug, viewerAppUserID).Scan(&result.MemberID, &result.Slug, &visibility, &result.IsOwner)
	if errors.Is(err, pgx.ErrNoRows) {
		return phase128ReferencePublicMemberAccess{}, ErrNotFound
	}
	if err != nil {
		return phase128ReferencePublicMemberAccess{}, err
	}
	if visibility == "private" && !result.IsOwner {
		return phase128ReferencePublicMemberAccess{}, ErrNotFound
	}
	result.IsPrivatePreview = visibility == "private" && result.IsOwner
	return result, nil
}

func preparePhase128PublicAccessFixture(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		ALTER TABLE members DROP CONSTRAINT chk_members_profile_visibility;
		ALTER TABLE members ADD COLUMN public_slug VARCHAR(512) NOT NULL UNIQUE;
		ALTER TABLE members ADD COLUMN user_id BIGINT;
		ALTER TABLE members ADD CONSTRAINT chk_members_profile_visibility CHECK (profile_visibility IN ('public', 'private'));
		INSERT INTO members(id, nickname, public_slug, profile_visibility, user_id) VALUES
			(1, 'Public Member', 'public-member', 'public', NULL),
			(2, 'Renamed Private', 'stable-private', 'private', 302);
		INSERT INTO member_claims(member_id, app_user_id, claim_status) VALUES
			(2, 301, 'verified'), (2, 302, 'pending'), (2, 303, 'rejected');
	`)
	require.NoError(t, err)
}

func phase128AccessRepositoryDir(t testing.TB) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Dir(filename)
}
