package repository_test

import (
	"reflect"
	"testing"

	"team4s.v3/backend/internal/repository"
)

func TestResolvePendingRolesToActive_ExistsOnRepository(t *testing.T) {
	repoType := reflect.TypeOf((*repository.MemberClaimsRepository)(nil))
	method, ok := repoType.MethodByName("ResolvePendingRolesToActive")
	if !ok {
		t.Fatal("MemberClaimsRepository.ResolvePendingRolesToActive(ctx, memberID, fansubGroupID, actorID int64) error fehlt - D-05 nicht implementiert")
	}
	if method.Type.NumIn() != 5 || method.Type.NumOut() != 1 {
		t.Fatalf("ResolvePendingRolesToActive hat Signatur %s, erwartet receiver + ctx + memberID + fansubGroupID + actorID -> error", method.Type)
	}
	if method.Type.Out(0).String() != "error" {
		t.Fatalf("ResolvePendingRolesToActive muss error zurueckgeben, gefunden %s", method.Type.Out(0))
	}
}

func TestVerifyClaimActivatesRoles_FansubLeadExcluded(t *testing.T) {
	t.Skip("RED Wave 0 - wird in Plan 04 durch echte DB-Tests ersetzt: fansub_lead darf nicht automatisch aktiv werden")
}

func TestVerifyClaimActivatesRoles_FounderExcluded(t *testing.T) {
	t.Skip("RED Wave 0 - wird in Plan 04 durch echte DB-Tests ersetzt: founder darf nicht automatisch aktiv werden")
}

func TestVerifyClaimActivatesRoles_NilEnddateRoleActivated(t *testing.T) {
	t.Skip("RED Wave 0 - wird in Plan 04 durch echte DB-Tests ersetzt: Rolle ohne Enddatum wird aktiv uebernommen")
}
