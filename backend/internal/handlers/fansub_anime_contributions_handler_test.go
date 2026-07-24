package handlers

import (
	"strings"
	"testing"
)

func TestProjectOnlyGenericMutationsDelegateToReleaseCrewService(t *testing.T) {
	handler := readContributionsHandlerSource(t, "fansub_anime_contributions_handler.go")
	deleteHandler := readContributionsHandlerSource(t, "fansub_anime_contributions_delete_handler.go")

	for _, fragment := range []string{
		"WithReleaseCrewService",
		"ApplyProjectRosterMutation",
		"req.ReleaseVersionID != nil",
		"review-status darf nur",
	} {
		if !strings.Contains(handler, fragment) {
			t.Fatalf("generic POST/PATCH must enforce project mutation boundary %q", fragment)
		}
	}
	for _, fragment := range []string{
		"GetByIDForFansubAnime",
		"ReleaseVersionID != nil",
		"ApplyProjectRosterMutation",
	} {
		if !strings.Contains(deleteHandler, fragment) {
			t.Fatalf("generic DELETE must enforce project mutation boundary %q", fragment)
		}
	}
}

func TestProjectMutationServiceOwnsTransactionAndInheritedSync(t *testing.T) {
	service := readContributionsHandlerSource(t, "../services/release_crew_service.go")
	for _, fragment := range []string{
		"func (s *ReleaseCrewService) ApplyProjectRosterMutation(",
		"Begin(ctx)",
		"SyncProjectInTx",
		"tx.Commit(ctx)",
	} {
		if !strings.Contains(service, fragment) {
			t.Fatalf("project mutation service missing atomic boundary %q", fragment)
		}
	}
}
