-- Migration 0055: Backfill canonical fansub_group_links rows from legacy fixed link columns.
-- The generic fansub_group_links table remains the write truth for new product work.

INSERT INTO fansub_group_links (group_id, link_type, name, url)
SELECT id, 'website', NULL, website_url
FROM fansub_groups
WHERE website_url IS NOT NULL
  AND btrim(website_url) <> ''
ON CONFLICT (group_id, link_type, url) DO NOTHING;

INSERT INTO fansub_group_links (group_id, link_type, name, url)
SELECT id, 'discord', NULL, discord_url
FROM fansub_groups
WHERE discord_url IS NOT NULL
  AND btrim(discord_url) <> ''
ON CONFLICT (group_id, link_type, url) DO NOTHING;

INSERT INTO fansub_group_links (group_id, link_type, name, url)
SELECT id, 'irc', NULL, irc_url
FROM fansub_groups
WHERE irc_url IS NOT NULL
  AND btrim(irc_url) <> ''
ON CONFLICT (group_id, link_type, url) DO NOTHING;
