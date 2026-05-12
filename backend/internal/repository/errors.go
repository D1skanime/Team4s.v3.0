package repository

import "errors"

var ErrConflict = errors.New("conflict")
var ErrInvalidAnimeFansubContext = errors.New("invalid anime fansub context")
var ErrInvalidReleaseVersionContributorContext = errors.New("invalid release version contributor context")
