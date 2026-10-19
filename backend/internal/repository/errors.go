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
