package services

import (
	"context"
	stdhtml "html"
	"testing"

	"team4s.v3/backend/internal/models"
)

// aniSearch11eyesLegend ist die echte Legende der aniSearch-Relationsseite
// (abgerufen 2026-09-16 für /anime/6123/relations).
const aniSearch11eyesLegend = `["?","Sequel","Prequel","Gemeinsames Universum","Alternative Umgebung","Alternative Version","Charakter","Nebengeschichte","Hauptgeschichte","Zusammenfassung","Komplette Geschichte","Anderes","Remake","Crossover"]`

// build11eyesRelationsHTML bildet die echte Kante a6123 -> a5468 mit
// relation=5 ("Alternative Version") nach.
func build11eyesRelationsHTML(edges string) string {
	graph := `{"nodes":{"anime":{` +
		`"a6123":{"title":"11eyes: Pink Phantasmagoria<span>Bonus, 1 (2010) Nonsense-Komödie</span>","url":"anime/6123,11eyes-pink-phantasmagoria","group":"anime"},` +
		`"a5468":{"title":"11eyes<span>TV-Serie, 12 (2009) Actiondrama</span>","url":"anime/5468,11eyes","group":"anime"}` +
		`},"manga":[],"movie":[]},"edges":` + edges + `,"legend":` + aniSearch11eyesLegend + `}`
	return `<!DOCTYPE html><html><body><div id="flowchart" data-graph="` + stdhtml.EscapeString(graph) + `"></div></body></html>`
}

func TestParseAniSearchRelationsPageHTML_AlternativeVersionFromMainSeriesView(t *testing.T) {
	t.Parallel()

	rawHTML := build11eyesRelationsHTML(`[{"from":"a6123","to":"a5468","relation":5,"group":"anime"}]`)

	relations := parseAniSearchRelationsPageHTML("5468", rawHTML)
	if len(relations) != 1 {
		t.Fatalf("expected the Alternative Version edge to be kept, got %#v", relations)
	}
	got := relations[0]
	if got.RelationLabel != "Nebengeschichte" || got.Title != "11eyes: Pink Phantasmagoria" || got.AniSearchID != "6123" {
		t.Fatalf("expected 11eyes -> Pink Phantasmagoria as Nebengeschichte, got %#v", got)
	}
}

func TestParseAniSearchRelationsPageHTML_AlternativeVersionFromOVAView(t *testing.T) {
	t.Parallel()

	rawHTML := build11eyesRelationsHTML(`[{"from":"a6123","to":"a5468","relation":5,"group":"anime"}]`)

	relations := parseAniSearchRelationsPageHTML("6123", rawHTML)
	if len(relations) != 1 {
		t.Fatalf("expected the Alternative Version edge to be kept, got %#v", relations)
	}
	got := relations[0]
	if got.RelationLabel != "Nebengeschichte" || got.Title != "11eyes" || got.AniSearchID != "5468" {
		t.Fatalf("expected Pink Phantasmagoria -> 11eyes as Nebengeschichte, got %#v", got)
	}
}

func TestParseAniSearchRelationsPageHTML_UnknownTermsCreateNoRelation(t *testing.T) {
	t.Parallel()

	// 0 "?", 2 "Prequel", 3 "Gemeinsames Universum", 4 "Alternative Umgebung",
	// 6 "Charakter", 10 "Komplette Geschichte", 11 "Anderes", 12 "Remake",
	// 13 "Crossover", 99 außerhalb der Legende.
	edges := `[` +
		`{"from":"a6123","to":"a5468","relation":0,"group":"anime"},` +
		`{"from":"a6123","to":"a5468","relation":2,"group":"anime"},` +
		`{"from":"a6123","to":"a5468","relation":3,"group":"anime"},` +
		`{"from":"a5468","to":"a6123","relation":4,"group":"anime"},` +
		`{"from":"a5468","to":"a6123","relation":6,"group":"anime"},` +
		`{"from":"a6123","to":"a5468","relation":10,"group":"anime"},` +
		`{"from":"a6123","to":"a5468","relation":11,"group":"anime"},` +
		`{"from":"a5468","to":"a6123","relation":12,"group":"anime"},` +
		`{"from":"a5468","to":"a6123","relation":13,"group":"anime"},` +
		`{"from":"a6123","to":"a5468","relation":99,"group":"anime"}` +
		`]`

	for _, currentID := range []string{"5468", "6123"} {
		if relations := parseAniSearchRelationsPageHTML(currentID, build11eyesRelationsHTML(edges)); len(relations) != 0 {
			t.Fatalf("expected unknown aniSearch terms to be ignored for %s, got %#v", currentID, relations)
		}
	}
}

