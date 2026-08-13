package repository

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"
	"time"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

const phase128SlugMaxLength = 120

func TestPhase128MemberSlugContract(t *testing.T) {
	helperPath := filepath.Join(phase128RepositoryDir(t), "member_public_slug.go")
	helper, err := os.ReadFile(helperPath)
	require.NoError(t, err, "shared member slug allocator must exist")
	helperSource := strings.ToLower(string(helper))
	for _, required := range []string{"normalizepublicmemberslug", "allocatepublicmemberslugtx", "pg_advisory_xact_lock", "public_slug"} {
		require.Contains(t, helperSource, required)
	}
	expected := []string{"fansub_group_app_members_repository.go", "hist_group_members_repository.go", "member_requests_repository.go"}
	require.Equal(t, expected, phase128ProductionMemberInsertFiles(t))
	for _, name := range expected {
		source, err := os.ReadFile(filepath.Join(phase128RepositoryDir(t), name))
		require.NoError(t, err)
		require.Contains(t, strings.ToLower(string(source)), "allocatepublicmemberslugtx")
		require.Contains(t, strings.ToLower(string(source)), "public_slug")
	}
	for _, forbidden := range []string{"crypto/rand", "math/rand", "uuid", "member_id fallback"} {
		require.NotContains(t, helperSource, forbidden)
	}
}

func TestPhase128MemberInsertInventory(t *testing.T) {
	expected := []string{"fansub_group_app_members_repository.go", "hist_group_members_repository.go", "member_requests_repository.go"}
	require.Equal(t, expected, phase128ProductionMemberInsertFiles(t))
}

func TestPhase128MemberSlugNormalizationCases(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      string
		wantError bool
	}{
		{"german transliteration and ampersand", "M\u00fcller & S\u00f6hne", "mueller-und-soehne", false},
		{"decomposable accents", "Cr\u00e8me br\u00fbl\u00e9e", "creme-brulee", false},
		{"punctuation collapse", "---Alpha...Beta---", "alpha-beta", false},
		{"whitespace", "   Alpha   Beta   ", "alpha-beta", false},
		{"empty", "   ", "", true},
		{"numeric", "123", "", true},
		{"control", "alpha\nbeta", "", true},
		{"forward path separator", "alpha/beta", "", true},
		{"backward path separator", "alpha\\beta", "", true},
		{"too long", strings.Repeat("a", phase128SlugMaxLength+1), "", true},
	}
	for _, reserved := range []string{"admin", "api", "edit", "me", "members", "new", "profile", "ranking", "settings"} {
		tests = append(tests, struct {
			name      string
			input     string
			want      string
			wantError bool
		}{"reserved " + reserved, reserved, "", true})
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := normalizePublicMemberSlug(test.input)
			if test.wantError {
				require.Error(t, err)
				require.Empty(t, got)
				return
			}
			require.NoError(t, err)
			require.Equal(t, test.want, got)
		})
	}
}

func TestPhase128MemberSlugCandidateRespectsLimit(t *testing.T) {
	base := strings.Repeat("a", phase128SlugMaxLength)
	candidate := publicMemberSlugCandidate(base, 2)
	require.Len(t, candidate, phase128SlugMaxLength)
	require.True(t, strings.HasSuffix(candidate, "-2"))
}

