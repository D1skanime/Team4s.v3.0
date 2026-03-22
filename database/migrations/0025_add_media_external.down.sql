-- Migration 0025 down: Remove media_external table
DROP TABLE IF EXISTS media_external CASCADE;
