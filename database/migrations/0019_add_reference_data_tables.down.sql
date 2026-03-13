-- Phase 5 Package 2: Reference Data Tables - Rollback
-- Drops tables in reverse order of creation (respecting potential dependencies)

DROP TABLE IF EXISTS genres;
DROP TABLE IF EXISTS contributor_roles;
DROP TABLE IF EXISTS persons;
DROP TABLE IF EXISTS studios;
