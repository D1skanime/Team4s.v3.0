package migrations

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

const (
	phase136UATCorrectionsUpFile = "0148_role_catalog_uat_corrections.up.sql"
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
		INSERT INTO contributor_roles(name, label) VALUES ('typesetter', 'Typesetting / FX');
	`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UpFile))
	assertPhase136RoleCatalogUATCorrections(t, pool, true)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UATCorrectionsUpFile))
	assertPhase136RoleCatalogUATCorrections(t, pool, false)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UATCorrectionsDownFile))
	assertPhase136RoleCatalogUATCorrections(t, pool, true)
	testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UATCorrectionsUpFile))
	assertPhase136RoleCatalogUATCorrections(t, pool, false)
}

func assertPhase136RoleCatalogUATCorrections(t testing.TB, pool *pgxpool.Pool, rolledBack bool) {
	t.Helper()
	workRoles := []string{"translator", "editor", "timer", "typesetter", "encoder", "raw_provider", "quality_checker", "designer"}
	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_definitions
		WHERE code = ANY($1) AND assignable AND 'fansub_group' = ANY(contexts)
	`, workRoles).Scan(&count))
	if rolledBack { require.Zero(t, count) } else { require.Equal(t, len(workRoles), count) }
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_definitions
		WHERE code IN ('admin', 'other') AND (assignable OR 'fansub_group' = ANY(contexts))
	`).Scan(&count))
	require.Zero(t, count, "contribution-only roles must stay excluded")
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM role_capabilities WHERE role_code = ANY($1)
	`, workRoles).Scan(&count))
	require.Zero(t, count, "assignability must not imply operative capabilities")
	require.NoError(t, pool.QueryRow(context.Background(), `
		SELECT count(*) FROM contributor_roles WHERE name = 'karaoke_fx'
	`).Scan(&count))
	if rolledBack { require.Zero(t, count) } else { require.Equal(t, 1, count) }
}
