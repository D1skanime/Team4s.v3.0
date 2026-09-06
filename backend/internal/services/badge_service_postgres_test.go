package services

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/badges"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// Plan 150-02 Task 3 (D-04, D-20): real-Postgres proofs for computeMembershipMilestone,
// computeLongTermMember, and computeProductiveTiers, replacing the removed
// source-substring number-fragment assertions with actual calls against a real database
// and real member_badges reads -- exactly the CLAUDE.md Teststil this phase's D-20
// requires (httptest/fake-repo/real-DB call, never os.ReadFile+strings.Contains for
// behavior proofs).

func badgeCodesOf(rows []repository.MemberBadgeRow) map[string]bool {
	codes := make(map[string]bool, len(rows))
	for _, row := range rows {
		codes[row.BadgeCode] = true
	}
	return codes
}

func newPhase150BadgeService(t *testing.T) (*BadgeService, *repository.BadgeRepository) {
	t.Helper()
	pool := testsupport.OpenPhase150Postgres(t)
	badgeRepo := repository.NewBadgeRepository(pool)
	return NewBadgeService(pool, badgeRepo), badgeRepo
}

// TestComputeMembershipMilestonePostgresBoundaries beweist, dass computeMembershipMilestone
// membership_7_years/membership_10_years exakt bei den aus der Registry
// (badges.Membership7Years/Membership10Years) kommenden Jahreszahlen vergibt -- nicht mehr
// bei Go-Int-Literalen.
func TestComputeMembershipMilestonePostgresBoundaries(t *testing.T) {
	svc, badgeRepo := newPhase150BadgeService(t)
	ctx := context.Background()

	_, err := svc.db.Exec(ctx, `INSERT INTO members (id) VALUES (1), (2)`)
	require.NoError(t, err)

	// Member 1: still active, joined exactly 7 years ago -> membership_7_years, but not 10.
	_, err = svc.db.Exec(ctx, `
		INSERT INTO hist_fansub_group_members (member_id, joined_date, left_date)
		VALUES (1, CURRENT_DATE - INTERVAL '7 years', NULL)
	`)
	require.NoError(t, err)

	// Member 2: already left, tenure of exactly 10 years -> both membership_7_years and
	// membership_10_years.
	_, err = svc.db.Exec(ctx, `
		INSERT INTO hist_fansub_group_members (member_id, joined_date, left_date)
		VALUES (2, DATE '2010-01-01', DATE '2020-01-01')
	`)
	require.NoError(t, err)

	svc.computeMembershipMilestone(ctx, 1, "membership_7_years", int(badges.Membership7Years))
	svc.computeMembershipMilestone(ctx, 1, "membership_10_years", int(badges.Membership10Years))
	svc.computeMembershipMilestone(ctx, 2, "membership_7_years", int(badges.Membership7Years))
	svc.computeMembershipMilestone(ctx, 2, "membership_10_years", int(badges.Membership10Years))

	rows1, err := badgeRepo.GetMemberBadges(ctx, 1)
	require.NoError(t, err)
	codes1 := badgeCodesOf(rows1)
	require.True(t, codes1["membership_7_years"], "7 Jahre Mitgliedschaft muessen membership_7_years vergeben")
	require.False(t, codes1["membership_10_years"], "7 Jahre reichen nicht fuer membership_10_years")

	rows2, err := badgeRepo.GetMemberBadges(ctx, 2)
	require.NoError(t, err)
	codes2 := badgeCodesOf(rows2)
	require.True(t, codes2["membership_7_years"], "10 Jahre Mitgliedschaft muessen auch membership_7_years vergeben")
	require.True(t, codes2["membership_10_years"], "10 Jahre Mitgliedschaft muessen membership_10_years vergeben")
}

