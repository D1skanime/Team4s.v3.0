-- Migration 0142: theme_segment_episode_overrides
-- Optionaler Per-Release-Version-Zeit-Override fuer ein zugewiesenes Kara-Segment
-- (D-01, kein Re-Encode -- reiner Timing-Override auf dem bereits existierenden
-- theme_segment_render_cache-Pfad, kein neues theme_segments-Row).

CREATE TABLE IF NOT EXISTS theme_segment_episode_overrides (
    id BIGSERIAL PRIMARY KEY,
    theme_segment_id BIGINT NOT NULL,
    release_version_id BIGINT NOT NULL,
    start_time INTERVAL NOT NULL,
    end_time INTERVAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_theme_segment_episode_override_time_range CHECK (end_time > start_time),
    -- Erzwingt auf DB-Ebene, dass ein Override NUR fuer eine Release-Version
    -- existieren kann, der das Kara tatsaechlich zugewiesen ist (kein
    -- "Override ohne Zuweisung" moeglich).
    CONSTRAINT fk_theme_segment_episode_override_assignment
        FOREIGN KEY (theme_segment_id, release_version_id)
        REFERENCES theme_segment_assignments (theme_segment_id, release_version_id)
        ON DELETE CASCADE,
    -- Hoechstens ein Override pro zugewiesener Folge (UI-SPEC Copywriting
    -- Contract: "Override entfernen? Folge {N} verwendet danach wieder die
    -- Basis-Zeit").
    CONSTRAINT uq_theme_segment_episode_overrides_segment_version
        UNIQUE (theme_segment_id, release_version_id)
);
