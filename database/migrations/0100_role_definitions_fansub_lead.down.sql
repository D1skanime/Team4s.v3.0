-- Rollback Migration 0100: 'fansub_lead'-Eintrag aus role_definitions entfernen.
-- Sicher nur, wenn keine FK-Referenz darauf zeigt (fansub_group_member_roles besitzt
-- keinen FK auf role_definitions; hist_group_member_roles referenziert andere Codes).
DELETE FROM role_definitions WHERE code = 'fansub_lead';
