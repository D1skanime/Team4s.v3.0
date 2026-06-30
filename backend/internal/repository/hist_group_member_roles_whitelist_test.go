package repository

// hist_group_member_roles_whitelist_test.go — Wave-0-Test D-06/D-13 (Plan 95-03)
//
// TestGroupHistoryWhitelist prüft direkt, dass IsGroupHistoryWhitelistRole die
// kanonischen Gruppenrollen-Codes aus D-06 korrekt klassifiziert.
// Kein DB-Zugriff nötig: die Methode iteriert nur die package-level Slice.

import (
	"testing"
)

func TestGroupHistoryWhitelist(t *testing.T) {
	// nil-Pool ist OK: IsGroupHistoryWhitelistRole macht keinen DB-Aufruf.
	r := NewHistGroupMemberRolesRepository(nil)

	t.Run("translator nicht in Whitelist", func(t *testing.T) {
		if r.IsGroupHistoryWhitelistRole("translator") {
			t.Error("'translator' darf nicht in der group_history-Whitelist sein (App-Rolle, kein Gruppencode)")
		}
	})

	t.Run("editor nicht in Whitelist", func(t *testing.T) {
		if r.IsGroupHistoryWhitelistRole("editor") {
			t.Error("'editor' darf nicht in der group_history-Whitelist sein (App-Rolle)")
		}
	})

	t.Run("leader NICHT mehr in Whitelist", func(t *testing.T) {
		if r.IsGroupHistoryWhitelistRole("leader") {
			t.Error("'leader' wurde durch 'fansub_lead' ersetzt und darf nicht mehr in der Whitelist sein (D-06)")
		}
	})

	t.Run("project_manager NICHT mehr in Whitelist", func(t *testing.T) {
		if r.IsGroupHistoryWhitelistRole("project_manager") {
			t.Error("'project_manager' wurde durch 'project_lead' ersetzt (D-04) und darf nicht mehr in der Whitelist sein")
		}
	})

	t.Run("fansub_lead in Whitelist", func(t *testing.T) {
		if !r.IsGroupHistoryWhitelistRole("fansub_lead") {
			t.Error("'fansub_lead' muss in der group_history-Whitelist sein (D-06, ersetzt 'leader')")
		}
	})

	t.Run("founder in Whitelist", func(t *testing.T) {
		if !r.IsGroupHistoryWhitelistRole("founder") {
			t.Error("'founder' muss in der group_history-Whitelist sein")
		}
	})

	t.Run("co_leader in Whitelist", func(t *testing.T) {
		if !r.IsGroupHistoryWhitelistRole("co_leader") {
			t.Error("'co_leader' muss in der group_history-Whitelist sein")
		}
	})

	t.Run("project_lead in Whitelist", func(t *testing.T) {
		if !r.IsGroupHistoryWhitelistRole("project_lead") {
			t.Error("'project_lead' muss in der group_history-Whitelist sein (D-06, ersetzt 'project_manager')")
		}
	})

	t.Run("techadmin in Whitelist", func(t *testing.T) {
		if !r.IsGroupHistoryWhitelistRole("techadmin") {
			t.Error("'techadmin' muss in der group_history-Whitelist sein (D-07, neue Rolle)")
		}
	})

	t.Run("gfxler in Whitelist", func(t *testing.T) {
		if !r.IsGroupHistoryWhitelistRole("gfxler") {
			t.Error("'gfxler' muss in der group_history-Whitelist sein (D-08, neue Rolle)")
		}
	})

	t.Run("leerer String nicht in Whitelist", func(t *testing.T) {
		if r.IsGroupHistoryWhitelistRole("") {
			t.Error("leerer String darf nicht in der Whitelist sein")
		}
	})
}
