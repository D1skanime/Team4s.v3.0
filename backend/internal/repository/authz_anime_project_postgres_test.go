package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

// TestListActorContributionRolesForAnimeProjectReturnsConfirmedRoles ist der
// Positiv-Baseline-Testfall und spiegelt den echten Live-Fall aus 188-CONTEXT.md:
// Strawhat Subs (Gruppe 26), Anime 3 ("11eyes: Pink Phantasmagoria"), app_user 6 /
// member 4, bestätigte anime_contributions-Zeile mit den Projektrollen
// translator + project_lead.
func TestListActorContributionRolesForAnimeProjectReturnsConfirmedRoles(t *testing.T) {
	pool := testsupport.OpenPhase188PermissionsPostgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id, member_id, status)
		VALUES (7, 26, 6, 4, 'active');
		INSERT INTO anime_contributions (id, anime_id, fansub_group_id, member_id, status)
		VALUES (684, 3, 26, 4, 'confirmed');
		INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
		VALUES (684, 'translator'), (684, 'project_lead');
	`)
	require.NoError(t, err)

	repo := NewAuthzRepository(pool)
	roles, err := repo.ListActorContributionRolesForAnimeProject(ctx, 6, 3, 26)
	require.NoError(t, err)
	require.Equal(t, []string{"project_lead", "translator"}, roles)
}

// TestListActorContributionRolesForAnimeProjectExcludesUnconfirmedContribution ist
// Testfall 3 (D-12-Sicherheitsgrenze): eine Projektrolle mit anime_contributions.status
// != 'confirmed' gewährt keinen Zugriff.
func TestListActorContributionRolesForAnimeProjectExcludesUnconfirmedContribution(t *testing.T) {
	pool := testsupport.OpenPhase188PermissionsPostgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id, member_id, status)
		VALUES (7, 26, 6, 4, 'active');
		INSERT INTO anime_contributions (id, anime_id, fansub_group_id, member_id, status)
		VALUES (684, 3, 26, 4, 'draft');
		INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
		VALUES (684, 'translator'), (684, 'project_lead');
	`)
	require.NoError(t, err)

	repo := NewAuthzRepository(pool)
	roles, err := repo.ListActorContributionRolesForAnimeProject(ctx, 6, 3, 26)
	require.NoError(t, err)
	require.Empty(t, roles)
}

// TestListActorContributionRolesForAnimeProjectExcludesCrossAnimeContribution ist
// Testfall 4 (D-12-Sicherheitsgrenze, Cross-Anime-Leak-Schutz): eine bestätigte
// Projektrolle für ein ANDERES Anime gewährt keinen Zugriff auf das angefragte Anime.
func TestListActorContributionRolesForAnimeProjectExcludesCrossAnimeContribution(t *testing.T) {
	pool := testsupport.OpenPhase188PermissionsPostgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id, member_id, status)
		VALUES (7, 26, 6, 4, 'active');
		INSERT INTO anime_contributions (id, anime_id, fansub_group_id, member_id, status)
		VALUES (900, 99, 26, 4, 'confirmed');
		INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
		VALUES (900, 'project_lead');
	`)
	require.NoError(t, err)

	repo := NewAuthzRepository(pool)
	roles, err := repo.ListActorContributionRolesForAnimeProject(ctx, 6, 3, 26)
	require.NoError(t, err)
	require.Empty(t, roles)
}
