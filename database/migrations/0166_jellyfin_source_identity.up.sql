-- A selected Jellyfin MediaSource is a physical file, not its enclosing Item.
-- No data backfill: absent/null snapshots remain explicitly unresolved.
-- The runner executes the complete file transactionally. Guards are installed
-- before the old constraint is removed, so no unprotected write window exists.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM stream_sources WHERE provider_type='jellyfin'
  AND metadata->'jellyfin_source' IS NOT NULL AND metadata->'jellyfin_source'<>'null'::jsonb
  AND (jsonb_typeof(metadata->'jellyfin_source') IS DISTINCT FROM 'object'
   OR metadata#>'{jellyfin_source,version}' IS DISTINCT FROM '1'::jsonb
   OR jsonb_typeof(metadata#>'{jellyfin_source,media_source_id}') IS DISTINCT FROM 'string'
   OR NULLIF(BTRIM(metadata#>>'{jellyfin_source,media_source_id}'),'') IS NULL)) THEN
  RAISE EXCEPTION 'Jellyfin source identity migration refuses malformed selected snapshots';
 END IF;
 IF EXISTS (SELECT 1 FROM stream_sources WHERE provider_type='jellyfin'
  AND metadata->'jellyfin_source' IS NOT NULL AND metadata->'jellyfin_source'<>'null'::jsonb
  GROUP BY metadata#>>'{jellyfin_source,media_source_id}' HAVING COUNT(*)>1) THEN
  RAISE EXCEPTION 'Jellyfin source identity migration refuses duplicate selected source IDs';
 END IF;
END $$;
ALTER TABLE stream_sources ADD CONSTRAINT chk_stream_sources_jellyfin_selection CHECK (
 provider_type<>'jellyfin' OR metadata->'jellyfin_source' IS NULL OR metadata->'jellyfin_source'='null'::jsonb OR
 (jsonb_typeof(metadata->'jellyfin_source')='object'
  AND metadata#>'{jellyfin_source,version}' IS NOT DISTINCT FROM '1'::jsonb
  AND jsonb_typeof(metadata#>'{jellyfin_source,media_source_id}') IS NOT DISTINCT FROM 'string'
  AND NULLIF(BTRIM(metadata#>>'{jellyfin_source,media_source_id}'),'') IS NOT NULL)
);
CREATE UNIQUE INDEX uq_stream_sources_unresolved_provider_external
 ON stream_sources(provider_type,external_id) NULLS NOT DISTINCT
 WHERE provider_type<>'jellyfin' OR metadata->'jellyfin_source' IS NULL OR metadata->'jellyfin_source'='null'::jsonb;
CREATE UNIQUE INDEX uq_stream_sources_jellyfin_media_source
 ON stream_sources(provider_type,(metadata#>>'{jellyfin_source,media_source_id}'))
 WHERE provider_type='jellyfin' AND metadata->'jellyfin_source' IS NOT NULL AND metadata->'jellyfin_source'<>'null'::jsonb;
ALTER TABLE stream_sources DROP CONSTRAINT uq_stream_sources_provider_external;
