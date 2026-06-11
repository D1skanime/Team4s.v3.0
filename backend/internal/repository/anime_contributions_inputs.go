package repository

// Ausgelagert aus anime_contributions_repository.go fuer das 450-Zeilen-Limit (Phase 67-02 W1).
// Enthaelt die Read-/Write-DTO-Structs fuer anime_contributions. Keine Verhaltensaenderung
// durch die Verschiebung; die release_version_id-Felder sind die Phase-67-02-Erweiterung
// (optionale Versions-Zuordnung, D-10 Roundtrip).

import "time"

// AnimeContributionRow represents a full anime contribution record with associated role codes.
type AnimeContributionRow struct {
	ID                      int64      `json:"id"`
	FansubGroupID           int64      `json:"fansub_group_id"`
	AnimeID                 int64      `json:"anime_id"`
	MemberID                int64      `json:"member_id"`
	Status                  string     `json:"status"`
	Note                    *string    `json:"note"`
	StartedYear             *int       `json:"started_year"`
	EndedYear               *int       `json:"ended_year"`
	IsPublicOnAnimePage     bool       `json:"is_public_on_anime_page"`
	IsPublicOnMemberProfile bool       `json:"is_public_on_member_profile"`
	ReleaseVersionID        *int64     `json:"release_version_id"`
	ConfirmedBy             *int64     `json:"confirmed_by"`
	ConfirmedAt             *time.Time `json:"confirmed_at"`
	CreatedBy               *int64     `json:"created_by"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedBy               *int64     `json:"updated_by"`
	UpdatedAt               time.Time  `json:"updated_at"`
	RoleCodes               []string   `json:"role_codes"`
	RoleLabels              []string   `json:"role_labels"`
}

// AnimeContributionInput holds the data required to create a new anime contribution.
type AnimeContributionInput struct {
	MemberID                int64
	RoleCodes               []string
	Status                  string // "draft" | "proposed" | "confirmed" | "disputed" | "hidden"; leer => "draft"
	StartedYear             *int
	EndedYear               *int
	Note                    *string
	IsPublicOnAnimePage     bool
	IsPublicOnMemberProfile bool
	ReleaseVersionID        *int64 // nil => anime-weit; gesetzt => versions-spezifisch (Phase 67-02)
	CreatedBy               *int64
}

// AnimeContributionPatchInput holds optional fields for patching an existing anime contribution.
// Pointer-to-pointer fields represent nullable values: nil = do not update, non-nil = update (inner pointer may be nil to set NULL).
type AnimeContributionPatchInput struct {
	RoleCodes               *[]string
	StartedYear             **int
	EndedYear               **int
	Note                    **string
	IsPublicOnAnimePage     *bool
	IsPublicOnMemberProfile *bool
	ReleaseVersionID        **int64 // nil = nicht aendern, *nil = auf NULL, *wert = setzen (D-10)
	Status                  *string
	UpdatedBy               *int64
}
