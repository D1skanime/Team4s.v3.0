package repository

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

// Phase 129 (Plan 02, Wave 1, RED): oeffentliche Mitgliedschafts-Projektion
// (PMDA-02/05/10, PMPR-06). loadMemberships wird im public Pfad mit
// includeAppMembershipDetails=false / includeInternalHistorical=false aufgerufen und
// befragt hist_group_member_roles heute NICHT -- der public app_member_roles-Zweig ist
// per $4-Gate leer. Dieser Test seedet einen Member mit einer AKTUELLEN (left_date NULL)
// und einer HISTORISCHEN Mitgliedschaft, jeweils mit mehreren oeffentlichen Rollen in
// hist_group_member_roles, und behauptet, dass alle freigegebenen Rollen distinkt pro
// Gruppenkarte sichtbar sind.

// TestPhase129PublicMembershipsExposeApprovedHistoricalRoles deckt PMDA-05/10 ab: die
// oeffentliche Mitgliedschaft muss ALLE freigegebenen Rollen aus hist_group_member_roles
// (visibility='public') fuehren, nicht nur die erste und nicht leer. Der aktuelle public
// Pfad liefert gar keine Rollen -> das JSON enthaelt weder 'translator' noch 'typesetter'
// noch 'editor' (ROT). Zusaetzlich muessen zwei distinkte Gruppenkarten entstehen und
// current (left_date NULL) von historical (left_date gesetzt) unterscheidbar bleiben.
func TestPhase129PublicMembershipsExposeApprovedHistoricalRoles(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	mustExecPhase129(t, pool, `
		INSERT INTO role_definitions (code, label_de) VALUES
			('translator', 'Übersetzer'), ('typesetter', 'Typesetter'), ('editor', 'Editor');
		INSERT INTO members (id, nickname, public_slug) VALUES (1292001, 'phase129-memberships', 'phase129-memberships');
		INSERT INTO fansub_groups (id, slug, name, status) VALUES
			(1292201, 'phase129-grp-current', 'Phase129 Current Group', 'active'),
			(1292202, 'phase129-grp-historical', 'Phase129 Historical Group', 'dissolved');
		-- current membership (left_date NULL)
		INSERT INTO hist_fansub_group_members (id, fansub_group_id, member_id, status, visibility, joined_date, left_date)
		VALUES (1292301, 1292201, 1292001, 'confirmed', 'public', '2018-01-01', NULL);
		-- historical membership (left_date set)
		INSERT INTO hist_fansub_group_members (id, fansub_group_id, member_id, status, visibility, joined_date, left_date)
		VALUES (1292302, 1292202, 1292001, 'historical', 'public', '2010-01-01', '2014-01-01');
		-- multiple approved public roles on the current membership
		INSERT INTO hist_group_member_roles (hist_fansub_group_member_id, role_code, status, visibility) VALUES
			(1292301, 'translator', 'confirmed', 'public'),
			(1292301, 'typesetter', 'confirmed', 'public');
		-- an approved public role on the historical membership
		INSERT INTO hist_group_member_roles (hist_fansub_group_member_id, role_code, status, visibility) VALUES
			(1292302, 'editor', 'confirmed', 'public');
	`)

	// Public projection contract: includeAppMembershipDetails=false, includeInternalHistorical=false.
	memberships, err := repo.loadMemberships(context.Background(), 1292001, 0, false, false)
	require.NoError(t, err)

	require.Lenf(t, memberships, 2,
		"PMDA-02: two distinct group memberships (current + historical) must each surface as exactly one card; got %d", len(memberships))

	payload, err := json.Marshal(memberships)
	require.NoError(t, err)
	body := string(payload)

	require.Containsf(t, body, "translator",
		"PMDA-05/10: public membership must expose the approved role 'translator' from hist_group_member_roles; got %s", body)
	require.Containsf(t, body, "typesetter",
		"PMDA-05: public membership must expose ALL approved roles ('typesetter'), not just the first; got %s", body)
	require.Containsf(t, body, "editor",
		"PMDA-05: the historical membership must also expose its approved role 'editor'; got %s", body)
}
