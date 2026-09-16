-- Rollback 0168: entfernt nur die neuen Sprachnamen-Tabellen.
-- tags/genres/anime_tags/anime_genres bleiben unverändert.
DROP TABLE IF EXISTS tag_names;
DROP TABLE IF EXISTS genre_names;
