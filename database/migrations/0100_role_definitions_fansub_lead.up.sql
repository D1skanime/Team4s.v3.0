-- Migration 0100: role_definitions um den App-Gruppenrollen-Code 'fansub_lead' ergänzen.
-- Hintergrund (Phase 74 GAP-3): Die Member-Contributions-Timeline projiziert aktuelle
-- App-Gruppenrollen aus fansub_group_member_roles (Codes aus Migration 0074) und mappt das
-- Label via COALESCE(role_definitions.label_de, role_code). Alle App-Codes außer 'fansub_lead'
-- besitzen bereits einen role_definitions-Eintrag — 'fansub_lead' fiel daher auf den Rohcode
-- zurück. Dieser Seed schließt die Lücke (deutsches Label, konsistent zum Frontend
-- FANSUB_GROUP_ROLE_OPTIONS: 'Fansub-Lead').

INSERT INTO role_definitions (code, label_de, contexts, sort_order) VALUES
    ('fansub_lead', 'Fansub-Lead', ARRAY['group_history'], 0)
ON CONFLICT (code) DO UPDATE SET
    label_de   = EXCLUDED.label_de,
    contexts   = EXCLUDED.contexts,
    sort_order = EXCLUDED.sort_order;
