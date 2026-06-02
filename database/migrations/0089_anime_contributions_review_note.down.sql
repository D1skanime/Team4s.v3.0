-- Migration 0089 down: Entfernt die in 0089 angelegte review_note-Spalte.

ALTER TABLE anime_contributions DROP COLUMN IF EXISTS review_note;
