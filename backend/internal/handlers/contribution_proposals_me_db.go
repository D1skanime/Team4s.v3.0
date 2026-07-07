package handlers

// DB-Implementierungen der ContributionProposalsMeHandler-Interfaces.
// Ausgelagert aus contribution_proposals_me_handler.go fuer das 450-Zeilen-Limit
// (quick-260707-kut: KERN-SQL-FIX ListMembershipsForMember auf UNION beider
// Mitgliedschaftstabellen umgestellt, dadurch waechst die Handler-Datei ueber das Limit).

import (
	"context"
	"errors"

	"team4s.v3/backend/internal/repository"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// dbMemberResolver loest member_claims aus der Datenbank auf.
type dbMemberResolver struct {
	db *pgxpool.Pool
}

func (r *dbMemberResolver) ResolveVerifiedMemberID(ctx context.Context, appUserID int64) (int64, error) {
	var memberID int64
	err := r.db.QueryRow(ctx, `
		SELECT member_id FROM member_claims
		WHERE app_user_id = $1 AND claim_status = 'verified'
		ORDER BY verified_at DESC
		LIMIT 1
	`, appUserID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}

// dbOwnershipChecker prueft Eigentuemer via DB-Joins.
type dbOwnershipChecker struct {
	db *pgxpool.Pool
}

func (c *dbOwnershipChecker) MemberIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error) {
	var memberID int64
	err := c.db.QueryRow(ctx, `
		SELECT member_id FROM hist_fansub_group_members WHERE id = $1
	`, fansubGroupMemberID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}

func (c *dbOwnershipChecker) FansubGroupIDForFansubGroupMember(ctx context.Context, fansubGroupMemberID int64) (int64, error) {
	var fansubGroupID int64
	err := c.db.QueryRow(ctx, `
		SELECT fansub_group_id FROM hist_fansub_group_members WHERE id = $1
	`, fansubGroupMemberID).Scan(&fansubGroupID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return fansubGroupID, nil
}

func (c *dbOwnershipChecker) MemberIDForAnimeContribution(ctx context.Context, contributionID int64) (int64, error) {
	var memberID int64
	err := c.db.QueryRow(ctx, `
		SELECT hfgm.member_id
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		WHERE ac.id = $1
	`, contributionID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}

// dbMembershipsLister fragt die Mitgliedschaften eines Members aus der Datenbank ab.
type dbMembershipsLister struct {
	db *pgxpool.Pool
}

// ListMembershipsForMember liefert die Gruppen eines Members aus BEIDEN
// Mitgliedschaftstabellen (hist_fansub_group_members UNION fansub_group_members),
// analog AnimeContributionsRepository.MemberBelongsToFansub. DISTINCT ON (fansub_group_id)
// dedupliziert pro Gruppe und bevorzugt bei Doppel-Mitgliedschaft die hist-Zeile
// (source_priority=0) mit deren echter fansub_group_member_id; reine App-Mitglieder
// (kein hist-Anker) erscheinen mit fansub_group_member_id=0 — quick-260707-kut.
func (l *dbMembershipsLister) ListMembershipsForMember(ctx context.Context, memberID int64) ([]MembershipEntry, error) {
	rows, err := l.db.Query(ctx, `
		SELECT DISTINCT ON (fansub_group_id) fansub_group_member_id, fansub_group_id, group_name
		FROM (
			SELECT hfgm.id AS fansub_group_member_id, hfgm.fansub_group_id, fg.name AS group_name, 0 AS source_priority
			FROM hist_fansub_group_members hfgm
			JOIN fansub_groups fg ON fg.id = hfgm.fansub_group_id
			WHERE hfgm.member_id = $1
			UNION ALL
			SELECT 0 AS fansub_group_member_id, fgm.fansub_group_id, fg.name AS group_name, 1 AS source_priority
			FROM fansub_group_members fgm
			JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id
			WHERE fgm.member_id = $1
		) combined
		ORDER BY fansub_group_id, source_priority ASC, group_name ASC
	`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]MembershipEntry, 0)
	for rows.Next() {
		var e MembershipEntry
		if err := rows.Scan(&e.FansubGroupMemberID, &e.FansubGroupID, &e.GroupName); err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	return result, rows.Err()
}
