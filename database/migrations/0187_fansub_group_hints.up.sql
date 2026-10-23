-- Migration 0187: fansub_group_hints — Hinweise, die ein Mitglied an eine EIGENE ODER
-- FREMDE Fansub-Gruppe schickt (Korrektur an einem Projekt-Eintrag oder Anfrage auf
-- Mitgliedschaft). Bewusst eine eigenstaendige Tabelle statt einer Erweiterung von
-- anime_contributions: anime_contributions ist ein Faktenregister ueber tatsaechliche
-- Mitwirkung mit zwingendem Composite-FK auf die eigene historische Mitgliedschaft und
-- kennt keinen Fremd-Gruppen- oder Rollen-Wunsch-Anwendungsfall. Inline-CHECK-Constraints
-- statt einer separaten Status-Lookup-Tabelle, analog zur aktuellen Projekt-Konvention
-- (Migration 0180 hat die fruehere anime_contributions_review_status-Lookup-Tabelle
-- bereits wieder entfernt).

CREATE TABLE fansub_group_hints (
    id                          BIGSERIAL PRIMARY KEY,
    sender_app_user_id          BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    target_fansub_group_id      BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE RESTRICT,
    hint_type                   VARCHAR(20) NOT NULL,
    -- related_anime_id ist der fachliche Themen-Bezug eines Korrektur-Hinweises (z. B.
    -- "bei diesem Projekt fehlt eine Rolle oder ist falsch zugeordnet") und bei einer
    -- Mitgliedschaftsanfrage immer NULL, weil dort die Mitgliedschaft selbst das Thema
    -- ist, ohne Projektbezug.
    related_anime_id            BIGINT NULL REFERENCES anime(id) ON DELETE RESTRICT,
    -- Reservierter Spaltenplatz fuer eine spaetere, feinere Release-Versions-Korrektur.
    -- Diese Phase befuellt und exponiert die Spalte bewusst NICHT — das Request-DTO aus
    -- Plan 191-03 hat kein entsprechendes Feld, weil das UI dieser Phase keine
    -- Release-Versions-Auswahl fuer den Hinweis anbietet, nur die Projekt-/Anime-Ebene.
    related_release_version_id  BIGINT NULL REFERENCES release_versions(id) ON DELETE RESTRICT,
    -- requested_role_code ist nur bei Mitgliedschaftsanfragen fachlich sinnvoll: ein
    -- optionaler Rollenwunsch aus dem fansub_group-Rollenkatalog; NULL bedeutet "keine
    -- bestimmte Rolle" (Standardfall).
    requested_role_code         VARCHAR(50) NULL REFERENCES role_definitions(code) ON DELETE RESTRICT,
    note                        TEXT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'open',
    decided_by                  BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    decided_at                  TIMESTAMPTZ NULL,
    decision_note                TEXT NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fansub_group_hints_type
        CHECK (hint_type IN ('correction', 'membership_request')),
    CONSTRAINT chk_fansub_group_hints_status
        CHECK (status IN ('open', 'acknowledged', 'rejected')),
    -- Ein Rollenwunsch existiert ausschliesslich bei Mitgliedschaftsanfragen — ein
    -- Korrektur-Hinweis bezieht sich nie auf eine gewuenschte Gruppenrolle.
    CONSTRAINT chk_fansub_group_hints_role_scope
        CHECK (requested_role_code IS NULL OR hint_type = 'membership_request'),
    -- Ein Korrektur-Hinweis braucht immer ein Projekt als Bezug, eine Mitgliedschaftsanfrage
    -- nie — verhindert halb befuellte Zeilen, bei denen der Hinweistyp nicht zum Inhalt passt.
    CONSTRAINT chk_fansub_group_hints_anime_scope
        CHECK (
            (hint_type = 'correction' AND related_anime_id IS NOT NULL)
            OR (hint_type = 'membership_request' AND related_anime_id IS NULL)
        )
);

-- Spam-Schutz "ein offener Hinweis pro Person+Zielgruppe+Thema": pro Absender, Zielgruppe
-- und Thema (gleiches related_anime_id bei Korrektur-Hinweisen bzw. gleicher Rollenwunsch
-- bei Mitgliedschaftsanfragen) darf nur EIN offener Hinweis existieren. Als
-- Partial-Unique-Index umgesetzt (nur status='open' zaehlt), damit ein bereits
-- entschiedener Hinweis keinen erneuten Hinweis zum gleichen Thema blockiert.
-- related_anime_id (nicht related_release_version_id) ist bewusst der Thema-Schluessel:
-- das UI dieser Phase bietet fuer einen Korrektur-Hinweis keine Release-Versions-Auswahl
-- an, sondern nur die Projekt-/Anime-Auswahl — wuerde man statt dessen die unbenutzte
-- related_release_version_id-Spalte als Schluessel verwenden, wuerden alle
-- Korrektur-Hinweise an dieselbe Gruppe unabhaengig vom Projekt kollidieren.
-- COALESCE statt eines einfachen UNIQUE-Constraints: Postgres behandelt zwei NULL-Werte
-- unter UNIQUE als verschieden, was bei Mitgliedschaftsanfragen ohne Rollenwunsch
-- (requested_role_code IS NULL, der Standardfall) beliebig viele Duplikate durchliesse.
CREATE UNIQUE INDEX uq_fansub_group_hints_open_topic
    ON fansub_group_hints (
        sender_app_user_id,
        target_fansub_group_id,
        hint_type,
        COALESCE(related_anime_id, -1),
        COALESCE(requested_role_code, '')
    )
    WHERE status = 'open';

-- Leader-Review-Liste: alle Hinweise an eine bestimmte Zielgruppe, nach Status filterbar.
CREATE INDEX idx_fansub_group_hints_target_group_status
    ON fansub_group_hints (target_fansub_group_id, status);

-- Plattform-Admin-Review-Liste: nur Mitgliedschaftsanfragen mit explizitem Rollenwunsch
-- 'fansub_lead' — jede andere Kombination (inkl. "keine bestimmte Rolle") entscheidet der
-- Leader der Zielgruppe, nicht der Plattform-Admin.
CREATE INDEX idx_fansub_group_hints_role_status
    ON fansub_group_hints (requested_role_code, status)
    WHERE requested_role_code = 'fansub_lead';
