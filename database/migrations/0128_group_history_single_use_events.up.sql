CREATE UNIQUE INDEX IF NOT EXISTS uq_fansub_group_history_single_use_event
ON fansub_group_history (fansub_group_id, event_type)
WHERE event_type IN (
    'founding',
    'disbanding',
    'first_project',
    'first_release',
    'project_completed',
    'collaboration',
    'projects_10',
    'projects_50',
    'projects_100',
    'projects_500',
    'releases_100',
    'releases_500',
    'releases_1000',
    'releases_5000',
    'releases_10000'
);
