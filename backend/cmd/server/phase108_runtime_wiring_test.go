package main

import (
	"os"
	"strings"
	"testing"
)

func TestPhase108RuntimeWiringUsesOneSharedServiceGraph(t *testing.T) {
	mainSource, err := os.ReadFile("main.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(mainSource)
	for _, fragment := range []string{
		"releaseCrewService := services.NewReleaseCrewService(dbPool, pointService)",
		"repository.NewEpisodeVersionRepository(dbPool, releaseCrewService)",
		"repository.NewEpisodeImportRepository(dbPool, releaseCrewService)",
		"WithReleaseCrewDeps(releaseCrewService)",
		"WithReleaseCrewService(releaseCrewService)",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("production graph missing shared Phase-108 dependency %q", fragment)
		}
	}
	if strings.Count(source, "services.NewReleaseCrewService(") != 1 {
		t.Fatal("production must construct exactly one ReleaseCrewService")
	}
}

func TestPhase108RuntimeWiringRegistersEveryMutationOwner(t *testing.T) {
	routes, err := os.ReadFile("admin_routes.go")
	if err != nil {
		t.Fatal(err)
	}
	mainSource, err := os.ReadFile("main.go")
	if err != nil {
		t.Fatal(err)
	}
	combined := string(routes) + string(mainSource)
	for _, fragment := range []string{
		`PUT("/admin/release-versions/:versionId/contributions/effective"`,
		`POST("/admin/fansubs/:id/anime/:animeId/contributions"`,
		`PATCH("/admin/fansubs/:id/anime/:animeId/contributions/:contributionId"`,
		`DELETE("/admin/fansubs/:id/anime/:animeId/contributions/:contributionId"`,
		`POST("/admin/fansubs/:id/contribution-proposals/:cid/confirm"`,
		`POST("/me/anime-contributions/:contributionId/confirm"`,
		`PUT("/admin/fansubs/:id/anime/:animeId/notes"`,
	} {
		if !strings.Contains(combined, fragment) {
			t.Fatalf("production route missing Phase-108 mutation owner %q", fragment)
		}
	}
}
