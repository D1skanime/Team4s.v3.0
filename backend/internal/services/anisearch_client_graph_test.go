package services

import "testing"

func TestParseAniSearchRelationsPageHTML_ToleratesNonAnimeNodeArrays(t *testing.T) {
	t.Parallel()

	rawHTML := `
<!DOCTYPE html>
<html>
  <body>
    <div
      id="flowchart"
      data-graph="{&quot;nodes&quot;:{&quot;anime&quot;:{&quot;a10250&quot;:{&quot;title&quot;:&quot;Ace of the Diamond: Staffel 2&lt;span&gt;TV-Serie, 51 (2015) Ganbatte&lt;/span&gt;&quot;,&quot;url&quot;:&quot;anime/10250,ace-of-the-diamond-staffel-2&quot;,&quot;group&quot;:&quot;anime&quot;},&quot;a8674&quot;:{&quot;title&quot;:&quot;Ace of the Diamond&lt;span&gt;TV-Serie, 75 (2013) Ganbatte&lt;/span&gt;&quot;,&quot;url&quot;:&quot;anime/8674,ace-of-the-diamond&quot;,&quot;group&quot;:&quot;anime&quot;},&quot;a13997&quot;:{&quot;title&quot;:&quot;Ace of the Diamond: Act II&lt;span&gt;TV-Serie, 52 (2019) Ganbatte&lt;/span&gt;&quot;,&quot;url&quot;:&quot;anime/13997,ace-of-the-diamond-act-ii&quot;,&quot;group&quot;:&quot;anime&quot;}},&quot;manga&quot;:[],&quot;movie&quot;:[]},&quot;edges&quot;:[{&quot;from&quot;:&quot;a8674&quot;,&quot;to&quot;:&quot;a10250&quot;,&quot;relation&quot;:1,&quot;group&quot;:&quot;anime&quot;},{&quot;from&quot;:&quot;a10250&quot;,&quot;to&quot;:&quot;a13997&quot;,&quot;relation&quot;:1,&quot;group&quot;:&quot;anime&quot;}],&quot;legend&quot;:[&quot;?&quot;,&quot;Sequel&quot;]}"
    ></div>
  </body>
</html>`

	relations := parseAniSearchRelationsPageHTML("10250", rawHTML)
	if len(relations) != 2 {
		t.Fatalf("expected 2 parsed relations, got %#v", relations)
	}

	if relations[0].RelationLabel != "Hauptgeschichte" || relations[0].Title != "Ace of the Diamond" || relations[0].AniSearchID != "8674" {
		t.Fatalf("unexpected incoming sequel mapping: %#v", relations[0])
	}

	if relations[1].RelationLabel != "Fortsetzung" || relations[1].Title != "Ace of the Diamond: Act II" || relations[1].AniSearchID != "13997" {
		t.Fatalf("unexpected outgoing sequel mapping: %#v", relations[1])
	}
}

func TestDecodeAniSearchRelationsNodes_TreatsEmptyArrayAsEmptyNodeSet(t *testing.T) {
	t.Parallel()

	nodes, err := decodeAniSearchRelationsNodes([]byte("[]"))
	if err != nil {
		t.Fatalf("expected empty array nodes to decode cleanly, got %v", err)
	}
	if len(nodes) != 0 {
		t.Fatalf("expected no nodes, got %#v", nodes)
	}
}
