package handlers

import (
 "encoding/json"
 "errors"
 "os"
 "path/filepath"
 "reflect"
 "slices"
 "strings"
 "testing"

 "team4s.v3/backend/internal/models"
)

func jellyfinSourceTestItem(t *testing.T, raw string) jellyfinEpisodeItem {
 t.Helper()
 var item jellyfinEpisodeItem
 if err := json.Unmarshal([]byte(raw), &item); err != nil { t.Fatal(err) }
 return item
}

const jellyfinCoherentSourceFixture = `{
 "Id":"item","Path":"/fixture/a.mkv","Container":"poison","RunTimeTicks":9990000000,
 "MediaStreams":[{"Index":0,"Type":"Audio","Codec":"poison","Language":"eng"}],
 "MediaSources":[
 {"Id":"b","Path":"/fixture/b.mp4","Container":"mp4","RunTimeTicks":200000000,"MediaStreams":[{"Index":0,"Type":"Video","Codec":"hevc"},{"Index":1,"Type":"Audio","Codec":"aac","Language":"deu"},{"Index":2,"Type":"Subtitle","Codec":"srt","Language":"eng"}]},
 {"Id":"a","Path":"/fixture/a.mkv","Container":"mkv","RunTimeTicks":100000000,"DefaultAudioStreamIndex":3,"MediaStreams":[{"Index":4,"Type":"Audio","Codec":"opus","Language":"eng","IsDefault":true},{"Index":2,"Type":"Subtitle","Codec":"ass","Language":"deu","DisplayTitle":"Deutsch","IsForced":true},{"Index":3,"Type":"Audio","Codec":"flac","Language":"jpn"},{"Index":0,"Type":"Video","Codec":"h264","Height":1080}]}
 ]}`

func TestResolveJellyfinMediaSource_CoherentAndReordered(t *testing.T) {
 item := jellyfinSourceTestItem(t,jellyfinCoherentSourceFixture)
 expected,err := resolveJellyfinMediaSource(item,nil)
 if err != nil { t.Fatal(err) }
 s := expected.Snapshot
 if expected.JellyfinItemID != "item" || s.MediaSourceID != "a" || s.SourcePath != item.Path || expected.FileName != "a.mkv" || derefString(expected.Container) != "mkv" || derefString(expected.VideoCodec) != "h264" || derefString(expected.AudioCodec) != "flac" || derefString(expected.VideoQuality) != "1080p" || expected.DurationSeconds == nil || *expected.DurationSeconds != 10 || *s.SelectedAudioIndex != 3 || derefString(s.AudioTracks[0].Language) != "ja" || derefString(s.SubtitleTracks[0].Language) != "de" { t.Fatalf("incoherent source: %+v snapshot=%+v",expected,s) }
 for n:=0;n<4;n++ {
  slices.Reverse(item.MediaSources)
  for i:=range item.MediaSources { slices.Reverse(item.MediaSources[i].MediaStreams) }
  actual,err:=resolveJellyfinMediaSource(item,nil)
  if err != nil || !reflect.DeepEqual(actual,expected) { t.Fatalf("order changed source: %+v / %v",actual,err) }
 }
}

