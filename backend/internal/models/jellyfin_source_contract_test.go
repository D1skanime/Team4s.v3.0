package models

import (
	"encoding/json"
	"reflect"
 "os"
 "path/filepath"
 "runtime"
 "strings"
 "gopkg.in/yaml.v3"
	"testing"
)

func TestJellyfinSourceContractCandidateRoundTrip(t *testing.T) {
	fixture := []byte(`{"media_item_id":"11eyes-item","media_source_id":"source-b","file_name":"11eyes.mkv","path":"/fixture/11eyes.mkv","container":"mkv","streams_complete":true,"selected_audio_index":1,"audio_tracks":[{"index":1,"codec":"flac","language":null,"default":true}],"subtitle_tracks":[]}`)
	var candidate EpisodeImportMediaCandidate
	if err := json.Unmarshal(fixture, &candidate); err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(candidate)
	var want, got map[string]any
	json.Unmarshal(fixture, &want)
	json.Unmarshal(raw, &got)
	for key, value := range want {
		if !reflect.DeepEqual(got[key], value) {
			t.Errorf("%s = %#v; want %#v", key, got[key], value)
		}
	}
	var mapping EpisodeImportMappingRow
	json.Unmarshal(fixture, &mapping)
	raw, _ = json.Marshal(mapping)
	got = nil
	json.Unmarshal(raw, &got)
	if got["media_item_id"] != "11eyes-item" || got["media_source_id"] != "source-b" {
		t.Fatalf("lost source identity: %s", raw)
	}
}

func TestJellyfinSourceContractIncompleteAndLegacy(t *testing.T) {
	var candidate EpisodeImportMediaCandidate
	json.Unmarshal([]byte(`{"media_item_id":"legacy","file_name":"old.mkv","path":"/fixture/old.mkv"}`), &candidate)
	raw, _ := json.Marshal(candidate)
	var got map[string]any
	json.Unmarshal(raw, &got)
	if got["streams_complete"] != false || got["audio_tracks"] != nil || got["subtitle_tracks"] != nil || got["selected_audio_index"] != nil {
		t.Fatalf("fabricated metadata: %s", raw)
	}
	for _, value := range []any{EpisodeVersion{}, EpisodeVersionMediaFile{}} {
		raw, _ := json.Marshal(value)
		var fields map[string]any
		json.Unmarshal(raw, &fields)
		if fields["media_source_id"] != nil {
			t.Fatalf("fabricated legacy binding: %s", raw)
		}
	}
}

func TestJellyfinSourceContractPatchSelectorPresence(t *testing.T) {
	source := "source-b"
	for _, fixture := range []struct {
		raw   string
		set   bool
		value *string
	}{
		{`{}`, false, nil}, {`{"media_source_id":null}`, true, nil}, {`{"media_source_id":"source-b"}`, true, &source},
	} {
		var patch EpisodeVersionPatchInput
		if err := json.Unmarshal([]byte(fixture.raw), &patch); err != nil {
			t.Fatal(err)
		}
		field := reflect.ValueOf(patch).FieldByName("MediaSourceID")
		if !field.IsValid() {
			t.Fatal("patch missing MediaSourceID")
		}
		selector, ok := field.Interface().(OptionalString)
		if !ok || selector.Set != fixture.set || !reflect.DeepEqual(selector.Value, fixture.value) {
			t.Fatalf("selector presence: %s => %#v", fixture.raw, selector)
		}
	}
}

func TestJellyfinSourceContractHydrationIsServerOnly(t *testing.T) {
	for _, target := range []any{&EpisodeVersionCreateInput{}, &EpisodeVersionPatchInput{}} {
		raw := []byte(`{"JellyfinSource":{"version":1,"media_source_id":"forged"},"jellyfin_source":{"version":1,"media_source_id":"forged"},"Container":"forged","VideoCodec":"forged","AudioCodec":"forged","FileName":"forged"}`)
		if err := json.Unmarshal(raw, target); err != nil {
			t.Fatal(err)
		}
		value := reflect.ValueOf(target).Elem()
		for _, name := range []string{"JellyfinSource", "Container", "VideoCodec", "AudioCodec", "FileName"} {
			field, ok := value.Type().FieldByName(name)
			if !ok {
				t.Errorf("%T missing %s", target, name)
				continue
			}
			if field.Tag.Get("json") != "-" || !value.FieldByName(name).IsZero() {
				t.Errorf("%T.%s is JSON-bindable", target, name)
			}
		}
	}
	for _, name := range []string{"MediaSourceID", "JellyfinSource"} {
		field, ok := reflect.TypeOf(ReleaseStreamSource{}).FieldByName(name)
		if !ok || field.Tag.Get("json") != "-" {
			t.Errorf("internal field %s exposes JSON", name)
		}
	}
}

