-- Phase 24: theme_segments um Release-Kontext erweitern.
-- start_episode_id / end_episode_id (FK auf episodes) werden durch plain integers ersetzt.
-- Neue Spalten: fansub_group_id, version, start_episode, end_episode, start_time, end_time, source_jellyfin_item_id.

ALTER TABLE theme_segments
  ADD COLUMN fansub_group_id bigint REFERENCES fansub_groups(id) ON DELETE CASCADE,
  ADD COLUMN version varchar(20) NOT NULL DEFAULT 'v1',
  ADD COLUMN start_episode integer,
  ADD COLUMN end_episode integer,
  ADD COLUMN start_time interval,
  ADD COLUMN end_time interval,
  ADD COLUMN source_jellyfin_item_id text;

-- Alte FK-Spalten entfernen (waren nie produktiv befuellt).
ALTER TABLE theme_segments
  DROP COLUMN IF EXISTS start_episode_id,
  DROP COLUMN IF EXISTS end_episode_id;

-- Constraints fuer Bereichsgueltigkeit.
ALTER TABLE theme_segments
  ADD CONSTRAINT chk_episode_range CHECK (end_episode IS NULL OR start_episode IS NULL OR end_episode >= start_episode),
  ADD CONSTRAINT chk_time_range CHECK (
    end_time IS NULL OR start_time IS NULL OR end_time > start_time
  );

-- Indizes fuer Playback-Query (anime_id, fansub_group_id, version, episode range).
CREATE INDEX idx_theme_segment_group ON theme_segments(fansub_group_id);
CREATE INDEX idx_theme_segment_ep_range ON theme_segments(fansub_group_id, version, start_episode, end_episode);
