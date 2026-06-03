package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func phase69ReadRepoSource(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}

func phase69NormalizeSQL(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(s)), " ")
}

func phase69RequireFragment(t *testing.T, content string, fragment string) {
	t.Helper()
	if !strings.Contains(content, strings.ToLower(fragment)) {
		t.Fatalf("erwartetes Fragment %q", fragment)
	}
}

func TestPhase69HistGroupMembersMutationsUseFansubScope(t *testing.T) {
	content := phase69NormalizeSQL(phase69ReadRepoSource(t, "hist_group_members_repository.go"))

	required := []string{
		"func (r *histgroupmembersrepository) getbyidforfansub(ctx context.context, fansubgroupid int64, id int64)",
		"where id = $1 and fansub_group_id = $2",
		"func (r *histgroupmembersrepository) update(ctx context.context, fansubgroupid int64, id int64",
		"where id = $%d and fansub_group_id = $%d",
		"delete from hist_fansub_group_members where id = $1 and fansub_group_id = $2",
	}
	for _, fragment := range required {
		phase69RequireFragment(t, content, fragment)
	}
}

func TestPhase69HistGroupMemberRolesMutationsUseFansubScope(t *testing.T) {
	content := phase69NormalizeSQL(phase69ReadRepoSource(t, "hist_group_member_roles_repository.go"))

	required := []string{
		"func (r *histgroupmemberrolesrepository) getbyidforfansub(ctx context.context, fansubgroupid int64, id int64)",
		"join hist_fansub_group_members hfgm on hfgm.id = r.hist_fansub_group_member_id",
		"where r.id = $1 and hfgm.fansub_group_id = $2",
		"func (r *histgroupmemberrolesrepository) update(ctx context.context, fansubgroupid int64, id int64",
		"where hfgm.id = hist_group_member_roles.hist_fansub_group_member_id and hfgm.fansub_group_id = $%d",
		"delete from hist_group_member_roles r using hist_fansub_group_members hfgm",
		"and hfgm.id = r.hist_fansub_group_member_id and hfgm.fansub_group_id = $2",
	}
	for _, fragment := range required {
		phase69RequireFragment(t, content, fragment)
	}
}

func TestPhase69AnimeContributionMutationsUseRouteScope(t *testing.T) {
	contributions := phase69NormalizeSQL(phase69ReadRepoSource(t, "anime_contributions_repository.go"))
	memberFile := phase69NormalizeSQL(phase69ReadRepoSource(t, "anime_contributions_member_repository.go"))

	requiredContributions := []string{
		"func (r *animecontributionsrepository) getbyidforfansubanime(ctx context.context, fansubgroupid int64, animeid int64, id int64)",
		"where ac.id = $1 and ac.fansub_group_id = $2 and ac.anime_id = $3",
		"func (r *animecontributionsrepository) update(ctx context.context, fansubgroupid int64, animeid int64, id int64",
		"where id = $%d and fansub_group_id = $%d and anime_id = $%d",
		"delete from anime_contribution_roles acr using anime_contributions ac",
		"and ac.id = $1 and ac.fansub_group_id = $2 and ac.anime_id = $3",
		"select ac.id, $2 from anime_contributions ac where ac.id = $1 and ac.fansub_group_id = $3 and ac.anime_id = $4",
	}
	for _, fragment := range requiredContributions {
		phase69RequireFragment(t, contributions, fragment)
	}

	phase69RequireFragment(t, memberFile, "delete from anime_contributions where id = $1 and fansub_group_id = $2 and anime_id = $3")
}
