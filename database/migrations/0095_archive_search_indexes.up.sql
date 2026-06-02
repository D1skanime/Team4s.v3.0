-- Index für Archiv-Suche: members.profile_visibility Filter
CREATE INDEX IF NOT EXISTS idx_members_profile_visibility
    ON members (profile_visibility);

-- Index für verified-Badge-Subquery in der Archiv-Suche
CREATE INDEX IF NOT EXISTS idx_member_claims_member_claim_status
    ON member_claims (member_id, claim_status);