func TestPhase128MemberSlugConcurrentAllocationScenarios(t *testing.T) {
	pool := testsupport.OpenPhase128Postgres(t)
	testsupport.ApplySQLFile(t, pool, phase128MigrationPath(t))

	t.Run("same base allocates smallest readable suffixes", func(t *testing.T) {
		slugs := allocatePhase128SlugsConcurrently(t, pool, []string{"Name", "Name", "Name"})
		sort.Strings(slugs)
		require.Equal(t, []string{"name", "name-2", "name-3"}, slugs)
	})

	t.Run("literal suffix waits on the namespace lock", func(t *testing.T) {
		_, err := pool.Exec(context.Background(), `
			INSERT INTO members (nickname, public_slug)
			VALUES ('Literal', 'literal')
		`)
		require.NoError(t, err)

		ctx := context.Background()
		firstTx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer firstTx.Rollback(ctx)

		firstSlug, err := allocatePublicMemberSlugTx(ctx, firstTx, "Literal")
		require.NoError(t, err)
		require.Equal(t, "literal-2", firstSlug)

		type allocationResult struct {
			slug string
			err  error
		}
		secondResult := make(chan allocationResult, 1)
		go func() {
			secondTx, beginErr := pool.Begin(ctx)
			if beginErr != nil {
				secondResult <- allocationResult{err: beginErr}
				return
			}
			defer secondTx.Rollback(ctx)
			slug, allocateErr := allocatePublicMemberSlugTx(ctx, secondTx, "Literal-2")
			if allocateErr != nil {
				secondResult <- allocationResult{err: allocateErr}
				return
			}
			if _, insertErr := secondTx.Exec(ctx, `INSERT INTO members (nickname, public_slug) VALUES ($1, $2)`, "Literal-2", slug); insertErr != nil {
				secondResult <- allocationResult{err: insertErr}
				return
			}
			secondResult <- allocationResult{slug: slug, err: secondTx.Commit(ctx)}
		}()

		select {
		case result := <-secondResult:
			require.Failf(t, "allocator did not serialize the namespace", "literal suffix allocation returned early: slug=%q err=%v", result.slug, result.err)
		case <-time.After(100 * time.Millisecond):
		}

		_, err = firstTx.Exec(ctx, `INSERT INTO members (nickname, public_slug) VALUES ($1, $2)`, "Literal", firstSlug)
		require.NoError(t, err)
		require.NoError(t, firstTx.Commit(ctx))

		select {
		case result := <-secondResult:
			require.NoError(t, result.err)
			require.Equal(t, "literal-2-2", result.slug)
		case <-time.After(3 * time.Second):
			t.Fatal("literal suffix allocation remained blocked after namespace lock release")
		}
	})
}

func allocatePhase128SlugsConcurrently(t testing.TB, pool *pgxpool.Pool, nicknames []string) []string {
	t.Helper()
	type allocationResult struct {
		slug string
		err  error
	}
	start := make(chan struct{})
	results := make(chan allocationResult, len(nicknames))
	for _, nickname := range nicknames {
		nickname := nickname
		go func() {
			<-start
			ctx := context.Background()
			tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
			if err != nil {
				results <- allocationResult{err: err}
				return
			}
			defer tx.Rollback(ctx)
			slug, err := allocatePublicMemberSlugTx(ctx, tx, nickname)
			if err != nil {
				results <- allocationResult{err: err}
				return
			}
			if _, err := tx.Exec(ctx, `INSERT INTO members (nickname, public_slug) VALUES ($1, $2)`, nickname, slug); err != nil {
				results <- allocationResult{err: err}
				return
			}
			results <- allocationResult{slug: slug, err: tx.Commit(ctx)}
		}()
	}
	close(start)
	slugs := make([]string, 0, len(nicknames))
	for range nicknames {
		result := <-results
		require.NoError(t, result.err)
		slugs = append(slugs, result.slug)
	}
	return slugs
}

func phase128MigrationPath(t testing.TB) string {
	t.Helper()
	return filepath.Join(phase128RepositoryDir(t), "..", "..", "..", "database", "migrations", "0145_member_public_identity_visibility.up.sql")
}

func phase128ProductionMemberInsertFiles(t testing.TB) []string {
	t.Helper()
	repositoryDir := phase128RepositoryDir(t)
	entries, err := os.ReadDir(repositoryDir)
	require.NoError(t, err)
	var files []string
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") || strings.HasSuffix(entry.Name(), "_test.go") {
			continue
		}
		source, err := os.ReadFile(filepath.Join(repositoryDir, entry.Name()))
		require.NoError(t, err)
		if strings.Contains(strings.ToLower(string(source)), "insert into members") {
			files = append(files, entry.Name())
		}
	}
	sort.Strings(files)
	return files
}

func phase128RepositoryDir(t testing.TB) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Dir(filename)
}
