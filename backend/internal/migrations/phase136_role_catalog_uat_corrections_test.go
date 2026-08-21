package migrations

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

const (
	phase136UATCorrectionsUpFile   = "0148_role_catalog_uat_corrections.up.sql"
	phase136UATCorrectionsDownFile = "0148_role_catalog_uat_corrections.down.sql"
)

func TestPhase136RoleCatalogUATCorrectionsSourceContract(t *testing.T) {
	for _, name := range []string{phase136UATCorrectionsUpFile, phase136UATCorrectionsDownFile} {
		_, err := os.Stat(phase136MigrationPath(t, name))
		require.NoError(t, err, "migration %s must exist", name)
	}
}

func TestPhase136RoleCatalogUATCorrectionsLiveUpDownUp(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createPhase136Prerequisites(t, pool)
	_, err := pool.Exec(context.Background(), `
		CREATE TABLE contributor_roles (
			id BIGSERIAL PRIMARY KEY,
			name VARCHAR(80) NOT NULL UNIQUE,
			label VARCHAR(100) NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT ''
		);
		INSERT INTO contributor_roles(name, label, description) VALUES
			('typesetter', 'Typesetting / FX', ''),
			('karaoke_fx', 'Vorhandenes Karaoke', 'Vorhandene Beschreibung');
	`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UpFile))

	workRoles := []string{"translator", "editor", "timer", "typesetter", "encoder", "raw_provider", "quality_checker", "designer"}
	allRoles := append(append([]string{}, workRoles...), "admin", "other")
	for index, code := range allRoles {
		contexts := fmt.Sprintf("{sentinel_%d}", index)
		assignable := index%2 == 0
		_, err = pool.Exec(context.Background(), `
			UPDATE role_definitions SET contexts = $2::text[], assignable = $3 WHERE code = $1
		`, code, contexts, assignable)
		require.NoError(t, err)
	}
	before := readPhase136RoleCatalogState(t, pool, allRoles)

	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UATCorrectionsUpFile))
	assertPhase136RoleCatalogUATCorrections(t, pool, workRoles)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UATCorrectionsDownFile))
	require.Equal(t, before, readPhase136RoleCatalogState(t, pool, allRoles))
	assertPhase136KaraokeContributor(t, pool, "Vorhandenes Karaoke", "Vorhandene Beschreibung")
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UATCorrectionsUpFile))
	assertPhase136RoleCatalogUATCorrections(t, pool, workRoles)
}

type phase136RoleCatalogState struct {
	Code       string
	Contexts   string
	Assignable bool
}

func readPhase136RoleCatalogState(t testing.TB, pool *pgxpool.Pool, roles []string) []phase136RoleCatalogState {
	t.Helper()
	rows, err := pool.Query(context.Background(), `
		SELECT code, contexts::text, assignable FROM role_definitions
		WHERE code = ANY($1) ORDER BY code
	`, roles)
	require.NoError(t, err)
	defer rows.Close()
	result := make([]phase136RoleCatalogState, 0, len(roles))
	for rows.Next() {
		var state phase136RoleCatalogState
		require.NoError(t, rows.Scan(&state.Code, &state.Contexts, &state.Assignable))
		result = append(result, state)
	}
	require.NoError(t, rows.Err())
	return result
}

func assertPhase136RoleCatalogUATCorrections(t testing.TB, pool *pgxpool.Pool, workRoles []string) {
	t.Helper()
	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_definitions
		WHERE code = ANY($1) AND assignable AND 'fansub_group' = ANY(contexts)
	`, workRoles).Scan(&count))
	require.Equal(t, len(workRoles), count)
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_definitions
		WHERE code IN ('admin', 'other') AND (assignable OR 'fansub_group' = ANY(contexts))
	`).Scan(&count))
	require.Zero(t, count, "contribution-only roles must stay excluded")
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_capabilities WHERE role_code = ANY($1)
	`, workRoles).Scan(&count))
	require.Zero(t, count, "assignability must not imply operative capabilities")
	assertPhase136KaraokeContributor(t, pool, "Karaoke-FX", "Schreibe kurz, was du bei Karaoke-Effekten, Animationen und visueller Songgestaltung umgesetzt hast.")
}

func assertPhase136KaraokeContributor(t testing.TB, pool *pgxpool.Pool, wantLabel, wantDescription string) {
	t.Helper()
	var label, description string
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT label, description FROM contributor_roles WHERE name = 'karaoke_fx'
	`).Scan(&label, &description))
	require.Equal(t, wantLabel, label)
	require.Equal(t, wantDescription, description)
}
