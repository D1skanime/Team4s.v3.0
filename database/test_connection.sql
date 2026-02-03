-- Test-Queries fuer die Datenbank

-- Alle Tabellen anzeigen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Anzahl Eintraege pro Tabelle
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'anime', COUNT(*) FROM anime
UNION ALL SELECT 'episodes', COUNT(*) FROM episodes
UNION ALL SELECT 'comments', COUNT(*) FROM comments
UNION ALL SELECT 'ratings', COUNT(*) FROM ratings
UNION ALL SELECT 'watchlist', COUNT(*) FROM watchlist;

-- Test-User anzeigen
SELECT id, username, email, is_active, created_at FROM users;

-- Test-Anime anzeigen
SELECT id, title, type, status, year, max_episodes FROM anime;

-- Test-Episoden anzeigen
SELECT e.id, a.title as anime, e.episode_number, e.title, e.status
FROM episodes e
JOIN anime a ON e.anime_id = a.id
ORDER BY a.title, e.episode_number;

-- Rollen anzeigen
SELECT id, name, description FROM roles ORDER BY id;

-- User-Rollen anzeigen
SELECT u.username, r.name as role
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id;
