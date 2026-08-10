package repository

// Zentrale Public-Visibility-Praedikate fuer die oeffentliche Projekt-Member-Seite (Phase 122, D-09).
//
// Alle vier Collections (Rollen/Summary, Notes, Media, Releases) nutzen exakt dieselben
// Sichtbarkeitsregeln, damit die Summary-Counts garantiert mit den tatsaechlich gelieferten Zeilen
// uebereinstimmen (Brief 23: versteckte Inhalte duerfen auch nicht ueber Counts durchsickern).
//
// Die Praedikate sind reine, parameterfreie SQL-Fragmente ueber festen Tabellen-Aliassen. Sie werden
// per String-Konkatenation in die Queries eingesetzt; es fliesst NIE Nutzereingabe in diese Konstanten.
const (
	// projectMemberPublicNotePredicate filtert release_version_notes (Alias rvn) auf oeffentlich.
	projectMemberPublicNotePredicate = `rvn.visibility = 'public' AND rvn.status = 'published' AND rvn.deleted_at IS NULL`

	// projectMemberPublicMediaPredicate filtert release_version_media (rvm) + media_assets (ma) +
	// visibilities (v) + review_statuses (rs) auf oeffentlich. Identisch zum kanonischen Public-Media-Gate
	// aus release_detail_public/group_release_media (v.name='public', rs.code='approved', ma.status='ready').
	// Erfordert INNER JOINs auf ma/v/rs (keine NULL-Fallbacks) — nicht-freigegebene Medien fallen heraus.
	projectMemberPublicMediaPredicate = `rvm.deleted_at IS NULL AND ma.status = 'ready' AND v.name = 'public' AND rs.code = 'approved'`

	// projectMemberPublicContributionPredicate filtert anime_contributions (ac) auf oeffentliche
	// Projektrollen (release_version_id IS NULL), analog group_contributors_repository.go.
	projectMemberPublicContributionPredicate = `ac.is_public_on_anime_page = true AND COALESCE(v.name, 'public') = 'public' AND (ac.fansub_group_member_id IS NULL OR hfgm.visibility = 'public') AND ac.release_version_id IS NULL`

	// projectMemberUserIDsCTE loest die Legacy-users.id-Werte auf, die zu einem Member gehoeren (D-06):
	// members.user_id (Legacy) plus verifizierte member_claims -> app_users.legacy_user_id. $1 = memberID.
	// Medien ohne eindeutig aufloesbaren Member fallen ueber das INNER-Filter (uploaded_by_user_id IN ...)
	// automatisch heraus und werden weder gezeigt noch gezaehlt.
	projectMemberUserIDsCTE = `member_users AS (
		SELECT m.user_id AS uid FROM members m WHERE m.id = $1 AND m.user_id IS NOT NULL
		UNION
		SELECT au.legacy_user_id AS uid
		FROM member_claims mc
		JOIN app_users au ON au.id = mc.app_user_id
		WHERE mc.member_id = $1 AND mc.claim_status = 'verified' AND au.legacy_user_id IS NOT NULL
	)`
)
