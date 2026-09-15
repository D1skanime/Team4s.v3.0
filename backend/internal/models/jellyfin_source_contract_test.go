package models

import (
 "encoding/json"
 "reflect"
 "testing"
)

func TestJellyfinSourceContractCandidateRoundTrip(t *testing.T) {
 fixture := []byte(`{"media_item_id":"11eyes-item","media_source_id":"source-b","file_name":"11eyes.mkv","path":"/fixture/11eyes.mkv","container":"mkv","streams_complete":true,"selected_audio_index":1,"audio_tracks":[{"index":1,"codec":"flac","language":null,"default":true}],"subtitle_tracks":[]}`)
 var candidate EpisodeImportMediaCandidate
 if err := json.Unmarshal(fixture, &candidate); err != nil { t.Fatal(err) }
 raw, _ := json.Marshal(candidate)
 var want, got map[string]any
 json.Unmarshal(fixture, &want); json.Unmarshal(raw, &got)
 for key, value := range want { if !reflect.DeepEqual(got[key], value) { t.Errorf("%s = %#v; want %#v", key, got[key], value) } }
 var mapping EpisodeImportMappingRow
 json.Unmarshal(fixture, &mapping); raw, _ = json.Marshal(mapping)
 got = nil; json.Unmarshal(raw, &got)
 if got["media_item_id"] != "11eyes-item" || got["media_source_id"] != "source-b" { t.Fatalf("lost source identity: %s", raw) }
}

func TestJellyfinSourceContractIncompleteAndLegacy(t *testing.T) {
 var candidate EpisodeImportMediaCandidate
 json.Unmarshal([]byte(`{"media_item_id":"legacy","file_name":"old.mkv","path":"/fixture/old.mkv"}`), &candidate)
 raw, _ := json.Marshal(candidate)
 var got map[string]any; json.Unmarshal(raw, &got)
 if got["streams_complete"] != false || got["audio_tracks"] != nil || got["subtitle_tracks"] != nil || got["selected_audio_index"] != nil { t.Fatalf("fabricated metadata: %s", raw) }
 for _, value := range []any{EpisodeVersion{}, EpisodeVersionMediaFile{}} {
  raw, _ := json.Marshal(value); var fields map[string]any; json.Unmarshal(raw, &fields)
  if fields["media_source_id"] != nil { t.Fatalf("fabricated legacy binding: %s", raw) }
 }
}

func TestJellyfinSourceContractPatchSelectorPresence(t *testing.T) {
 source := "source-b"
 for _, fixture := range []struct { raw string; set bool; value *string }{
  {`{}`, false, nil}, {`{"media_source_id":null}`, true, nil}, {`{"media_source_id":"source-b"}`, true, &source},
 } {
  var patch EpisodeVersionPatchInput
  if err := json.Unmarshal([]byte(fixture.raw), &patch); err != nil { t.Fatal(err) }
  field := reflect.ValueOf(patch).FieldByName("MediaSourceID")
  if !field.IsValid() { t.Fatal("patch missing MediaSourceID") }
  selector, ok := field.Interface().(OptionalString)
  if !ok || selector.Set != fixture.set || !reflect.DeepEqual(selector.Value, fixture.value) { t.Fatalf("selector presence: %s => %#v", fixture.raw, selector) }
 }
}

func TestJellyfinSourceContractHydrationIsServerOnly(t *testing.T) {
 for _, target := range []any{&EpisodeVersionCreateInput{}, &EpisodeVersionPatchInput{}} {
  raw := []byte(`{"JellyfinSource":{"version":1,"media_source_id":"forged"},"jellyfin_source":{"version":1,"media_source_id":"forged"},"Container":"forged","VideoCodec":"forged","AudioCodec":"forged","FileName":"forged"}`)
  if err := json.Unmarshal(raw, target); err != nil { t.Fatal(err) }
  value := reflect.ValueOf(target).Elem()
  for _, name := range []string{"JellyfinSource","Container","VideoCodec","AudioCodec","FileName"} {
   field, ok := value.Type().FieldByName(name)
   if !ok { t.Errorf("%T missing %s", target, name); continue }
   if field.Tag.Get("json") != "-" || !value.FieldByName(name).IsZero() { t.Errorf("%T.%s is JSON-bindable", target, name) }
  }
 }
 for _, name := range []string{"MediaSourceID","JellyfinSource"} {
  field, ok := reflect.TypeOf(ReleaseStreamSource{}).FieldByName(name)
  if !ok || field.Tag.Get("json") != "-" { t.Errorf("internal field %s exposes JSON", name) }
 }
}
