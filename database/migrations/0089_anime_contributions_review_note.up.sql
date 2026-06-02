-- Migration 0089: Ergaenzt die review_note-Spalte an anime_contributions.
-- Feld fuer den optionalen Ablehngrund (D-08), den Leader/Admins beim Ablehnen setzen koennen.
-- Getrennt vom bestehenden note-Feld (Member-Kontext, D-02).

ALTER TABLE anime_contributions ADD COLUMN IF NOT EXISTS review_note TEXT NULL;
