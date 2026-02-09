-- Migration: 006_add_email_verified
-- Zweck: Email-Verifizierung fuer User-Registrierung
-- Neue Spalte email_verified in users Tabelle

-- Add email_verified column with default false
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Add display_name column if not exists (from models)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Index fuer unverified users queries
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Kommentar zur Spalte
COMMENT ON COLUMN users.email_verified IS 'Ob die E-Mail-Adresse des Users verifiziert wurde';
