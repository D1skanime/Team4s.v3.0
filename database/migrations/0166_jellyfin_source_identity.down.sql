-- Refuse rollback while sibling sources share an Item; never merge/delete rows.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM stream_sources GROUP BY provider_type,external_id HAVING COUNT(*)>1) THEN
  RAISE EXCEPTION 'Jellyfin source identity rollback refuses provider/item collisions';
 END IF;
END $$;
ALTER TABLE stream_sources ADD CONSTRAINT uq_stream_sources_provider_external
 UNIQUE NULLS NOT DISTINCT(provider_type,external_id);
DROP INDEX uq_stream_sources_jellyfin_media_source;
DROP INDEX uq_stream_sources_unresolved_provider_external;
ALTER TABLE stream_sources DROP CONSTRAINT chk_stream_sources_jellyfin_selection;