// TestComputeLongTermMemberPostgresBoundaries beweist D-04: die 5-Jahres-Schwelle ist ein
// gebundener make_interval-Parameter (badges.MembershipLongTermYears), keine literale SQL
// INTERVAL '5 years'-Zeichenkette mehr -- Semantik "vor genau N Jahren" bleibt exakt
// erhalten, sowohl fuer bereits ausgeschiedene als auch fuer noch aktive Mitgliedschaften.
func TestComputeLongTermMemberPostgresBoundaries(t *testing.T) {
	svc, badgeRepo := newPhase150BadgeService(t)
	ctx := context.Background()

	_, err := svc.db.Exec(ctx, `INSERT INTO members (id) VALUES (1), (2), (3)`)
	require.NoError(t, err)

	// Member 1: already left, exactly 5 years tenure -> awarded.
	_, err = svc.db.Exec(ctx, `
		INSERT INTO hist_fansub_group_members (member_id, joined_date, left_date)
		VALUES (1, DATE '2015-01-01', DATE '2020-01-01')
	`)
	require.NoError(t, err)

	// Member 2: still active, joined exactly 5 years ago -> awarded.
	_, err = svc.db.Exec(ctx, `
		INSERT INTO hist_fansub_group_members (member_id, joined_date, left_date)
		VALUES (2, CURRENT_DATE - INTERVAL '5 years', NULL)
	`)
	require.NoError(t, err)

	// Member 3: still active, joined one day short of 5 years -> not awarded.
	_, err = svc.db.Exec(ctx, `
		INSERT INTO hist_fansub_group_members (member_id, joined_date, left_date)
		VALUES (3, CURRENT_DATE - INTERVAL '5 years' + INTERVAL '1 day', NULL)
	`)
	require.NoError(t, err)

	svc.computeLongTermMember(ctx, 1)
	svc.computeLongTermMember(ctx, 2)
	svc.computeLongTermMember(ctx, 3)

	rows1, err := badgeRepo.GetMemberBadges(ctx, 1)
	require.NoError(t, err)
	require.True(t, badgeCodesOf(rows1)["long_term_member"], "genau 5 Jahre (bereits ausgeschieden) muss long_term_member vergeben")

	rows2, err := badgeRepo.GetMemberBadges(ctx, 2)
	require.NoError(t, err)
	require.True(t, badgeCodesOf(rows2)["long_term_member"], "genau 5 Jahre (noch aktiv) muss long_term_member vergeben")

	rows3, err := badgeRepo.GetMemberBadges(ctx, 3)
	require.NoError(t, err)
	require.False(t, badgeCodesOf(rows3)["long_term_member"], "einen Tag unter 5 Jahren darf long_term_member NICHT vergeben")
}

// TestComputeProductiveTiersPostgresBoundaries beweist D-05/D-20 an den geforderten
// 9/10/24/25/49/50-Grenzwerten mit echten anime_contributions-Zeilen und echten
// member_badges-Reads -- ersetzt die entfernten Quelltext-Substring-Zahlen-Assertionen aus
// TestComputeProductiveTiers.
func TestComputeProductiveTiersPostgresBoundaries(t *testing.T) {
	svc, badgeRepo := newPhase150BadgeService(t)
	ctx := context.Background()

	_, err := svc.db.Exec(ctx, `INSERT INTO members (id) VALUES (1)`)
	require.NoError(t, err)

	seedDistinctConfirmed := func(count int) {
		_, err := svc.db.Exec(ctx, `DELETE FROM anime_contributions WHERE member_id = 1`)
		require.NoError(t, err)
		for i := 0; i < count; i++ {
			_, err := svc.db.Exec(ctx, `
				INSERT INTO anime_contributions (member_id, anime_id, status)
				VALUES (1, $1, 'confirmed')
			`, i+1)
			require.NoError(t, err)
		}
	}

	cases := []struct {
		count        int
		expectBronze bool
		expectSilver bool
		expectGold   bool
	}{
		{9, false, false, false},
		{10, true, false, false},
		{24, true, false, false},
		{25, true, true, false},
		{49, true, true, false},
		{50, true, true, true},
	}
	for _, tc := range cases {
		seedDistinctConfirmed(tc.count)
		svc.computeProductiveTiers(ctx, 1)

		rows, err := badgeRepo.GetMemberBadges(ctx, 1)
		require.NoError(t, err)
		codes := badgeCodesOf(rows)
		require.Equalf(t, tc.expectBronze, codes["productive_bronze"], "count=%d productive_bronze", tc.count)
		require.Equalf(t, tc.expectSilver, codes["productive_silver"], "count=%d productive_silver", tc.count)
		require.Equalf(t, tc.expectGold, codes["productive_gold"], "count=%d productive_gold", tc.count)
	}
}
