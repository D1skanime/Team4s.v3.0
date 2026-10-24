-- Migration 0189 (D-32, vierter Live-UAT-Durchlauf Phase 191): der Doppel-Hinweis-Schutz auf
-- fansub_group_hints wird auf Release-Ebene verfeinert. Bisher key(t)e der Partial-Unique-Index
-- nur auf (sender, Zielgruppe, Projekt) -- ein zweiter, berechtigter Korrektur-Hinweis zu einem
-- ANDEREN Release desselben Projekts wurde dadurch faelschlich als Duplikat blockiert, obwohl
-- fachlich zwei unabhaengige Themen vorliegen. Der Index bezieht ab jetzt zusaetzlich
-- related_release_version_id mit ein: zwei offene Hinweise zu unterschiedlichen Releases
-- desselben Projekts koennen nun nebeneinander bestehen; zwei Hinweise zum selben Release, oder
-- zweimal "ganzes Projekt" (related_release_version_id = NULL), bleiben weiterhin ein Konflikt
-- (D-32, sekundaer referenziert).

DROP INDEX uq_fansub_group_hints_open_topic;

CREATE UNIQUE INDEX uq_fansub_group_hints_open_topic
    ON fansub_group_hints (
        sender_app_user_id,
        target_fansub_group_id,
        related_anime_id,
        COALESCE(related_release_version_id, -1)
    )
    WHERE status = 'open';
