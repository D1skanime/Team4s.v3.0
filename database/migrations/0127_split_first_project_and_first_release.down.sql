-- Migration 0127 rollback: merge first_project back into first_release.

ALTER TABLE fansub_group_history
    DROP CONSTRAINT IF EXISTS chk_fansub_group_history_event_type;

UPDATE fansub_group_history
SET event_type = 'first_release'
WHERE event_type = 'first_project';

ALTER TABLE fansub_group_history
    ADD CONSTRAINT chk_fansub_group_history_event_type
    CHECK (event_type IN (
        'founding',
        'disbanding',
        'hiatus',
        'rebranding',
        'milestone',
        'other',
        'first_release',
        'anniversary',
        'collaboration',
        'revival',
        'project_completed',
        'team_change',
        'website_launch',
        'award',
        'projects_10',
        'projects_50',
        'projects_100',
        'projects_500',
        'releases_100',
        'releases_500',
        'releases_1000',
        'releases_5000',
        'releases_10000'
    ));