func TestResolveJellyfinMediaSource_BindingRules(t *testing.T) {
 tests:=[]struct{name, raw string; stored *models.JellyfinSourceSnapshot; wantID, conflict string}{
 {"stored ID wins",jellyfinCoherentSourceFixture,&models.JellyfinSourceSnapshot{MediaSourceID:"b",SourcePath:"/fixture/a.mkv"},"b",""},
 {"stored full path recovers",jellyfinCoherentSourceFixture,&models.JellyfinSourceSnapshot{MediaSourceID:"old",SourcePath:" /fixture\\a.mkv "},"a",""},
 {"lost stored binding",jellyfinCoherentSourceFixture,&models.JellyfinSourceSnapshot{MediaSourceID:"old",SourcePath:"/gone/a.mkv"},"","missing"},
 {"empty stored binding",jellyfinCoherentSourceFixture,&models.JellyfinSourceSnapshot{},"","missing"},
 {"case sensitive stored path",jellyfinCoherentSourceFixture,&models.JellyfinSourceSnapshot{MediaSourceID:"old",SourcePath:"/Fixture/a.mkv"},"","missing"},
 {"ambiguous item path",`{"Id":"item","Path":"/a","MediaSources":[{"Id":"a","Path":"/a"},{"Id":"b","Path":"/a"}]}`,nil,"","ambiguous"},
 {"ambiguous stored path",`{"Id":"item","MediaSources":[{"Id":"a","Path":"/a"},{"Id":"b","Path":"/a"}]}`,&models.JellyfinSourceSnapshot{SourcePath:"/a"},"","ambiguous"},
 {"duplicate IDs",`{"Id":"item","Path":"/a","MediaSources":[{"Id":"a","Path":"/a"},{"Id":"a","Path":"/b"}]}`,nil,"","ambiguous"},
 {"missing source",`{"Id":"item","MediaSources":[]}`,nil,"","missing"},
 {"missing item",`{"MediaSources":[{"Id":"a"}]}`,nil,"","missing"},
 {"missing identity",`{"Id":"item","MediaSources":[{"Path":"/a"}]}`,nil,"","missing"},
 {"sole valid source",`{"Id":"item","Path":"/other","MediaSources":[{"Id":"a","Path":"/a"}]}`,nil,"a",""},
 {"lost stored sole different source",`{"Id":"item","Path":"/b","MediaSources":[{"Id":"b","Path":"/b"}]}`,&models.JellyfinSourceSnapshot{MediaSourceID:"a",SourcePath:"/a"},"","missing"},
 {"no basename matching",`{"Id":"item","Path":"/a/x.mkv","MediaSources":[{"Id":"a","Path":"/b/x.mkv"},{"Id":"b","Path":"/b/z.mkv"}]}`,nil,"","ambiguous"},
 }
 for _,tt:=range tests { t.Run(tt.name,func(t *testing.T){
  got,err:=resolveJellyfinMediaSource(jellyfinSourceTestItem(t,tt.raw),tt.stored)
  if tt.conflict!="" {
   var conflict *jellyfinMediaSourceConflict
   if !errors.As(err,&conflict) || conflict.Kind!=tt.conflict { t.Fatalf("want %s conflict, got %+v / %v",tt.conflict,got,err) }
  } else if err!=nil || got.Snapshot.MediaSourceID!=tt.wantID { t.Fatalf("want %s, got %+v / %v",tt.wantID,got,err) }
 }) }
}

func TestResolveJellyfinMediaSource_StreamsPresenceAndLanguages(t *testing.T) {
 for _,tt:=range []struct{raw,want string}{
  {"jpn","ja"},{"deu","de"},{"ger","de"},{"eng","en"},{"en-US","en"},{"und",""},{"",""},{"   ",""},{"bad-language!",""},{"en-XYZINVALID",""},{"und-Latn",""},{"x-private",""},
 } { t.Run("language="+tt.raw,func(t *testing.T){
  item:=jellyfinSourceTestItem(t,`{"Id":"item","MediaSources":[{"Id":"a","MediaStreams":[{"Index":1,"Type":"Audio","Codec":"aac"},{"Index":2,"Type":"Subtitle","Codec":"ass"}]}]}`)
  for i:=range item.MediaSources[0].MediaStreams { item.MediaSources[0].MediaStreams[i].Language=tt.raw }
  got,err:=resolveJellyfinMediaSource(item,nil)
  if err!=nil { t.Fatal(err) }
  if len(got.Snapshot.SubtitleTracks)!=1 || derefString(got.Snapshot.SubtitleTracks[0].Language)!=tt.want || derefString(got.Snapshot.AudioTracks[0].Language)!=tt.want { t.Fatalf("language inferred/dropped: %+v",got.Snapshot) }
 }) }
 prior,err:=resolveJellyfinMediaSource(jellyfinSourceTestItem(t,jellyfinCoherentSourceFixture),nil)
 if err!=nil { t.Fatal(err) }
 for _,tt:=range []struct{name,raw string; complete bool; tracks int}{
  {"omitted",`{"Id":"item","MediaSources":[{"Id":"a"}]}`,false,2},
  {"null",`{"Id":"item","MediaSources":[{"Id":"a","MediaStreams":null}]}`,false,2},
  {"empty",`{"Id":"item","MediaSources":[{"Id":"a","MediaStreams":[]}]}`,true,0},
 } { t.Run(tt.name,func(t *testing.T){
  got,err:=resolveJellyfinMediaSource(jellyfinSourceTestItem(t,tt.raw),&prior.Snapshot)
  if err!=nil || got.Snapshot.StreamsComplete!=tt.complete || len(got.Snapshot.AudioTracks)!=tt.tracks { t.Fatalf("presence lost: %+v / %v",got,err) }
  if !tt.complete && !reflect.DeepEqual(got.Snapshot.AudioTracks,prior.Snapshot.AudioTracks) { t.Fatal("previous complete tracks erased") }
 }) }
 fresh,err:=resolveJellyfinMediaSource(jellyfinSourceTestItem(t,`{"Id":"item","MediaSources":[{"Id":"a"}]}`),nil)
 if err!=nil || fresh.Snapshot.StreamsComplete || len(fresh.Snapshot.AudioTracks)!=0 || len(fresh.Snapshot.SubtitleTracks)!=0 { t.Fatalf("fabricated absent data: %+v %v",fresh,err) }
}

