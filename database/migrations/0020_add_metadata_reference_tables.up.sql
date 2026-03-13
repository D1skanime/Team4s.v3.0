-- Phase 5 Package 2 Task 2: Metadata Reference Tables Migration
-- Creates reference tables for titles, languages, and relation types
-- Shadow mode: No FK enforcement to existing schema yet

-- Title types - categorizes anime title variants
CREATE TABLE IF NOT EXISTS title_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_title_type_name UNIQUE (name)
);

-- Seed standard title types
INSERT INTO title_types (name) VALUES
    ('main'),
    ('official'),
    ('short'),
    ('synonym'),
    ('romaji'),
    ('japanese')
ON CONFLICT (name) DO NOTHING;

-- Languages - for title translations and metadata
CREATE TABLE IF NOT EXISTS languages (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_language_code UNIQUE (code)
);

-- Seed common languages
INSERT INTO languages (code, name) VALUES
    ('ja', 'Japanese'),
    ('en', 'English'),
    ('de', 'German'),
    ('fr', 'French'),
    ('es', 'Spanish'),
    ('it', 'Italian'),
    ('pt', 'Portuguese'),
    ('zh', 'Chinese'),
    ('ko', 'Korean')
ON CONFLICT (code) DO NOTHING;

-- Relation types - categorizes relationships between anime
CREATE TABLE IF NOT EXISTS relation_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_relation_type_name UNIQUE (name)
);

-- Seed standard relation types
INSERT INTO relation_types (name) VALUES
    ('sequel'),
    ('prequel'),
    ('side-story'),
    ('alternative-version'),
    ('spin-off'),
    ('adaptation'),
    ('summary'),
    ('full-story')
ON CONFLICT (name) DO NOTHING;
