DROP INDEX IF EXISTS idx_theme_segment_ep_range;
DROP INDEX IF EXISTS idx_theme_segment_group;

ALTER TABLE theme_segments
  DROP CONSTRAINT IF EXISTS chk_time_range,
  DROP CONSTRAINT IF EXISTS chk_episode_range;

ALTER TABLE theme_segments
  ADD COLUMN IF NOT EXISTS start_episode_id bigint REFERENCES episodes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS end_episode_id bigint REFERENCES episodes(id) ON DELETE SET NULL;

ALTER TABLE theme_segments
  DROP COLUMN IF EXISTS source_jellyfin_item_id,
  DROP COLUMN IF EXISTS end_time,
  DROP COLUMN IF EXISTS start_time,
  DROP COLUMN IF EXISTS end_episode,
  DROP COLUMN IF EXISTS start_episode,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS fansub_group_id;