func TestResolveJellyfinMediaSource_AudioSelectionAndInvalidIndex(t *testing.T) {
 item:=jellyfinSourceTestItem(t,jellyfinCoherentSourceFixture)
 source:=&item.MediaSources[1]
 source.DefaultAudioStreamIndex=nil
 got,err:=resolveJellyfinMediaSource(item,nil)
 if err!=nil || *got.Snapshot.SelectedAudioIndex!=4 || derefString(got.AudioCodec)!="opus" { t.Fatalf("default: %+v %v",got,err) }
 source.MediaStreams[2].IsDefault=true
 got,err=resolveJellyfinMediaSource(item,nil)
 if err!=nil || *got.Snapshot.SelectedAudioIndex!=3 { t.Fatalf("lowest default: %+v %v",got,err) }
 for i:=range source.MediaStreams { source.MediaStreams[i].IsDefault=false }
 invalid:=int32(2)
 source.DefaultAudioStreamIndex=&invalid // subtitle index is not an audio default
 got,err=resolveJellyfinMediaSource(item,nil)
 if err!=nil || *got.Snapshot.SelectedAudioIndex!=3 { t.Fatalf("lowest audio: %+v %v",got,err) }
 malformed:=jellyfinSourceTestItem(t,`{"Id":"item","MediaSources":[{"Id":"a","MediaStreams":[{"Type":"Audio","Codec":"bad"},{"Index":-1,"Type":"Subtitle","Codec":"ass"},{"Index":0,"Type":"Audio","Codec":"valid"}]}]}`)
 got,err=resolveJellyfinMediaSource(malformed,nil)
 if err!=nil || len(got.Snapshot.AudioTracks)!=1 || len(got.Snapshot.SubtitleTracks)!=0 || *got.Snapshot.SelectedAudioIndex!=0 { t.Fatalf("invalid indices: %+v %v",got,err) }
 duplicate:=jellyfinSourceTestItem(t,`{"Id":"item","MediaSources":[{"Id":"a","MediaStreams":[{"Index":1,"Type":"Audio","Codec":"a"},{"Index":1,"Type":"Audio","Codec":"b"}]}]}`)
 if _,err=resolveJellyfinMediaSource(duplicate,nil); err==nil { t.Fatal("duplicate track indices selected by order") }
}

func read11eyesSourceFixture(t *testing.T,name string) jellyfinEpisodeListResponse {
 t.Helper()
 path:=filepath.Join("..","..","..","docs","audits","2026-09-15-jellyfin12","fixtures",name+".json")
 raw,err:=os.ReadFile(path)
 if err!=nil { t.Fatal(err) }
 var response jellyfinEpisodeListResponse
 if err=json.Unmarshal(raw,&response);err!=nil { t.Fatal(err) }
 return response
}

