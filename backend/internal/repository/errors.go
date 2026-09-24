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
