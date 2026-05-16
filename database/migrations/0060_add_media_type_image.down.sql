-- Migration 0060 down: Remove the generic image media type

DELETE FROM media_types WHERE name = 'image';
