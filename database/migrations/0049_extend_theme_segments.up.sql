-- Phase 24: theme_segments um Release-Kontext erweitern.
-- start_episode_id / end_episode_id (FK auf episodes) werden durch plain integers ersetzt.
-- Neue Spalten: fansub_group_id, version, start_episode, end_episode, start_time, end_time, source_jellyfin_item_id.

ALTER TABLE theme_segments
  ADD COLUMN IF NOT EXISTS fansub_group_id bigint REFERENCES fansub_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version varchar(20) NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS start_episode integer,
  ADD COLUMN IF NOT EXISTS end_episode integer,
  ADD COLUMN IF NOT EXISTS start_time interval,
  ADD COLUMN IF NOT EXISTS end_time interval,
  ADD COLUMN IF NOT EXISTS source_jellyfin_item_id text;

-- Alte FK-Spalten entfernen (waren nie produktiv befuellt).
ALTER TABLE theme_segments
  DROP COLUMN IF EXISTS start_episode_id,
  DROP COLUMN IF EXISTS end_episode_id;

-- Constraints fuer Bereichsgueltigkeit.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_episode_range'
      AND conrelid = 'theme_segments'::regclass
  ) THEN
    ALTER TABLE theme_segments
      ADD CONSTRAINT chk_episode_range CHECK (
        end_episode IS NULL OR start_episode IS NULL OR end_episode >= start_episode
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_time_range'
      AND conrelid = 'theme_segments'::regclass
  ) THEN
    ALTER TABLE theme_segments
      ADD CONSTRAINT chk_time_range CHECK (
        end_time IS NULL OR start_time IS NULL OR end_time > start_time
      );
  END IF;
END $$;

-- Indizes fuer Playback-Query (anime_id, fansub_group_id, version, episode range).
CREATE INDEX IF NOT EXISTS idx_theme_segment_group ON theme_segments(fansub_group_id);
CREATE INDEX IF NOT EXISTS idx_theme_segment_ep_range ON theme_segments(fansub_group_id, version, start_episode, end_episode);
