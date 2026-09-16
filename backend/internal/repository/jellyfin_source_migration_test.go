package repository

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

func jellyfinMigration(t *testing.T, pool *pgxpool.Pool, direction string) error {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", "..", "database", "migrations", "0166_jellyfin_source_identity."+direction+".sql"))
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), string(data))
	return err
}
func TestJellyfinSourceMigrationUpDownAndGuards(t *testing.T) {
	pool := openJellyfinSourceFixture(t)
	ctx := context.Background()
	require.NoError(t, jellyfinMigration(t, pool, "down"))
	require.NoError(t, jellyfinMigration(t, pool, "up"))
	raw, err := json.Marshal(sourceFixtureSnapshot("a", "/anime/a", true))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO stream_sources(provider_type,external_id,metadata) VALUES('jellyfin','item',jsonb_build_object('jellyfin_source',$1::jsonb))`, raw)
	require.NoError(t, err)
	raw, err = json.Marshal(sourceFixtureSnapshot("b", "/anime/b", true))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO stream_sources(provider_type,external_id,metadata) VALUES('jellyfin','item',jsonb_build_object('jellyfin_source',$1::jsonb))`, raw)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO stream_sources(provider_type,external_id,metadata) VALUES('jellyfin','alias',jsonb_build_object('jellyfin_source',$1::jsonb))`, raw)
	require.Error(t, err, "physical aliases must violate selected unique index")
	require.ErrorContains(t, jellyfinMigration(t, pool, "down"), "refuses provider/item collisions")
	var indexes int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM pg_indexes WHERE schemaname=current_schema() AND indexname IN ('uq_stream_sources_jellyfin_media_source','uq_stream_sources_unresolved_provider_external')`).Scan(&indexes))
	require.Equal(t, 2, indexes)
	// Non-Jellyfin and unresolved NULL external IDs keep NULLS NOT DISTINCT.
	for _, provider := range []string{"direct", "jellyfin"} {
		_, err = pool.Exec(ctx, `INSERT INTO stream_sources(provider_type,external_id,url) VALUES($1,NULL,'https://fixture.invalid')`, provider)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO stream_sources(provider_type,external_id,url) VALUES($1,NULL,'https://fixture.invalid/duplicate')`, provider)
		require.Error(t, err)
	}
	for _, metadata := range []string{`{"jellyfin_source":{}}`, `{"jellyfin_source":{"version":1,"media_source_id":" "}}`, `{"jellyfin_source":{"version":2,"media_source_id":"x"}}`, `{"jellyfin_source":"malformed"}`} {
		_, err = pool.Exec(ctx, `INSERT INTO stream_sources(provider_type,external_id,metadata) VALUES('jellyfin','invalid',$1::jsonb)`, metadata)
		require.Error(t, err)
	}
}
func TestJellyfinSourceMigrationRefusesExistingInvalidRowsAtomically(t *testing.T) {
	for _, scenario := range []string{"duplicate sources", "blank source", "malformed snapshot"} {
		t.Run(scenario, func(t *testing.T) {
			pool := openJellyfinSourceFixture(t)
			ctx := context.Background()
			require.NoError(t, jellyfinMigration(t, pool, "down"))
			raw := `{"jellyfin_source":{"version":1,"media_source_id":"same"}}`
			if scenario == "blank source" {
				raw = `{"jellyfin_source":{"version":1,"media_source_id":""}}`
			}
			if scenario == "malformed snapshot" {
				raw = `{"jellyfin_source":[]}`
			}
			_, err := pool.Exec(ctx, `INSERT INTO stream_sources(provider_type,external_id,metadata) VALUES('jellyfin','one',$1::jsonb)`, raw)
			require.NoError(t, err)
			if scenario == "duplicate sources" {
				_, err = pool.Exec(ctx, `INSERT INTO stream_sources(provider_type,external_id,metadata) VALUES('jellyfin','two',$1::jsonb)`, raw)
				require.NoError(t, err)
			}
			require.Error(t, jellyfinMigration(t, pool, "up"))
			var count int
			require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM pg_constraint WHERE conrelid='stream_sources'::regclass AND conname='uq_stream_sources_provider_external'`).Scan(&count))
			require.Equal(t, 1, count, "previous protection survives failed migration")
		})
	}
}
