-- Migration 0028 down: Remove seeded media_types
DELETE FROM media_types WHERE name IN (
    'poster',
    'banner',
    'background',
    'logo',
    'preview',
    'screenshot',
    'avatar',
    'thumbnail',
    'karaoke_background',
    'video'
);
