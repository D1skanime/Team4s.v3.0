-- Migration 0055 down: Remove backfilled canonical fansub_group_links rows mirrored from legacy fixed link columns.

DELETE FROM fansub_group_links l
USING fansub_groups g
WHERE l.group_id = g.id
  AND (
    (l.link_type = 'website' AND g.website_url IS NOT NULL AND l.url = g.website_url)
    OR (l.link_type = 'discord' AND g.discord_url IS NOT NULL AND l.url = g.discord_url)
    OR (l.link_type = 'irc' AND g.irc_url IS NOT NULL AND l.url = g.irc_url)
  );
