-- Schema Update: Fehlende Spalten fuer Legacy-Migration

-- Anime: Zusaetzliche Titel-Spalten
ALTER TABLE anime ADD COLUMN IF NOT EXISTS title_de VARCHAR(255);
ALTER TABLE anime ADD COLUMN IF NOT EXISTS title_en VARCHAR(255);

-- Episodes: Legacy Stream Links als Text (spaeter zu Array konvertieren)
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS stream_links_legacy TEXT;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS filename VARCHAR(255);

-- Temporaer: Foreign Key Constraints deaktivieren fuer Migration
ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_anime_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_anime_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_reply_to_id_fkey;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_anime_id_fkey;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_user_id_fkey;
ALTER TABLE watchlist DROP CONSTRAINT IF EXISTS watchlist_anime_id_fkey;
ALTER TABLE watchlist DROP CONSTRAINT IF EXISTS watchlist_user_id_fkey;
ALTER TABLE anime_relations DROP CONSTRAINT IF EXISTS anime_relations_anime_id_fkey;
ALTER TABLE anime_relations DROP CONSTRAINT IF EXISTS anime_relations_related_anime_id_fkey;

SELECT 'Schema updated for migration!' AS status;
