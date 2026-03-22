-- Migration 0029 down: Remove cover media type
DELETE FROM media_types WHERE name = 'cover';