func TestResolveAniSearchRelationLabel_ExistingMappingsUnchanged(t *testing.T) {
	t.Parallel()

	cases := []struct {
		term     string
		outgoing bool
		want     string
	}{
		{"Sequel", true, "Fortsetzung"},
		{"Sequel", false, "Hauptgeschichte"},
		{"Nebengeschichte", true, "Nebengeschichte"},
		{"Nebengeschichte", false, "Hauptgeschichte"},
		{"Hauptgeschichte", true, "Hauptgeschichte"},
		{"Hauptgeschichte", false, "Nebengeschichte"},
		{"Zusammenfassung", true, "Zusammenfassung"},
		{"Zusammenfassung", false, ""},
		{"Alternative Version", true, "Nebengeschichte"},
		{"Alternative Version", false, "Nebengeschichte"},
		{" Alternative Version ", true, "Nebengeschichte"},
		{"Prequel", true, ""},
		{"Remake", false, ""},
		{"alternative-version", true, ""},
		{"", true, ""},
	}
	for _, tc := range cases {
		if got := resolveAniSearchRelationLabel(tc.term, tc.outgoing); got != tc.want {
			t.Fatalf("resolveAniSearchRelationLabel(%q, outgoing=%v) = %q, want %q", tc.term, tc.outgoing, got, tc.want)
		}
	}
}

func TestResolveAniSearchRelationLabel_OnlyProducesAllowedAdminLabels(t *testing.T) {
	t.Parallel()

	for term, mapping := range aniSearchRelationLabels {
		for _, label := range []string{mapping.Outgoing, mapping.Incoming} {
			if label != "" && !isAllowedAdminRelationLabel(label) {
				t.Fatalf("aniSearch term %q maps to non-admin label %q", term, label)
			}
		}
	}
}

func TestNormalizeAniSearchRelationLabel_AlternativeVersionAndUnknown(t *testing.T) {
	t.Parallel()

	cases := map[string]string{
		"Alternative Version": "Nebengeschichte",
		"Hauptgeschichte":     "Hauptgeschichte",
		"Nebengeschichte":     "Nebengeschichte",
		"Fortsetzung":         "Fortsetzung",
		"Zusammenfassung":     "Zusammenfassung",
	}
	for input, want := range cases {
		got, ok := normalizeAniSearchRelationLabel(input)
		if !ok || got != want {
			t.Fatalf("normalizeAniSearchRelationLabel(%q) = %q/%v, want %q", input, got, ok, want)
		}
	}
	for _, unknown := range []string{"Remake", "Crossover", "Alternative Umgebung", "alternative-version", ""} {
		if got, ok := normalizeAniSearchRelationLabel(unknown); ok || got != "" {
			t.Fatalf("expected unknown term %q to be rejected, got %q/%v", unknown, got, ok)
		}
	}
}

// Regression 11eyes: der Hauptanime ist per Jellyfin angelegt (kein
// anisearch:-Source), daher muss die OVA über den Titel-Fallback gefunden und
// als Nebengeschichte vorgeschlagen werden. Unbekannte Kanten erzeugen nichts.
func TestLoadAniSearchDraft_11eyesRelationViaParsedGraphAndTitleFallback(t *testing.T) {
	t.Parallel()

	rawHTML := build11eyesRelationsHTML(`[` +
		`{"from":"a6123","to":"a5468","relation":5,"group":"anime"},` +
		`{"from":"a5468","to":"a6123","relation":12,"group":"anime"}` +
		`]`)

	service := NewAnimeCreateEnrichmentService(
		stubAniSearchFetcher{
			anime: AniSearchAnime{
				AniSearchID:  "5468",
				PrimaryTitle: "11eyes",
				Relations:    parseAniSearchRelationsPageHTML("5468", rawHTML),
			},
		},
		stubAnimeCreateEnrichmentRepo{
			matches: []models.AdminAnimeRelationTitleMatch{
				{MatchedTitle: "11eyes: Pink Phantasmagoria", Target: models.AdminAnimeRelationTarget{AnimeID: 3, Title: "11eyes: Pink Phantasmagoria"}},
			},
		},
		nil,
	)

	_, relations, err := service.LoadAniSearchDraft(context.Background(), "5468")
	if err != nil {
		t.Fatalf("load anisearch draft: %v", err)
	}
	if len(relations) != 1 {
		t.Fatalf("expected exactly one relation for 11eyes, got %#v", relations)
	}
	if relations[0].TargetAnimeID != 3 || relations[0].RelationLabel != "Nebengeschichte" {
		t.Fatalf("expected 11eyes -> anime 3 as Nebengeschichte, got %#v", relations[0])
	}
}
