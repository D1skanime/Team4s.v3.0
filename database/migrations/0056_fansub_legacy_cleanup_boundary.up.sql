-- Migration 0056: Make remaining fansub legacy fields explicit and drop alias-side duplicate wiring.

ALTER TABLE fansub_group_aliases
    DROP COLUMN IF EXISTS group_id;

COMMENT ON COLUMN fansub_groups.closed_year IS
    'Legacy compatibility field. Canonical product truth uses dissolved_year.';

COMMENT ON COLUMN fansub_groups.history_description IS
    'Legacy compatibility field. Canonical product truth uses history.';

COMMENT ON COLUMN fansub_groups.website_url IS
    'Compatibility projection from fansub_group_links (website). Do not use as primary write seam.';

COMMENT ON COLUMN fansub_groups.discord_url IS
    'Compatibility projection from fansub_group_links (discord). Do not use as primary write seam.';

COMMENT ON COLUMN fansub_groups.irc_url IS
    'Compatibility projection from fansub_group_links (irc). Do not use as primary write seam.';
