package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"team4s.v3/backend/internal/repository"
)

type pointTestRow struct{ scan func(...any) error }
func (r pointTestRow) Scan(dest ...any) error { return r.scan(dest...) }

type pointTestDB struct {
	rows []pgx.Row
	args [][]any
}
func (d *pointTestDB) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) { return pgconn.CommandTag{}, nil }
func (d *pointTestDB) QueryRow(_ context.Context, _ string, args ...any) pgx.Row {
	d.args = append(d.args, args)
	r := d.rows[0]; d.rows = d.rows[1:]; return r
}

func ruleRow(id int64, code string, version, value int, category string) pgx.Row {
	return pointTestRow{scan: func(d ...any) error {
		*d[0].(*int64), *d[1].(*string), *d[2].(*int), *d[3].(*string), *d[4].(*int), *d[5].(*time.Time) = id, code, version, category, value, time.Now()
		return nil
	}}
}

func awardRow(input repository.PointAwardInput) pgx.Row {
	return ledgerRow(repository.PointLedgerEntry{ID: 9, MemberID: input.MemberID, ActorAppUserID: input.ActorAppUserID, FansubGroupID: input.FansubGroupID, ReleaseVersionID: input.ReleaseVersionID, SourceType: input.SourceType, SourceKey: input.SourceKey, RuleID: input.RuleID, RuleCodeSnapshot: input.RuleCode, RuleVersionSnapshot: input.RuleVersion, RuleCategorySnapshot: input.RuleCategory, RulePointValueSnapshot: input.RulePointValue, PointValue: input.RulePointValue, EntryKind: "award", EffectiveAt: input.EffectiveAt, RecordedAt: time.Now(), IdempotencyKey: input.IdempotencyKey})
}

func ledgerRow(e repository.PointLedgerEntry) pgx.Row {
	return pointTestRow{scan: func(d ...any) error {
		*d[0].(*int64)=e.ID; *d[1].(*int64)=e.MemberID; *d[2].(**int64)=e.ActorAppUserID; *d[3].(**int64)=e.FansubGroupID; *d[4].(**int64)=e.ReleaseVersionID
		*d[5].(*string)=e.SourceType; *d[6].(*string)=e.SourceKey; *d[7].(*int64)=e.RuleID; *d[8].(*string)=e.RuleCodeSnapshot; *d[9].(*int)=e.RuleVersionSnapshot; *d[10].(*string)=e.RuleCategorySnapshot; *d[11].(*int)=e.RulePointValueSnapshot; *d[12].(*int)=e.PointValue; *d[13].(*string)=e.EntryKind; *d[14].(**int64)=e.ReversalOfEntryID; *d[15].(**string)=e.ReversalReason; *d[16].(*time.Time)=e.EffectiveAt; *d[17].(*time.Time)=e.RecordedAt; *d[18].(*string)=e.IdempotencyKey
		return nil
	}}
}

func validCredit() CreditCommand { return CreditCommand{MemberID: 42, Source: SourceRef{RewardKind: RewardKindWork, Type: "release", Key: "rv:17", Slot: "timing"}, Rule: RuleRef{Code: "timing", Version: 1}, EffectiveAt: time.Date(2026,7,22,12,0,0,0,time.UTC)} }

func TestPointServiceCreditValidation(t *testing.T) {
	cases := []func(*CreditCommand){
		func(c *CreditCommand){c.MemberID=0}, func(c *CreditCommand){c.EffectiveAt=time.Time{}}, func(c *CreditCommand){c.Rule.Code=""}, func(c *CreditCommand){c.Rule.Version=0},
		func(c *CreditCommand){c.Source.RewardKind=""}, func(c *CreditCommand){c.Source.RewardKind="other"}, func(c *CreditCommand){c.Source.Type=" x"}, func(c *CreditCommand){c.Source.Key="x|y"}, func(c *CreditCommand){c.Source.Slot=""},
	}
	for i, mutate := range cases { c:=validCredit(); mutate(&c); s:=NewPointService(nil); if _,err:=s.CreditInTx(context.Background(), &pointTestDB{}, c); !errors.Is(err, repository.ErrValidation) { t.Fatalf("case %d: %v",i,err) } }
}

func TestPointServiceCreditRuleRefIdempotencyInTx(t *testing.T) {
	cmd:=validCredit(); db:=&pointTestDB{}; db.rows=[]pgx.Row{ruleRow(3,"timing",1,7,"fansub_work")}
	want:=repository.PointAwardInput{MemberID:42, SourceType:"release", SourceKey:"rv:17", RuleID:3, RuleCode:"timing", RuleVersion:1, RuleCategory:"fansub_work", RulePointValue:7, EffectiveAt:cmd.EffectiveAt, IdempotencyKey:"v1|work|release|rv:17|beneficiary:42|slot:timing"}
	db.rows=append(db.rows, awardRow(want)); got,err:=NewPointService(nil).CreditInTx(context.Background(),db,cmd); if err!=nil {t.Fatal(err)}
	if got.IdempotencyKey!=want.IdempotencyKey || got.PointValue!=7 || len(db.args)!=2 {t.Fatalf("unexpected result: %+v args=%v",got,db.args)}
	if db.args[0][0]!="timing" || db.args[0][1]!=1 {t.Fatalf("wrong rule ref: %v",db.args[0])}
}

func TestPointServiceCreditIdempotencyAcrossRuleVersionsAndSlots(t *testing.T) {
	base:=validCredit(); key:=func(c CreditCommand) string { db:=&pointTestDB{rows:[]pgx.Row{ruleRow(3,c.Rule.Code,c.Rule.Version,7,"fansub_work")}}; input:=repository.PointAwardInput{MemberID:c.MemberID,SourceType:c.Source.Type,SourceKey:c.Source.Key,RuleID:3,RuleCode:c.Rule.Code,RuleVersion:c.Rule.Version,RuleCategory:"fansub_work",RulePointValue:7,EffectiveAt:c.EffectiveAt,IdempotencyKey:buildCreditIdempotencyKey(c)}; db.rows=append(db.rows,awardRow(input)); got,err:=NewPointService(nil).CreditInTx(context.Background(),db,c); if err!=nil {t.Fatal(err)}; return got.IdempotencyKey }
	k1:=key(base); v2:=base; v2.Rule.Version=2; if k1!=key(v2){t.Fatal("rule version changed key")}; slot:=base; slot.Source.Slot="translation"; if k1==key(slot){t.Fatal("slots collided")}; review:=base; review.Source.RewardKind=RewardKindReview; if k1==key(review){t.Fatal("reward kinds collided")}
}
