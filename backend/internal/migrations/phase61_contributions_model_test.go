package migrations

import (
	"strings"
	"testing"
)

func TestPhase61IdentityAndHistoricalMembershipMigrationContracts(t *testing.T) {
	identityUp := strings.ToLower(readMigrationFile(t, "0081_historical_members_identity.up.sql"))
	identityDown := strings.ToLower(readMigrationFile(t, "0081_historical_members_identity.down.sql"))
	membershipUp := strings.ToLower(readMigrationFile(t, "0082_historical_fansub_group_members.up.sql"))
	membershipDown := strings.ToLower(readMigrationFile(t, "0082_historical_fansub_group_members.down.sql"))

	assertContainsAll(t, identityUp, []string{
		"add column if not exists noindex boolean not null default true",
		"create table if not exists member_claims",
		"id              bigserial primary key",
		"member_id       bigint not null references members(id) on delete cascade",
		"app_user_id     bigint null references app_users(id) on delete set null",
		"constraint uq_member_claims_member_user unique (member_id, app_user_id)",
		"constraint chk_member_claims_status check (claim_status in ('pending', 'verified', 'rejected'))",
	})
	assertContainsAll(t, identityDown, []string{
		"drop table if exists member_claims",
		"drop column if exists noindex",
	})

	assertContainsAll(t, membershipUp, []string{
		"create table if not exists hist_fansub_group_members",
		"id               bigserial primary key",
		"fansub_group_id  bigint not null references fansub_groups(id) on delete restrict",
		"member_id        bigint not null references members(id) on delete restrict",
		"constraint uq_hist_fansub_group_members_group_member unique (fansub_group_id, member_id)",
		"constraint chk_hist_fansub_group_members_status check (status in ('draft', 'historical', 'confirmed', 'disputed'))",
		"constraint chk_hist_fansub_group_members_visibility check (visibility in ('internal', 'public'))",
		"constraint chk_hist_fansub_group_members_years check (left_year is null or joined_year is null or left_year >= joined_year)",
	})
	assertContainsAll(t, membershipDown, []string{
		"drop table if exists hist_fansub_group_members",
	})
}

func TestPhase61RoleDefinitionsAndHistoryMigrationContracts(t *testing.T) {
	rolesUp := strings.ToLower(readMigrationFile(t, "0083_hist_group_member_roles.up.sql"))
	historyUp := strings.ToLower(readMigrationFile(t, "0084_fansub_group_history.up.sql"))
	definitionsUp := strings.ToLower(readMigrationFile(t, "0085_role_definitions_seed.up.sql"))
	definitionsDown := strings.ToLower(readMigrationFile(t, "0085_role_definitions_seed.down.sql"))

	assertContainsAll(t, rolesUp, []string{
		"create table if not exists hist_group_member_roles",
		"id                          bigserial primary key",
		"hist_fansub_group_member_id bigint not null references hist_fansub_group_members(id) on delete cascade",
		"role_code                   text not null",
		"constraint chk_hist_group_member_roles_years      check (ended_year is null or started_year is null or ended_year >= started_year)",
	})
	if strings.Contains(rolesUp, "role_code                   text not null references role_definitions") {
		t.Fatalf("expected migration 0083 to defer role_definitions FK until migration 0085")
	}

	assertContainsAll(t, historyUp, []string{
		"create table if not exists fansub_group_history",
		"id              bigserial primary key",
		"fansub_group_id bigint not null references fansub_groups(id) on delete cascade",
		"constraint chk_fansub_group_history_event_type check (event_type in ('founding', 'disbanding', 'hiatus', 'rebranding', 'milestone', 'other'))",
	})

	assertContainsAll(t, definitionsUp, []string{
		"create table if not exists role_definitions",
		"code       text primary key",
		"contexts   text[] not null default '{}'",
		"('translator'",
		"('editor'",
		"('timer'",
		"('typesetter'",
		"('encoder'",
		"('raw_provider'",
		"('quality_checker'",
		"('project_lead'",
		"('designer'",
		"('admin'",
		"('other'",
		"('founder'",
		"('leader'",
		"('co_leader'",
		"('project_manager'",
		"array['anime_contribution', 'group_history']",
		"array['group_history', 'anime_contribution']",
		"add constraint fk_hist_group_member_roles_role_code",
		"foreign key (role_code) references role_definitions(code) on delete restrict",
	})
	assertContainsAll(t, definitionsDown, []string{
		"drop constraint if exists fk_hist_group_member_roles_role_code",
		"drop table if exists role_definitions",
	})
}

