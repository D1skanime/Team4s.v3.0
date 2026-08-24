package migrations_test

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

const (
	phase128UpFile   = "0145_member_public_identity_visibility.up.sql"
	phase128DownFile = "0145_member_public_identity_visibility.down.sql"
)

func TestPhase128MigrationRequiresStoredIdentity(t *testing.T) {
	up := readPhase128Migration(t, phase128UpFile)
	requirePhase128SQLContains(t, up,
		"public_slug",
		"not null",
		"unique",
		"^[a-z0-9]+(-[a-z0-9]+)*$",
		"!~ '^[0-9]+$'",
		"profile_visibility in ('public', 'private')",
		"before update",
		"new.public_slug is distinct from old.public_slug",
		"raise exception",
	)
	for _, reserved := range []string{"admin", "api", "edit", "me", "members", "new", "profile", "ranking", "settings"} {
		require.Contains(t, up, "'"+reserved+"'", "0145 must reject reserved slug %q", reserved)
	}

	down := readPhase128Migration(t, phase128DownFile)
	requirePhase128SQLContains(t, down,
		"drop trigger",
		"drop function",
		"drop constraint",
		"drop column",
		"public_slug",
	)
	requirePhase128Order(t, down, "drop trigger", "drop function")
	requirePhase128Order(t, down, "drop function", "drop column")
}

func TestPhase128MigrationNonEmptyMembersFailsBeforeMutation(t *testing.T) {
	requirePhase128MigrationFilesOrSkip(t)
	pool := testsupport.OpenPhase128Postgres(t)
	_, err := pool.Exec(context.Background(), `INSERT INTO members(nickname, display_name) VALUES ('Bestehend', 'Bestehend')`)
	require.NoError(t, err)

	beforeColumns := phase128MemberColumnNames(t, pool)
	beforeVisibility := phase128VisibilityConstraint(t, pool)
	var beforeNickname string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT nickname FROM members`).Scan(&beforeNickname))

	up, err := os.ReadFile(phase128MigrationPath(t, phase128UpFile))
	require.NoError(t, err)
	conn, err := pool.Acquire(context.Background())
	require.NoError(t, err)
	_, err = conn.Exec(context.Background(), string(up))
	require.Error(t, err, "0145 must fail before mutating a non-empty members table")
	_, rollbackErr := conn.Exec(context.Background(), "ROLLBACK")
	require.NoError(t, rollbackErr)
	conn.Release()

	require.Equal(t, beforeColumns, phase128MemberColumnNames(t, pool))
	require.Equal(t, beforeVisibility, phase128VisibilityConstraint(t, pool))
	var afterNickname string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT nickname FROM members`).Scan(&afterNickname))
	require.Equal(t, beforeNickname, afterNickname)
	require.NotContains(t, afterNickname, "public_slug")
}

func TestPhase128MigrationLiveUpDownUp(t *testing.T) {
	requirePhase128MigrationFilesOrSkip(t)
	pool := testsupport.OpenPhase128Postgres(t)
	testsupport.ApplySQLFile(t, pool, phase128MigrationPath(t, phase128UpFile))
	assertPhase128StoredIdentitySchema(t, pool)

	testsupport.ApplySQLFile(t, pool, phase128MigrationPath(t, phase128DownFile))
	require.NotContains(t, phase128MemberColumnNames(t, pool), "public_slug")

	testsupport.ApplySQLFile(t, pool, phase128MigrationPath(t, phase128UpFile))
	assertPhase128StoredIdentitySchema(t, pool)
}

func TestPhase128SlugImmutableAndNicknameStable(t *testing.T) {
	requirePhase128MigrationFilesOrSkip(t)
	pool := testsupport.OpenPhase128Postgres(t)
	testsupport.ApplySQLFile(t, pool, phase128MigrationPath(t, phase128UpFile))

	var memberID int64
	err := pool.QueryRow(context.Background(), `
		INSERT INTO members(nickname, display_name, public_slug, profile_visibility)
		VALUES ('M?ller & S?hne', 'M?ller & S?hne', 'mueller-und-soehne', 'public')
		RETURNING id
	`).Scan(&memberID)
	require.NoError(t, err)

	_, err = pool.Exec(context.Background(), `UPDATE members SET nickname = 'Neuer Name' WHERE id = $1`, memberID)
	require.NoError(t, err)
	var nickname, slug string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT nickname, public_slug FROM members WHERE id = $1`, memberID).Scan(&nickname, &slug))
	require.Equal(t, "Neuer Name", nickname)
	require.Equal(t, "mueller-und-soehne", slug)

	_, err = pool.Exec(context.Background(), `UPDATE members SET public_slug = 'anderer-name' WHERE id = $1`, memberID)
	require.Error(t, err)
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT public_slug FROM members WHERE id = $1`, memberID).Scan(&slug))
	require.Equal(t, "mueller-und-soehne", slug)
}

