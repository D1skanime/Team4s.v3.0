package services

import (
	"os"
	"strings"
	"testing"
)

func TestReleaseCrewSemanticUnitDiff(t *testing.T) {
	before := []releaseCrewUnit{{MemberID: 1, RoleCode: "translation"}, {MemberID: 2, RoleCode: "qc"}, {MemberID: 3, RoleCode: "edit"}}
	after := []releaseCrewUnit{{MemberID: 1, RoleCode: "translation"}, {MemberID: 1, RoleCode: "qc"}, {MemberID: 3, RoleCode: "edit"}}
	removed, unchanged, added := diffReleaseCrewUnits(before, after)
	if len(removed) != 1 || removed[0] != (releaseCrewUnit{MemberID: 2, RoleCode: "qc"}) {
		t.Fatalf("removed = %#v", removed)
	}
	if len(added) != 1 || added[0] != (releaseCrewUnit{MemberID: 1, RoleCode: "qc"}) {
		t.Fatalf("added = %#v", added)
	}
	if len(unchanged) != 2 {
		t.Fatalf("unchanged = %#v", unchanged)
	}
}

func TestReleaseCrewServiceHasNoDirectLedgerSQL(t *testing.T) {
	body, err := os.ReadFile("release_crew_service.go")
	if err != nil {
		t.Fatal(err)
	}
	text := strings.ToUpper(string(body))
	for _, forbidden := range []string{"INSERT INTO POINT_LEDGER_ENTRIES", "UPDATE POINT_LEDGER_ENTRIES", "DELETE FROM POINT_LEDGER_ENTRIES"} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("service contains direct ledger SQL: %s", forbidden)
		}
	}
}

func TestReleaseCrewSourceIdentityIncludesRestorationGeneration(t *testing.T) {
	first := releaseCrewSourceKey(176, 7, releaseCrewUnit{MemberID: 11, RoleCode: "qc"}, 1)
	restored := releaseCrewSourceKey(176, 7, releaseCrewUnit{MemberID: 11, RoleCode: "qc"}, 2)
	if first == restored || !strings.Contains(restored, "generation:2") {
		t.Fatalf("source identities first=%q restored=%q", first, restored)
	}
}
