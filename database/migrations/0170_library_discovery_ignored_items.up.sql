-- Migration 0170: Phase 165 (Library Discovery) — "ignorieren"-Zustand für
-- Jellyfin-Bibliothekseinträge (D-17). Additiv/schema-only: keine bestehende
-- Tabelle wird verändert, keine bestehenden Daten werden angefasst.
--
-- server_key trägt bereits jetzt eine feste DB-Default-Spalte für eine
-- künftige Mehrserver-Phase (D-22). Diese Phase bleibt auf einem Server;
-- die Repository-Schicht hart-codiert 'default' und verzweigt nicht auf
-- diese Spalte.
CREATE TABLE library_discovery_ignored_items (
    id BIGSERIAL PRIMARY KEY,
    server_key TEXT NOT NULL DEFAULT 'default',
    jellyfin_item_id TEXT NOT NULL,
    ignored_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    ignored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_library_discovery_ignored_item
    ON library_discovery_ignored_items (server_key, jellyfin_item_id);

COMMENT ON TABLE library_discovery_ignored_items IS 'Phase 165 D-17: reversibler "ignorieren"-Zustand für Jellyfin-Bibliothekseinträge auf der Discovery-Seite.';
COMMENT ON COLUMN library_discovery_ignored_items.server_key IS 'Phase 165 D-22: feste Default-Provision für eine künftige Mehrserver-Phase; diese Phase liest/schreibt ausschließlich ''default''.';
