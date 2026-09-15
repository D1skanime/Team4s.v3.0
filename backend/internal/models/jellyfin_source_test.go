package models

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestJellyfinSourceSnapshotJSON(t *testing.T) {
	raw := `{"jellyfin_source":{"version":1,"media_source_id":"source-a","source_path":"/fixture/a.mkv","streams_complete":true,"selected_audio_index":1,"audio_tracks":[{"index":1,"codec":"flac","language":null,"default":true}],"subtitle_tracks":[{"index":2,"codec":"ass","language":null,"display_title":"Unbekannt","default":false,"forced":true}]}}`
	var decoded struct {
		Source JellyfinSourceSnapshot `json:"jellyfin_source"`
	}
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
		t.Fatal(err)
	}
	s := decoded.Source
	if s.Version != 1 || s.MediaSourceID != "source-a" || s.SourcePath != "/fixture/a.mkv" || !s.StreamsComplete || s.SelectedAudioIndex == nil || *s.SelectedAudioIndex != 1 || len(s.AudioTracks) != 1 || len(s.SubtitleTracks) != 1 || s.AudioTracks[0].Language != nil || s.SubtitleTracks[0].Language != nil {
		t.Fatalf("lost snapshot: %+v", s)
	}
	encoded, err := json.Marshal(decoded)
	if err != nil {
		t.Fatal(err)
	}
	var want, got any
	json.Unmarshal([]byte(raw), &want)
	json.Unmarshal(encoded, &got)
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("JSON contract changed: %s", encoded)
	}
}

func TestJellyfinSourceSnapshotEmptyTracks(t *testing.T) {
	s := JellyfinSourceSnapshot{Version: 1, MediaSourceID: "source-a", StreamsComplete: true, AudioTracks: []JellyfinAudioTrack{}, SubtitleTracks: []JellyfinSubtitleTrack{}}
	raw, err := json.Marshal(s)
	if err != nil {
		t.Fatal(err)
	}
	var value map[string]any
	json.Unmarshal(raw, &value)
	if len(value["audio_tracks"].([]any)) != 0 || len(value["subtitle_tracks"].([]any)) != 0 || value["selected_audio_index"] != nil {
		t.Fatalf("empty source fabricated tracks: %s", raw)
	}
}
