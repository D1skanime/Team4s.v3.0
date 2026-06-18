package permissions

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockCacheLoader implementiert CacheLoader mit konfigurierbaren Daten.
type mockCacheLoader struct {
	data map[string][]Action
}

func (m mockCacheLoader) LoadRoleCapabilities(_ context.Context) (map[string][]Action, error) {
	return m.data, nil
}

// errorCacheLoader implementiert CacheLoader und gibt immer einen Fehler zurück.
type errorCacheLoader struct {
	err error
}

func (e errorCacheLoader) LoadRoleCapabilities(_ context.Context) (map[string][]Action, error) {
	return nil, e.err
}

// fullValidCacheData gibt eine vollständige Role→Action-Map zurück, die den D-10-Check besteht.
// Jede der 18 bekannten Actions muss entweder in mindestens einer Rolle vorkommen
// oder in standaloneActions deklariert sein.
func fullValidCacheData() map[string][]Action {
	return map[string][]Action{
		RoleFansubLead: {
			ActionFansubGroupEdit,
			ActionFansubGroupLinksManage,
			ActionFansubGroupMembersView,
			ActionFansubGroupMembersManage,
			ActionFansubGroupInvitationsView,
			ActionFansubGroupInvitationsCreate,
			ActionFansubGroupInvitationsCancel,
			ActionFansubGroupNotesWrite,
			ActionAnimeFansubProjectNotesWrite,
			ActionReleaseView,
			ActionReleaseVersionView,
			ActionReleaseVersionMediaView,
			ActionReleaseVersionMediaUpload,
			ActionReleaseVersionMediaUpdate,
			ActionReleaseVersionMediaDelete,
			ActionReleaseVersionNotesWrite,
		},
		RoleDesigner: {
			ActionReleaseVersionMediaDeleteOwn,
		},
	}
}

// TestReloadCacheReplacesCacheAtomically prüft, dass ReloadCache den Cache mit neuen Werten befüllt.
// Nach ReloadCache muss AllowedActionsForRole die Werte aus dem Stub zurückgeben.
func TestReloadCacheReplacesCacheAtomically(t *testing.T) {
	// Cache leeren (Reset für Test-Isolation).
	cacheMu.Lock()
	loadedCache = nil
	cacheMu.Unlock()

	ctx := context.Background()
	svc := NewService(nil)

	stub := mockCacheLoader{data: fullValidCacheData()}
	err := svc.ReloadCache(ctx, stub)
	require.NoError(t, err, "ReloadCache sollte keinen Fehler zurückgeben")

	// Cache muss jetzt die Werte aus dem Stub enthalten.
	actions := AllowedActionsForRole(RoleFansubLead)
	assert.NotEmpty(t, actions, "AllowedActionsForRole(fansub_lead) muss nach ReloadCache nicht-leer sein")
	assert.Contains(t, actions, ActionFansubGroupEdit, "fansub_lead muss fansub_group.edit haben")
}

// TestReloadCacheFailsafe beweist D-06-Fail-safe:
// Ein fehlgeschlagener ReloadCache-Aufruf lässt den zuvor geladenen Cache unberührt.
// Kein fail-open, kein leerer Cache.
func TestReloadCacheFailsafe(t *testing.T) {
	// Cache leeren (Reset für Test-Isolation).
	cacheMu.Lock()
	loadedCache = nil
	cacheMu.Unlock()

	ctx := context.Background()
	svc := NewService(nil)

	// Schritt 1: Gültigen Cache laden.
	validStub := mockCacheLoader{data: fullValidCacheData()}
	err := svc.LoadCache(ctx, validStub)
	require.NoError(t, err, "LoadCache mit gültigem Stub muss keinen Fehler zurückgeben")

	// Cache ist jetzt gesetzt — Actions sichern.
	actionsBeforeFailedReload := AllowedActionsForRole(RoleFansubLead)
	require.NotEmpty(t, actionsBeforeFailedReload, "Cache muss nach LoadCache nicht-leer sein")

	// Schritt 2: ReloadCache mit fehlendem Loader aufrufen.
	errLoader := errorCacheLoader{err: errors.New("db down")}
	reloadErr := svc.ReloadCache(ctx, errLoader)
	assert.Error(t, reloadErr, "ReloadCache mit Fehler-Loader muss einen Fehler zurückgeben")

	// Schritt 3: Alter Cache muss unverändert vorhanden sein (Fail-safe).
	actionsAfterFailedReload := AllowedActionsForRole(RoleFansubLead)
	assert.NotEmpty(t, actionsAfterFailedReload, "Cache muss nach fehlgeschlagenem ReloadCache unverändert vorhanden sein")
	assert.Equal(t, len(actionsBeforeFailedReload), len(actionsAfterFailedReload),
		"Anzahl der Actions muss nach fehlgeschlagenem Reload identisch bleiben")
}
