package migrations

import (
	"strings"
	"testing"
)

// TestPhase81CollaborationExpansionMigrationContract sichert den Inhalt von
// Migration 0101 ab: Backfill release_version_groups aus Kollaborations-Junctions,
// DO $$-Guard für soft-delete, ON CONFLICT DO NOTHING für Idempotenz (P81-SC7).
func TestPhase81CollaborationExpansionMigrationContract(t *testing.T) {
	up := strings.ToLower(readMigrationFile(t, "0101_expand_release_version_groups_from_collaborations.up.sql"))

	assertContainsAll(t, up, []string{
		"insert into release_version_groups",
		"on conflict (release_version_id, fansub_group_id) do nothing",
		"insert into anime_fansub_groups",
		"delete from release_version_groups",
		"status = 'dissolved'",
		"has_restrict_refs",
	})
}

// TestPhase81CollaborationSchemaDropMigrationContract sichert den Inhalt von
// Migration 0102 ab: DO $$-Guard mit RAISE EXCEPTION, DROP TABLE, DROP COLUMN (P81-SC7).
// Down muss ADD COLUMN + CREATE TABLE enthalten (reversibles Schema-Skelett).
func TestPhase81CollaborationSchemaDropMigrationContract(t *testing.T) {
	up := strings.ToLower(readMigrationFile(t, "0102_drop_collaboration_schema.up.sql"))

	assertContainsAll(t, up, []string{
		"active_collabs",
		"raise exception",
		"drop table if exists fansub_collaboration_members",
		"drop column if exists group_type",
	})

	down := strings.ToLower(readMigrationFile(t, "0102_drop_collaboration_schema.down.sql"))

	assertContainsAll(t, down, []string{
		"add column if not exists group_type",
		"create table if not exists fansub_collaboration_members",
	})
}