func TestPhase128StoredIdentityConstraints(t *testing.T) {
	requirePhase128MigrationFilesOrSkip(t)
	pool := testsupport.OpenPhase128Postgres(t)
	testsupport.ApplySQLFile(t, pool, phase128MigrationPath(t, phase128UpFile))

	for _, slug := range []string{"", "123", "ranking", "Upper", "has space", "has/slash"} {
		_, err := pool.Exec(context.Background(), `
			INSERT INTO members(nickname, public_slug, profile_visibility)
			VALUES ('Ung?ltig', $1, 'public')
		`, slug)
		require.Error(t, err, slug)
	}
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members(nickname, public_slug, profile_visibility)
		VALUES ('Privat', 'privat', 'private')
	`)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO members(nickname, public_slug, profile_visibility)
		VALUES ('Doppelt', 'privat', 'public')
	`)
	require.Error(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO members(nickname, public_slug, profile_visibility)
		VALUES ('Alt', 'alt', 'members_only')
	`)
	require.Error(t, err)
}

func assertPhase128StoredIdentitySchema(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	columns := phase128MemberColumnNames(t, pool)
	require.Contains(t, columns, "public_slug")
	require.NotContains(t, phase128VisibilityConstraint(t, pool), "members_only")
	require.Contains(t, phase128VisibilityConstraint(t, pool), "private")

	var nullable string
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT is_nullable
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = 'members'
		  AND column_name = 'public_slug'
	`).Scan(&nullable))
	require.Equal(t, "NO", nullable)

	var unique bool
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT EXISTS (
			SELECT 1
			FROM pg_constraint
			WHERE conrelid = 'members'::regclass
			  AND contype = 'u'
			  AND pg_get_constraintdef(oid) ILIKE '%public_slug%'
		)
	`).Scan(&unique))
	require.True(t, unique)
}

func phase128MemberColumnNames(t testing.TB, pool *pgxpool.Pool) []string {
	t.Helper()
	rows, err := pool.Query(context.Background(), `
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = 'members'
		ORDER BY ordinal_position
	`)
	require.NoError(t, err)
	defer rows.Close()
	var columns []string
	for rows.Next() {
		var column string
		require.NoError(t, rows.Scan(&column))
		columns = append(columns, column)
	}
	require.NoError(t, rows.Err())
	return columns
}

func phase128VisibilityConstraint(t testing.TB, pool *pgxpool.Pool) string {
	t.Helper()
	var definition string
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT pg_get_constraintdef(oid, true)
		FROM pg_constraint
		WHERE conrelid = 'members'::regclass
		  AND conname = 'chk_members_profile_visibility'
	`).Scan(&definition))
	return strings.ToLower(definition)
}

func requirePhase128MigrationFilesOrSkip(t *testing.T) {
	t.Helper()
	for _, name := range []string{phase128UpFile, phase128DownFile} {
		if _, err := os.Stat(phase128MigrationPath(t, name)); err != nil {
			t.Skipf("Phase-128 migration %s is not implemented yet", name)
		}
	}
}

func readPhase128Migration(t testing.TB, name string) string {
	t.Helper()
	content, err := os.ReadFile(phase128MigrationPath(t, name))
	require.NoError(t, err, "read %s", name)
	return normalizePhase128SQL(string(content))
}

func phase128MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}

func normalizePhase128SQL(sql string) string {
	return strings.Join(strings.Fields(strings.ToLower(sql)), " ")
}

func requirePhase128SQLContains(t testing.TB, sql string, fragments ...string) {
	t.Helper()
	for _, fragment := range fragments {
		require.Contains(t, sql, normalizePhase128SQL(fragment), "migration missing contract fragment %q", fragment)
	}
}

func requirePhase128Order(t testing.TB, sql, first, second string) {
	t.Helper()
	firstAt := strings.Index(sql, normalizePhase128SQL(first))
	secondAt := strings.Index(sql, normalizePhase128SQL(second))
	require.GreaterOrEqual(t, firstAt, 0, "missing %q", first)
	require.Greater(t, secondAt, firstAt, "%q must occur before %q", first, second)
}
