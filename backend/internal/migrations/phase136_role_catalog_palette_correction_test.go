package migrations

import (
    "context"
    "os"
    "strings"
    "testing"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/stretchr/testify/require"
    "team4s.v3/backend/internal/testsupport"
)

const (
    phase136PaletteUpFile = "0149_role_catalog_palette_correction.up.sql"
    phase136PaletteDownFile = "0149_role_catalog_palette_correction.down.sql"
)

var phase136Palette = map[string]string{
    "fansub_lead": "#183B7C", "founder": "#8C4A16", "co_leader": "#0F766E",
    "techadmin": "#475569", "gfxler": "#7E22CE", "project_lead": "#0369A1",
    "translator": "#27664F", "editor": "#6D3F83", "timer": "#C26A2E",
    "typesetter": "#7B3C4E", "karaoke_fx": "#A16207", "encoder": "#506B91",
    "raw_provider": "#A04444", "quality_checker": "#6B7F2A", "designer": "#B23A78",
}

func TestPhase136RoleCatalogPaletteCorrectionSourceContract(t *testing.T) {
    for _, name := range []string{phase136PaletteUpFile, phase136PaletteDownFile} {
        body, err := os.ReadFile(phase136MigrationPath(t, name))
        require.NoError(t, err)
        sql := strings.ToLower(string(body))
        require.NotContains(t, sql, "update contributor_roles")
        for code, color := range phase136Palette {
            require.Contains(t, sql, strings.ToLower("'"+code+"'"))
            require.Contains(t, sql, strings.ToLower("'"+color+"'"))
        }
    }
}

func TestPhase136RoleCatalogPaletteCorrectionLiveUpDownUp(t *testing.T) {
    pool := testsupport.OpenPhase106Postgres(t)
    createPhase136Prerequisites(t, pool)
    _, err := pool.Exec(context.Background(), `
        CREATE TABLE contributor_roles (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(80) NOT NULL UNIQUE,
            label VARCHAR(100) NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT ''
        );
        INSERT INTO contributor_roles(name, label) VALUES ('typesetter', 'STALE SENTINEL');
    `)
    require.NoError(t, err)
    testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UpFile))
    testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136ArtworkCorrectionUpFile))
    testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136UATCorrectionsUpFile))

    before := snapshotPhase136Authorization(t, pool)
    testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136PaletteUpFile))
    assertPhase136Palette(t, pool, true, before)
    testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136PaletteDownFile))
    assertPhase136Palette(t, pool, false, before)
    testsupport.ApplySQLFile(t, pool, phase136MigrationPath(t, phase136PaletteUpFile))
    assertPhase136Palette(t, pool, true, before)
}

type phase136AuthorizationSnapshot struct{ definitions, capabilities string }

func snapshotPhase136Authorization(t testing.TB, pool *pgxpool.Pool) phase136AuthorizationSnapshot {
    t.Helper()
    var out phase136AuthorizationSnapshot
    require.NoError(t, pool.QueryRow(context.Background(), `SELECT COALESCE(string_agg(code || ':' || contexts::text || ':' || assignable::text, ',' ORDER BY code), '') FROM role_definitions`).Scan(&out.definitions))
    require.NoError(t, pool.QueryRow(context.Background(), `SELECT COALESCE(string_agg(role_code || ':' || action_code, ',' ORDER BY role_code, action_code), '') FROM role_capabilities`).Scan(&out.capabilities))
    return out
}

func assertPhase136Palette(t testing.TB, pool *pgxpool.Pool, applied bool, auth phase136AuthorizationSnapshot) {
    t.Helper()
    var stale string
    require.NoError(t, pool.QueryRow(context.Background(), `SELECT label FROM contributor_roles WHERE name='typesetter'`).Scan(&stale))
    require.Equal(t, "STALE SENTINEL", stale)
    for code, wanted := range phase136Palette {
        var label, color string
        require.NoError(t, pool.QueryRow(context.Background(), `SELECT label_de, color_key FROM role_definitions WHERE code=$1`, code).Scan(&label, &color))
        if applied {
            require.Equal(t, wanted, color, code)
            if code == "typesetter" { require.Equal(t, "Typesetting", label) }
        } else {
            if code == "karaoke_fx" { require.Equal(t, "creative", color) } else { require.Equal(t, "other", color) }
            if code == "typesetter" { require.Equal(t, "Typesetting / FX", label) }
        }
    }
    require.Equal(t, auth, snapshotPhase136Authorization(t, pool))
}
