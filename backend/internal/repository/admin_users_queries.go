package repository

// adminUsersListQuery ist die Page-First-CTE-Aggregat-Query für ListAdminUsersPage.
// Verwendet LATERAL-Joins für alle D-05-Aggregate ohne N+1 (D-07).
//
// Parameter:
//
//	$1 = q (Suchterm für Email/DisplayName, leer = kein Filter)
//	$2 = status-Filter (leer = kein Filter)
//	$3 = global_role-Filter (leer = kein Filter)
//	$4 = has_conflicts (bool)
//	$5 = limit
//	$6 = offset
var adminUsersListQuery = `
WITH filtered AS (
    SELECT au.*
    FROM app_users au
    WHERE
        ($1 = '' OR au.email ILIKE '%' || $1 || '%' OR au.display_name ILIKE '%' || $1 || '%')
        AND ($2 = '' OR au.status = $2)
        AND ($3 = '' OR EXISTS (
            SELECT 1 FROM app_user_global_roles agr
            WHERE agr.app_user_id = au.id AND agr.role = $3
        ))
),
page AS (
    SELECT *, COUNT(*) OVER() AS total_count
    FROM filtered
    ORDER BY COALESCE(last_login_at, updated_at, created_at) DESC, id DESC
    LIMIT $5 OFFSET $6
)
SELECT
    page.total_count,
    page.id,
    page.email,
    page.display_name,
    page.status,
    COALESCE(roles.roles, ARRAY[]::text[]) AS global_roles,
    claimed_m.member_id AS member_profile_id,
    claimed_m.member_name AS member_profile_name,
    COALESCE(memberships.membership_count, 0) AS group_membership_count,
    COALESCE(memberships.leader_count, 0) AS leader_context_count,
    COALESCE(claims.open_claims_count, 0) AS open_claims_count,
    COALESCE(contribs.open_contributions_count, 0) AS open_contributions_count,
    COALESCE(contribs.total_contributions_count, 0) AS total_contributions_count,
    COALESCE(media_up.media_upload_count, 0) AS media_upload_count,
    0 AS release_scope_count,
    COALESCE(conflicts.conflict_count, 0) AS conflict_count,
    TO_CHAR(GREATEST(page.last_login_at, page.updated_at, page.created_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_activity_at
FROM page
LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(role ORDER BY role) AS roles
    FROM app_user_global_roles WHERE app_user_id = page.id
) roles ON true
LEFT JOIN LATERAL (
    SELECT mc.member_id, m.display_name AS member_name
    FROM member_claims mc
    JOIN members m ON m.id = mc.member_id
    WHERE mc.app_user_id = page.id AND mc.claim_status = 'verified'
    ORDER BY mc.id LIMIT 1
) claimed_m ON true
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS membership_count,
        COUNT(*) FILTER (WHERE fgmr.role_code IN ('leader')) AS leader_count
    FROM fansub_group_members fgm
    LEFT JOIN fansub_group_member_roles fgmr ON fgmr.fansub_group_member_id = fgm.id
    WHERE fgm.app_user_id = page.id
) memberships ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE mc.claim_status = 'pending') AS open_claims_count
    FROM member_claims mc WHERE mc.app_user_id = page.id
) claims ON true
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE ac.dispute_state = 'open') AS open_contributions_count,
        COUNT(*) AS total_contributions_count
    FROM anime_contributions ac
    WHERE ac.member_id = claimed_m.member_id
) contribs ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS media_upload_count
    FROM release_version_media rvm
    WHERE rvm.uploaded_by_app_user_id = page.id
) media_up ON true
LEFT JOIN LATERAL (
    SELECT (
        -- D-17: open_claim_with_profile
        (CASE WHEN EXISTS (
            SELECT 1 FROM member_claims mc
            WHERE mc.app_user_id = page.id AND mc.claim_status = 'pending'
            AND claimed_m.member_id IS NOT NULL
        ) THEN 1 ELSE 0 END)
        -- D-17: member_without_role (Mitglied ohne Gruppenrolle)
        + (CASE WHEN EXISTS (
            SELECT 1 FROM fansub_group_members fgm
            LEFT JOIN fansub_group_member_roles fgmr ON fgmr.fansub_group_member_id = fgm.id
            WHERE fgm.app_user_id = page.id AND fgmr.id IS NULL
        ) THEN 1 ELSE 0 END)
        -- D-17: media_without_scope (Medien ohne gültigen Release-Scope)
        + (CASE WHEN EXISTS (
            SELECT 1 FROM release_version_media rvm
            LEFT JOIN release_versions rv ON rv.id = rvm.release_version_id
            WHERE rvm.uploaded_by_app_user_id = page.id AND rv.id IS NULL
        ) THEN 1 ELSE 0 END)
        -- D-17: open_dispute
        + (CASE WHEN claimed_m.member_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM anime_contributions ac
            WHERE ac.member_id = claimed_m.member_id AND ac.dispute_state = 'open'
        ) THEN 1 ELSE 0 END)
        -- D-18: invalid_release_override (Override auf nicht-existente Release-Version)
        + (CASE WHEN claimed_m.member_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM anime_contributions ac
            LEFT JOIN release_versions rv ON rv.id = ac.release_version_id
            WHERE ac.member_id = claimed_m.member_id
              AND ac.release_version_id IS NOT NULL AND rv.id IS NULL
        ) THEN 1 ELSE 0 END)
        -- D-18: override_contradiction (User hat Default aber nicht im Override-Satz)
        + 0
        -- D-18: media_without_contribution_rights
        + 0
    ) AS conflict_count
) conflicts ON true
WHERE ($4 = false OR COALESCE(conflicts.conflict_count, 0) > 0)
`

