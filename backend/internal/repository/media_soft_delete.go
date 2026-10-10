package repository

import (
	"context"
	"fmt"
)

// execSoftDelete runs a single soft-delete UPDATE against a trusted,
// call-site-literal SQL string and translates the result into the
// not-found-vs-success contract shared by every soft-delete method on
// *MediaRepository: zero affected rows means the relation was already
// deleted or never existed, surfaced as ErrNotFound; any other case is
// success.
//
// query (and the table name / WHERE-clause column names embedded within
// it) must always be a Go string literal written directly at each call
// site -- never built from request- or caller-supplied values. This is a
// security-critical invariant (SQL injection via table-name interpolation
// is the exact threat this shared helper must not introduce, see
// 179-RESEARCH.md Security Domain / T-179-09).
//
// errContext carries the call-site-specific error-wrap text so each of
// the two existing public methods keeps its own distinct error message
// unchanged.
func (r *MediaRepository) execSoftDelete(ctx context.Context, query string, errContext string, args ...interface{}) error {
	tag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("%s: %w", errContext, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
