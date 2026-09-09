package repository

// Opt-in, read-only RCA instrumentation for the real DEV dataset.
// Unlike fixture tests this never seeds, resets, migrates or changes database rows.
import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type publicAuditQuery struct {
	SQL        string   `json:"sql"`
	Args       []any    `json:"args"`
	Caller     []string `json:"caller"`
	StartMS    float64  `json:"start_ms"`
	DurationMS float64  `json:"duration_ms"`
	Rows       int64    `json:"rows"`
	Error      string   `json:"error,omitempty"`
}
type publicAuditTracer struct {
	Origin  time.Time
	Queries []*publicAuditQuery
}
type publicAuditKey struct{}

func (a *publicAuditTracer) TraceQueryStart(ctx context.Context, _ *pgx.Conn, d pgx.TraceQueryStartData) context.Context {
	q := &publicAuditQuery{SQL: d.SQL, Args: d.Args, StartMS: float64(time.Since(a.Origin).Microseconds()) / 1000}
	var pcs [30]uintptr
	n := runtime.Callers(2, pcs[:])
	frames := runtime.CallersFrames(pcs[:n])
	for {
		f, more := frames.Next()
		if strings.Contains(f.Function, "repository.") && !strings.Contains(f.Function, "publicAudit") {
			q.Caller = append(q.Caller, f.Function)
		}
		if !more {
			break
		}
	}
	a.Queries = append(a.Queries, q)
	return context.WithValue(ctx, publicAuditKey{}, struct {
		Q     *publicAuditQuery
		Start time.Time
	}{q, time.Now()})
}
func (a *publicAuditTracer) TraceQueryEnd(ctx context.Context, _ *pgx.Conn, d pgx.TraceQueryEndData) {
	v := ctx.Value(publicAuditKey{}).(struct {
		Q     *publicAuditQuery
		Start time.Time
	})
	v.Q.DurationMS = float64(time.Since(v.Start).Microseconds()) / 1000
	v.Q.Rows = d.CommandTag.RowsAffected()
	if d.Err != nil {
		v.Q.Error = d.Err.Error()
	}
}
func TestPublicMemberPerformanceAudit(t *testing.T) {
	if os.Getenv("TEAM4S_PUBLIC_PERF_AUDIT") != "1" {
		t.Skip("opt-in read-only real dataset audit")
	}
	ctx := context.Background()
	cfg, err := pgxpool.ParseConfig(os.Getenv("DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["default_transaction_read_only"] = "on"
	cfg.MaxConns = 1
	tracer := &publicAuditTracer{}
	cfg.ConnConfig.Tracer = tracer
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if err = pool.Ping(ctx); err != nil {
		t.Fatal(err)
	}
	member := NewMemberProfileRepository(pool, "")
	group := NewFansubRepository(pool)
	projection := NewDomainProjectionRepository(pool)
	type auditRun struct {
		Case      string              `json:"case"`
		Iteration int                 `json:"iteration"`
		TotalMS   float64             `json:"total_ms"`
		MarshalMS float64             `json:"marshal_ms"`
		Bytes     int                 `json:"bytes"`
		Queries   []*publicAuditQuery `json:"queries"`
	}
	var runs []auditRun
	cases := []struct {
		Name string
		Load func() (any, error)
	}{
		{"member-timer", func() (any, error) { return member.GetPublicMemberProfile(ctx, "timer") }},
		{"member-kara", func() (any, error) { return member.GetPublicMemberProfile(ctx, "kara") }},
		{"member-type", func() (any, error) { return member.GetPublicMemberProfile(ctx, "type") }},
		{"group-new-subs", func() (any, error) { return group.GetPublicProfileBySlug(ctx, "new-subs") }},
		{"group-domain-projection", func() (any, error) { return projection.GetFansubGroupDomainProjection(ctx, 1) }},
	}
	for _, c := range cases {
		for i := 0; i < 7; i++ {
			tracer.Queries = nil
			tracer.Origin = time.Now()
			value, err := c.Load()
			if err != nil {
				t.Fatalf("%s: %v", c.Name, err)
			}
			total := float64(time.Since(tracer.Origin).Microseconds()) / 1000
			start := time.Now()
			data, err := json.Marshal(value)
			if err != nil {
				t.Fatal(err)
			}
			runs = append(runs, auditRun{c.Name, i, total, float64(time.Since(start).Microseconds()) / 1000, len(data), tracer.Queries})
			t.Logf("%s iteration=%d queries=%d load=%.3fms bytes=%d", c.Name, i, len(tracer.Queries), total, len(data))
		}
	}
	type explainRow struct {
		Case  string          `json:"case"`
		Index int             `json:"index"`
		Plan  json.RawMessage `json:"plan"`
	}
	var plans []explainRow
	for _, run := range runs {
		if run.Iteration != 6 {
			continue
		}
		for i, q := range run.Queries {
			var plan []byte
			if err := pool.QueryRow(ctx, "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) "+q.SQL, q.Args...).Scan(&plan); err != nil {
				t.Fatalf("explain %s %d: %v", run.Case, i, err)
			}
			plans = append(plans, explainRow{run.Case, i, plan})
		}
	}
	result := struct {
		ReadOnly bool         `json:"read_only"`
		Runs     []auditRun   `json:"runs"`
		Plans    []explainRow `json:"plans"`
	}{true, runs, plans}
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	path := os.Getenv("TEAM4S_PUBLIC_PERF_AUDIT_OUTPUT")
	if path == "" {
		path = "/tmp/public-member-backend-audit.json"
	}
	if err = os.WriteFile(path, append(data, '\n'), 0600); err != nil {
		t.Fatal(err)
	}
	fmt.Println("Read-only audit written:", path)
}