func TestGroupHistoryAchievementEventTypesMigrationContract(t *testing.T) {
	achievementUp := strings.ToLower(readMigrationFile(t, "0125_group_history_achievement_event_types.up.sql"))
	achievementDown := strings.ToLower(readMigrationFile(t, "0125_group_history_achievement_event_types.down.sql"))

	assertContainsAll(t, achievementUp, []string{
		"drop constraint if exists chk_fansub_group_history_event_type",
		"add constraint chk_fansub_group_history_event_type",
		"'first_release'",
		"'anniversary'",
		"'collaboration'",
		"'revival'",
		"'project_completed'",
		"'team_change'",
		"'website_launch'",
		"'award'",
		"'projects_10'",
		"'projects_50'",
		"'projects_100'",
		"'projects_500'",
		"'releases_100'",
		"'releases_500'",
		"'releases_1000'",
		"'releases_5000'",
		"'releases_10000'",
	})

	assertContainsAll(t, achievementDown, []string{
		"cannot restore old fansub_group_history event_type constraint while newer achievement event types exist",
		"check (event_type in ('founding', 'disbanding', 'hiatus', 'rebranding', 'milestone', 'other'))",
	})
}

func TestMemberProfilePublicDefaultsMigrationContract(t *testing.T) {
	publicDefaultsUp := strings.ToLower(readMigrationFile(t, "0126_member_profile_public_defaults.up.sql"))
	publicDefaultsDown := strings.ToLower(readMigrationFile(t, "0126_member_profile_public_defaults.down.sql"))

	assertContainsAll(t, publicDefaultsUp, []string{
		"alter column profile_visibility set default 'public'",
		"alter column noindex set default false",
	})

	assertContainsAll(t, publicDefaultsDown, []string{
		"alter column profile_visibility set default 'members_only'",
		"alter column noindex set default true",
	})
}

func TestPhase61AnimeContributionRoleAndBadgeMigrationContracts(t *testing.T) {
	contributionsUp := strings.ToLower(readMigrationFile(t, "0086_anime_contributions.up.sql"))
	contributionsDown := strings.ToLower(readMigrationFile(t, "0086_anime_contributions.down.sql"))
	rolesBadgesUp := strings.ToLower(readMigrationFile(t, "0087_anime_contribution_roles_and_badges.up.sql"))
	rolesBadgesDown := strings.ToLower(readMigrationFile(t, "0087_anime_contribution_roles_and_badges.down.sql"))

	assertContainsAll(t, contributionsUp, []string{
		"create table if not exists anime_contributions",
		"id                         bigserial primary key",
		"fansub_group_id            bigint not null references fansub_groups(id) on delete restrict",
		"anime_id                   bigint not null references anime(id) on delete restrict",
		"fansub_group_member_id     bigint not null references hist_fansub_group_members(id) on delete restrict",
		"constraint chk_anime_contributions_status check (status in ('draft', 'proposed', 'confirmed', 'disputed', 'hidden'))",
		"constraint chk_anime_contributions_years check (ended_year is null or started_year is null or ended_year >= started_year)",
		"on anime_contributions(is_public_on_anime_page) where is_public_on_anime_page = true",
		"on anime_contributions(is_public_on_member_profile) where is_public_on_member_profile = true",
	})
	assertContainsAll(t, contributionsDown, []string{
		"drop table if exists anime_contributions",
	})

	assertContainsAll(t, rolesBadgesUp, []string{
		"create table if not exists anime_contribution_roles",
		"id                     bigserial primary key",
		"anime_contribution_id  bigint not null references anime_contributions(id) on delete cascade",
		"role_code              text not null references role_definitions(code) on delete restrict",
		"constraint uq_anime_contribution_roles_contrib_role unique (anime_contribution_id, role_code)",
		"create table if not exists member_badges",
		"member_id          bigint not null references members(id) on delete cascade",
		"derived_from_type  text null",
		"derived_from_id    bigint null",
		"constraint uq_member_badges_member_code unique (member_id, badge_code)",
		"constraint chk_member_badges_category check (badge_category in ('historical_achievement', 'supporter', 'platform'))",
		"constraint chk_member_badges_visibility check (visibility in ('public', 'internal', 'hidden'))",
	})
	assertContainsAll(t, rolesBadgesDown, []string{
		"drop table if exists member_badges",
		"drop table if exists anime_contribution_roles",
	})
}

func assertContainsAll(t *testing.T, content string, fragments []string) {
	t.Helper()

	for _, fragment := range fragments {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected migration content to contain %q", fragment)
		}
	}
}
