package repository

import (
	"errors"
	"fmt"
)

var ErrConflict = errors.New("conflict")
var ErrValidation = errors.New("validation")
var ErrForbidden = errors.New("forbidden")
var ErrMemberProfileRequired = errors.New("member profile required")
var ErrInvalidAnimeFansubContext = errors.New("invalid anime fansub context")
var ErrInvalidReleaseVersionContributorContext = errors.New("invalid release version contributor context")

// ErrInvalidReleaseVersionContext (D-31) wird zurückgegeben, wenn ein Client-seitig
// angegebenes related_release_version_id entweder zu einem ANDEREN Projekt gehört als das
// gleichzeitig übergebene related_anime_id, oder die Zielgruppe laut release_version_groups
// gar nicht an diesem Release beteiligt ist -- derselbe ASVS-L1-Grundsatz wie
// ErrInvalidAnimeFansubContext (D-23), nur eine Ebene tiefer (Release statt Projekt).
var ErrInvalidReleaseVersionContext = errors.New("invalid release version context")

// ErrGroupHasDependents (Phase 187, D-07/D-08) is returned when a
// release-version-group removal is blocked because the removed group still
// has real credit/media/note dependents. GroupHasDependentsError carries the
// DependencySummary that produced the block for callers that need it.
var ErrGroupHasDependents = errors.New("release version group has dependents")

// ErrReleaseVersionGroupsEmpty (Phase 187, D-06/D-14) is returned when a
// release-version-group patch would reduce a release version from one or
// more groups down to zero groups -- a release version must always keep at
// least one group.
var ErrReleaseVersionGroupsEmpty = errors.New("release version groups would become empty")

// ConflictOwnerError is returned when a normalized Kürzel/Alias value already belongs
// to a DIFFERENT fansub group, so the caller can respond with an owner-named 409
// instead of a generic conflict (GAP-05, quick-260924-dso).
type ConflictOwnerError struct {
	OwnerGroupID   int64
	OwnerGroupName string
}

func (e *ConflictOwnerError) Error() string {
	return fmt.Sprintf("normalized value already belongs to fansub group %d (%s)", e.OwnerGroupID, e.OwnerGroupName)
}

// GroupHasDependentsError is returned when a release-version-group removal is
// blocked (Phase 187, D-07/D-08) because the removed fansub group still has
// real credit, media, or note dependents. Error() is an internal Go string
// only -- the German user-facing message is built separately by the handler
// code in Plan 02/03 from the Summary field, not from this method.
type GroupHasDependentsError struct {
	FansubGroupID int64
	Summary       DependencySummary
}

func (e *GroupHasDependentsError) Error() string {
	return fmt.Sprintf("fansub group %d has dependents: %+v", e.FansubGroupID, e.Summary)
}

func (e *GroupHasDependentsError) Unwrap() error {
	return ErrGroupHasDependents
}

// ErrFansubGroupHasDependents (Phase 189, D-12) is returned when a whole
// fansub group deletion is blocked because the group still has real
// dependents in any of countFansubGroupDependents' 19 counted categories.
// Parallels ErrGroupHasDependents above, which blocks removing a group from
// a single release version -- this blocks removing the group entirely.
var ErrFansubGroupHasDependents = errors.New("fansub group has dependents")

// FansubGroupHasDependentsError carries the FansubGroupDependencySummary
// that produced the block, for callers (the DeleteFansub handler) that need
// to build a German, per-category 409 message from it. Error() is an
// internal Go string only -- the German user-facing message is built
// separately by the handler from the Summary field.
type FansubGroupHasDependentsError struct {
	FansubGroupID int64
	Summary       FansubGroupDependencySummary
}

func (e *FansubGroupHasDependentsError) Error() string {
	return fmt.Sprintf("fansub group %d has dependents: %+v", e.FansubGroupID, e.Summary)
}

func (e *FansubGroupHasDependentsError) Unwrap() error {
	return ErrFansubGroupHasDependents
}
