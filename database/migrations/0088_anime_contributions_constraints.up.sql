-- Migration 0088: Cross-Group-Schutz und Duplikat-Schutz fuer anime_contributions.

-- Schritt 1: Hilfs-Unique auf hist_fansub_group_members(fansub_group_id, id),
-- damit der Composite-FK in Schritt 2 auf genau diese Spalten referenzieren kann.
-- Der bestehende UNIQUE(fansub_group_id, member_id) deckt das nicht ab.
ALTER TABLE hist_fansub_group_members
    ADD CONSTRAINT uq_hist_fansub_group_member_group_id
    UNIQUE (fansub_group_id, id);

-- Schritt 2: Composite-FK auf anime_contributions(fansub_group_id, fansub_group_member_id)
-- verhindert auf DB-Ebene, dass ein Mitglied einer anderen Gruppe als Contributor
-- fuer eine Contribution eingetragen wird (Cross-Group-Schutz).
ALTER TABLE anime_contributions
    ADD CONSTRAINT fk_anime_contributions_member_group
    FOREIGN KEY (fansub_group_id, fansub_group_member_id)
    REFERENCES hist_fansub_group_members(fansub_group_id, id)
    ON DELETE RESTRICT;

-- Schritt 3: Unique-Constraint verhindert Duplikate: derselbe Member kann nicht
-- zweimal fuer dasselbe (Gruppe, Anime)-Paar eingetragen werden.
ALTER TABLE anime_contributions
    ADD CONSTRAINT uq_anime_contribution_member
    UNIQUE (fansub_group_id, anime_id, fansub_group_member_id);
