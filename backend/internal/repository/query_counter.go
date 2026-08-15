package repository

import (
	"context"
	"sync/atomic"

	"github.com/jackc/pgx/v5"
)

// queryCounter is a TEST-SUPPORT-ONLY pgx.QueryTracer that counts how many SQL
// queries a code path issues against a pool. It is NOT wired into any production
// request path -- it exists solely so characterization/budget tests (Phase 131,
// PMPF-01/PMPF-07) can observe the exact query count of a single
// GetPublicMemberProfileByID call and prove the constant-query-budget gate once it
// lands (131-03).
//
// Usage in tests:
//
//	counter := &queryCounter{}
//	config, _ := pgxpool.ParseConfig(dsn)
//	config.ConnConfig.Tracer = counter
//	pool, _ := pgxpool.NewWithConfig(ctx, config)
//	counter.reset()
//	_, _ = repo.GetPublicMemberProfileByID(ctx, memberID)
//	got := counter.count() // number of queries issued by that single call
//
// Because pgxpool opens one physical connection per pooled conn and pgx invokes the
// connection's Tracer on every Query/QueryRow/Exec, a single shared counter observes
// all queries issued through the pool. Tests reset() immediately before the measured
// call so setup/seed traffic is excluded.
type queryCounter struct {
	queries atomic.Int64
}

// TraceQueryStart increments the counter once per issued query and returns the context
// unchanged. Every pgx Query/QueryRow/Exec triggers exactly one TraceQueryStart, so the
// counter equals the number of round-trips the traced code path made.
func (c *queryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn, _ pgx.TraceQueryStartData) context.Context {
	c.queries.Add(1)
	return ctx
}

// TraceQueryEnd is required to satisfy pgx.QueryTracer but is intentionally a no-op:
// counting starts is sufficient to measure query volume.
func (c *queryCounter) TraceQueryEnd(_ context.Context, _ *pgx.Conn, _ pgx.TraceQueryEndData) {}

// reset zeroes the counter so a subsequent measurement excludes prior (seed/setup) traffic.
func (c *queryCounter) reset() {
	c.queries.Store(0)
}

// count returns the number of queries observed since the last reset (or since construction).
func (c *queryCounter) count() int {
	return int(c.queries.Load())
}

// Compile-time assertion that queryCounter satisfies the pgx.QueryTracer contract.
var _ pgx.QueryTracer = (*queryCounter)(nil)