func TestJellyfinSourceContractSchemas(t *testing.T) {
 _, current, _, _ := runtime.Caller(0)
 root := filepath.Clean(filepath.Join(filepath.Dir(current), "../../.."))
 read := func(name string) map[string]any {
  t.Helper()
  raw, err := os.ReadFile(filepath.Join(root, "shared/contracts", name)); if err != nil { t.Fatal(err) }
  // Focused legacy contracts include unrelated non-YAML prose. Parse only the
  // affected schema fragments, as the plan's contract gate requires.
  if name != "openapi.yaml" {
   selected := map[string]bool{"EpisodeImportMediaCandidate":true,"EpisodeImportMappingRow":true,"EpisodeVersion":true,"EpisodeVersionMediaFile":true,"EpisodeVersionCreateRequest":true,"EpisodeVersionPatchRequest":true}
   var fragment strings.Builder; fragment.WriteString("types:\n")
   active := false
   for _, line := range strings.Split(string(raw),"\n") {
    if strings.HasPrefix(line,"  ") && !strings.HasPrefix(line,"   ") { active = selected[strings.TrimSuffix(strings.TrimSpace(line),":")] }
    if !strings.HasPrefix(line," ") && strings.TrimSpace(line)!="" {active=false}
    if active {
     // Existing focused scalar annotations contain colon-space; quote them
     // only for parsing, preserving their exact string semantics.
     if strings.HasPrefix(line,"    ") && strings.Count(line,": ") > 1 {
      key, value, _ := strings.Cut(line,": "); encoded,_:=json.Marshal(value); line=key+": "+string(encoded)
     }
     fragment.WriteString(line+"\n")
    }
   }
   raw=[]byte(fragment.String())
  }
  var doc map[string]any; if err := yaml.Unmarshal(raw, &doc); err != nil { t.Fatalf("%s: %v",name,err) }; return doc
 }
 canonical, admin, editor := read("openapi.yaml"), read("admin-content.yaml"), read("episode-versions.yaml")
 cases := []struct{schema, tsFile, tsName string; focused map[string]any; fields []string}{
  {"EpisodeImportMediaCandidate", "episodeImport.ts", "EpisodeImportMediaCandidate", admin, []string{"media_source_id","container","streams_complete","selected_audio_index","audio_tracks","subtitle_tracks"}},
  {"EpisodeImportMappingRow", "episodeImport.ts", "EpisodeImportMappingRow", admin, []string{"media_source_id"}},
  {"EpisodeVersion","episodeVersion.ts","EpisodeVersion",editor,[]string{"media_source_id"}},
  {"EpisodeVersionMediaFile","episodeVersion.ts","EpisodeVersionMediaFile",editor,[]string{"media_source_id"}},
  {"EpisodeVersionCreateRequest","episodeVersion.ts","EpisodeVersionCreateRequest",editor,[]string{"media_source_id"}},
  {"EpisodeVersionPatchRequest","episodeVersion.ts","EpisodeVersionPatchRequest",editor,[]string{"media_source_id"}},
 }
 for _, tc := range cases { t.Run(tc.schema, func(t *testing.T) {
  props := jellyfinContractObject(t, canonical,"components","schemas",tc.schema,"properties")
  focused := jellyfinContractObject(t,tc.focused,"types",tc.schema)
  ts, err := os.ReadFile(filepath.Join(root,"frontend/src/types",tc.tsFile)); if err != nil {t.Fatal(err)}
  _, declaration, found := strings.Cut(string(ts),"export interface "+tc.tsName+" {")
  if !found { t.Fatal("missing TypeScript interface") }
  declaration, _, _ = strings.Cut(declaration,"\n}")
  for _, field := range tc.fields {
   if props[field] == nil || focused[field] == nil || !strings.Contains(declaration,"\n  "+field) {t.Errorf("missing aligned field %s",field)}
  }
 }) }
 candidate := jellyfinContractObject(t,canonical,"components","schemas","EpisodeImportMediaCandidate","properties")
 for _, field := range []string{"selected_audio_index","audio_tracks","subtitle_tracks"} {
  if jellyfinContractObject(t,candidate,field)["nullable"] != true { t.Errorf("%s must allow incomplete null",field) }
 }
 for _, track := range []string{"JellyfinAudioTrack","JellyfinSubtitleTrack"} {
  props := jellyfinContractObject(t,canonical,"components","schemas",track,"properties")
  if jellyfinContractObject(t,props,"language")["nullable"] != true { t.Errorf("%s language must be nullable",track) }
  if _, exists := jellyfinContractObject(t,props,"language")["default"]; exists {t.Errorf("%s fabricates provider language",track)}
 }
 public := jellyfinContractObject(t,canonical,"components","schemas","PublicReleaseSubtitleTrack","properties")
 if len(public) != 5 { t.Errorf("public subtitle shape changed: %v", public) }
 for _, field := range []string{"language","label","format","forced","default"} {if public[field] == nil {t.Errorf("public field %s missing",field)}}
 for _, route := range []struct{path,method string}{
  {"/api/v1/admin/anime/{id}/episode-import/preview","post"},
  {"/api/v1/admin/anime/{id}/episode-import/apply","post"},
  {"/api/v1/admin/episode-versions/{versionId}/folder-scan","post"},
  {"/api/v1/anime/{animeId}/episodes/{episodeNumber}/versions","post"},
  {"/api/v1/episode-versions/{versionId}","patch"},
 } {
  responses:=jellyfinContractObject(t,canonical,"paths",route.path,route.method,"responses")
  for _, status := range []string{"400","409","502","503"} {if responses[status] == nil {t.Errorf("%s missing %s",route.path,status)}}
 }
}

func jellyfinContractObject(t *testing.T, value map[string]any, keys ...string) map[string]any {
 t.Helper()
 for _, key := range keys {
  next, ok := value[key].(map[string]any); if !ok {t.Fatalf("missing contract object %s", strings.Join(keys,"."))}
  value = next
 }
 return value
}