func Test11eyesSourceSelection_AllActualItemsAndPermutations(t *testing.T) {
 for _,tt:=range []struct{name string; items,sources,nonItems int}{
  {"11eyes-episode1",3,3,0},{"11eyes-series",27,38,11},
 } { t.Run(tt.name,func(t *testing.T){
  payload:=read11eyesSourceFixture(t,tt.name)
  if len(payload.Items)!=tt.items { t.Fatalf("items=%d",len(payload.Items)) }
  itemIDs,sourceIDs,ownPaths:=map[string]bool{},map[string]bool{},map[string]bool{}
  for _,item:=range payload.Items {
   if itemIDs[item.ID] { t.Fatal("duplicate item") };itemIDs[item.ID]=true
   for _,source:=range item.MediaSources { sourceIDs[source.ID]=true }
   chosen,err:=resolveJellyfinMediaSource(item,nil)
   if err!=nil || chosen.Snapshot.SourcePath!=item.Path || chosen.JellyfinItemID!=item.ID { t.Fatalf("own source mismatch: %+v %v",chosen,err) }
   if ownPaths[chosen.Snapshot.SourcePath] { t.Fatal("duplicated own file") };ownPaths[chosen.Snapshot.SourcePath]=true
   item.MediaStreams=[]jellyfinMediaStream{{Index:0,Type:"Audio",Codec:"poison"}}
   forEachJellyfinSourceOrder(item.MediaSources,func(order []jellyfinMediaSource){
    item.MediaSources=order
    for i:=range item.MediaSources { slices.Reverse(item.MediaSources[i].MediaStreams) }
    got,err:=resolveJellyfinMediaSource(item,nil)
    if err!=nil || !reflect.DeepEqual(got,chosen) { t.Fatalf("real fixture reordered: %+v / %v",got,err) }
   })
   if strings.Contains(item.Path,"FlameHazeSubs") && (len(chosen.Snapshot.AudioTracks)!=1 || chosen.Snapshot.AudioTracks[0].Language!=nil || len(chosen.Snapshot.SubtitleTracks)!=0 || derefString(chosen.Container)!="mp4" || derefString(chosen.AudioCodec)!="aac") { t.Fatalf("FHS unknown/raw metadata changed: %+v",chosen) }
  }
  nonItems:=0
  for id:=range sourceIDs { if !itemIDs[id] { nonItems++ } }
  if len(sourceIDs)!=tt.sources || nonItems!=tt.nonItems || len(ownPaths)!=tt.items { t.Fatalf("inventory items=%d sources=%d non-items=%d",len(ownPaths),len(sourceIDs),nonItems) }
 }) }
}


// Visit every permutation, not merely two reversals of a three-source array.
func forEachJellyfinSourceOrder(sources []jellyfinMediaSource,visit func([]jellyfinMediaSource)) {
 order:=slices.Clone(sources)
 var permute func(int)
 permute=func(i int) {
  if i==len(order) { visit(slices.Clone(order)); return }
  for j:=i;j<len(order);j++ {
   order[i],order[j]=order[j],order[i]
   permute(i+1)
   order[i],order[j]=order[j],order[i]
  }
 }
 permute(0)
}

func TestResolveJellyfinMediaSource_IncompleteTracksStayOnStoredBinding(t *testing.T) {
 previous,err:=resolveJellyfinMediaSource(jellyfinSourceTestItem(t,jellyfinCoherentSourceFixture),nil)
 if err!=nil { t.Fatal(err) }
 changed:=jellyfinSourceTestItem(t,`{"Id":"item","Path":"/fixture/b.mp4","MediaSources":[{"Id":"b","Path":"/fixture/b.mp4"}]}`)
 if _,err=resolveJellyfinMediaSource(changed,&previous.Snapshot);err==nil { t.Fatal("A tracks transferred onto incomplete B") }
 changed.MediaSources[0].ID="new-a"
 changed.MediaSources[0].Path="/fixture/a.mkv"
 recovered,err:=resolveJellyfinMediaSource(changed,&previous.Snapshot)
 if err!=nil || recovered.Snapshot.MediaSourceID!="new-a" || recovered.Snapshot.StreamsComplete || !reflect.DeepEqual(recovered.Snapshot.AudioTracks,previous.Snapshot.AudioTracks) { t.Fatalf("same-path incomplete recovery: %+v %v",recovered,err) }
}