// adminUsersOverviewQuery lädt die Basis-Daten für den Übersicht-Tab eines Users.
var adminUsersOverviewQuery = `
SELECT
    au.id,
    au.email,
    au.display_name,
    au.status,
    COALESCE(roles.roles, ARRAY[]::text[]) AS global_roles,
    COALESCE(memberships.membership_count, 0),
    COALESCE(memberships.leader_count, 0),
    COALESCE(claims.open_claims_count, 0),
    COALESCE(contribs.open_contributions_count, 0),
    COALESCE(contribs.total_contributions_count, 0),
    COALESCE(media_up.media_upload_count, 0),
    0 AS release_scope_count,
    au.last_login_at,
    au.created_at,
    au.updated_at
FROM app_users au
LEFT JOIN LATERAL (
    SELECT ARRAY_AGG(role ORDER BY role) AS roles
    FROM app_user_global_roles WHERE app_user_id = au.id
) roles ON true
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS membership_count,
        COUNT(*) FILTER (WHERE fgmr.role_code = 'leader') AS leader_count
    FROM fansub_group_members fgm
    LEFT JOIN fansub_group_member_roles fgmr ON fgmr.fansub_group_member_id = fgm.id
    WHERE fgm.app_user_id = au.id
) memberships ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE mc.claim_status = 'pending') AS open_claims_count
    FROM member_claims mc WHERE mc.app_user_id = au.id
) claims ON true
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE ac.dispute_state = 'open') AS open_contributions_count,
        COUNT(*) AS total_contributions_count
    FROM member_claims mc_v
    JOIN anime_contributions ac ON ac.member_id = mc_v.member_id
    WHERE mc_v.app_user_id = au.id AND mc_v.claim_status = 'verified'
) contribs ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS media_upload_count
    FROM release_version_media rvm WHERE rvm.uploaded_by_app_user_id = au.id
) media_up ON true
WHERE au.id = $1
`

// adminUsersConflictDetailsQuery gibt die aufgeschlüsselten Conflict-Details für einen User zurück (D-19).
var adminUsersConflictDetailsQuery = `
SELECT conflict_type, conflict_message FROM (
    -- D-17: offener Claim trotz verifiziertem Profil
    SELECT 'open_claim_with_profile' AS conflict_type,
           'Offener Claim obwohl bereits ein verifiziertes Profil vorhanden ist' AS conflict_message
    WHERE EXISTS (
        SELECT 1 FROM member_claims mc_p
        WHERE mc_p.app_user_id = $1 AND mc_p.claim_status = 'pending'
    ) AND EXISTS (
        SELECT 1 FROM member_claims mc_v
        WHERE mc_v.app_user_id = $1 AND mc_v.claim_status = 'verified'
    )
    UNION ALL
    -- D-17: Gruppenmitglied ohne Rolle
    SELECT 'member_without_role',
           'Gruppenmitglied ohne zugewiesene Gruppenrolle'
    WHERE EXISTS (
        SELECT 1 FROM fansub_group_members fgm
        LEFT JOIN fansub_group_member_roles fgmr ON fgmr.fansub_group_member_id = fgm.id
        WHERE fgm.app_user_id = $1 AND fgmr.id IS NULL
    )
    UNION ALL
    -- D-17: Medien-Upload ohne gültigen Release-Scope
    SELECT 'media_without_scope',
           'Medien-Upload ohne gültigen Release-Version-Scope'
    WHERE EXISTS (
        SELECT 1 FROM release_version_media rvm
        LEFT JOIN release_versions rv ON rv.id = rvm.release_version_id
        WHERE rvm.uploaded_by_app_user_id = $1 AND rv.id IS NULL
    )
    UNION ALL
    -- D-17: offener Contribution-Dispute
    SELECT 'open_dispute',
           'Offener Contribution-Dispute'
    WHERE EXISTS (
        SELECT 1 FROM member_claims mc_v
        JOIN anime_contributions ac ON ac.member_id = mc_v.member_id
        WHERE mc_v.app_user_id = $1 AND mc_v.claim_status = 'verified'
          AND ac.dispute_state = 'open'
    )
    UNION ALL
    -- D-18: Override auf ungültige Release-Version
    SELECT 'invalid_release_override',
           'Release-Version-Override auf nicht mehr existierende Release-Version'
    WHERE EXISTS (
        SELECT 1 FROM member_claims mc_v
        JOIN anime_contributions ac ON ac.member_id = mc_v.member_id
        LEFT JOIN release_versions rv ON rv.id = ac.release_version_id
        WHERE mc_v.app_user_id = $1 AND mc_v.claim_status = 'verified'
          AND ac.release_version_id IS NOT NULL AND rv.id IS NULL
    )
) AS conflicts
`
