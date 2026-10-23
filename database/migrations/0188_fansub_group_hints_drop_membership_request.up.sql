-- Migration 0188 (D-09, Live-UAT-Nachbesserung Phase 191): "Anfrage fuer Mitgliedschaft" wird
-- ersatzlos gestrichen. "Hinweis senden" ist ohnehin nur erreichbar fuer Mitglieder mit
-- Mitgliedsprofil UND Projekt-Zuordnung (isEligibleForContributions,
-- frontend/src/app/me/contributions/page.tsx) -- "ich war frueher dabei" laeuft bereits ueber den
-- bestehenden Mitglieds-Claim-Weg (member_claims, Migration 0081/Phase 81/135), ein zweiter,
-- paralleler Antragsweg waere Doppelbau. fansub_group_hints war zum Zeitpunkt dieser Migration
-- leer (geprueft vor der Entscheidung) -- keine Daten-Rueckmigration notwendig.

ALTER TABLE fansub_group_hints DROP CONSTRAINT chk_fansub_group_hints_type;
ALTER TABLE fansub_group_hints DROP CONSTRAINT chk_fansub_group_hints_role_scope;
ALTER TABLE fansub_group_hints DROP CONSTRAINT chk_fansub_group_hints_anime_scope;

DROP INDEX idx_fansub_group_hints_role_status;

-- Jeder verbleibende Hinweis ist jetzt strukturell ein Korrektur-Hinweis mit Projektbezug.
ALTER TABLE fansub_group_hints ALTER COLUMN related_anime_id SET NOT NULL;

-- Kein vorangestelltes "DROP INDEX uq_fansub_group_hints_open_topic": der Index referenziert
-- hint_type und requested_role_code direkt in seiner Spaltenliste, Postgres entfernt ihn
-- deshalb bereits automatisch (CASCADE) als Nebenwirkung der beiden folgenden DROP-COLUMN-
-- Anweisungen. Ein zusaetzliches explizites DROP INDEX danach wuerde mit "does not exist"
-- fehlschlagen, weil der Index zu diesem Zeitpunkt schon weg ist.
ALTER TABLE fansub_group_hints DROP COLUMN hint_type;
ALTER TABLE fansub_group_hints DROP COLUMN requested_role_code;

-- Index verkuerzt sich entsprechend -- COALESCE bleibt aus Vorsicht erhalten, falls
-- related_anime_id in einer spaeteren Phase wieder nullable werden sollte.
CREATE UNIQUE INDEX uq_fansub_group_hints_open_topic
    ON fansub_group_hints (
        sender_app_user_id,
        target_fansub_group_id,
        COALESCE(related_anime_id, -1)
    )
    WHERE status = 'open';
