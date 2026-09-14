package repository_test
import ("testing";"fmt")
func TestPhase159InitialPublicBudget(t *testing.T) {
 pool,tr := openEpisodeVersionPublicFixture(t)
 for _, limit := range []int{24,100} {
  tr.reset()
  raw,page := episodePublicRequest(t,pool,fmt.Sprintf("/anime/4/episodes?projection=public&limit=%d",limit),200)
  assertPublicBudget(t,tr,limit)
  rows:=0
  for _, episode := range page.Data.Episodes { if len(episode.Versions)==0 { rows++ } else { rows+=len(episode.Versions) } }
  t.Logf("PUBLIC_INITIAL limit=%d atomic_rows=%d bytes=%d has_more=%v",limit,rows,len(raw),page.Data.Pagination.HasMore)
 }
}
