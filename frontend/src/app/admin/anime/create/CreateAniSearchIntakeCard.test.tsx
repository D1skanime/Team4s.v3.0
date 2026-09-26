import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CreateAniSearchIntakeCard } from "./CreateAniSearchIntakeCard";

describe("CreateAniSearchIntakeCard", () => {
  it("renders the idle controls and helper copy", () => {
    const markup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID=""
        searchQuery=""
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[]}
        result={null}
        conflict={null}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(markup).toContain("AniSearch Titel");
    expect(markup).toContain("Titel suchen");
    expect(markup).toContain("AniSearch ID");
    expect(markup).toContain("AniSearch laden");
    expect(markup).not.toContain("Manuell &gt; AniSearch &gt; Jellyfin");
    expect(markup).not.toContain("Noch keine AniSearch-Daten geladen.");
    expect(markup).not.toContain("Nichts wird gespeichert");
  });

  it("keeps technical draft summary hidden while rendering duplicate CTA", () => {
    const summaryMarkup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID="12345"
        searchQuery=""
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[]}
        result={{
          anisearchID: "12345",
          source: "anisearch:12345",
          summary:
            "AniSearch ID 12345 geladen. Wird beim Erstellen übernommen.",
          updatedFields: ["Titel", "Beschreibung", "Genres"],
          relationNotes: [
            "2 von 3 Relationen wurden lokal zugeordnet.",
            "1 AniSearch-Relation konnte nicht lokal zugeordnet werden.",
          ],
          draftStatusNotes: [
            "AniSearch hat bestehende Jellyfin-Werte für Titel und Beschreibung überschrieben.",
            "Manuell gepflegte Genres bleiben erhalten.",
          ],
          draft: {
            title: "Bleach",
            type: "tv",
            content_type: "anime",
            status: "ongoing",
            source: "anisearch:12345",
          },
        }}
        conflict={null}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(summaryMarkup).not.toContain("Aktualisierte Felder");
    expect(summaryMarkup).not.toContain("Relationen");
    expect(summaryMarkup).not.toContain("AniSearch-Status");
    expect(summaryMarkup).not.toContain(
      "AniSearch hat bestehende Jellyfin-Werte für Titel und Beschreibung überschrieben.",
    );
    expect(summaryMarkup).not.toContain("Manuell gepflegte Genres bleiben erhalten.");

    const duplicateMarkup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID="12345"
        searchQuery="Bleach"
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[]}
        result={null}
        conflict={{
          anisearchID: "12345",
          existingAnimeID: 21,
          existingTitle: "Monster",
          redirectPath: "/admin/anime/21/edit",
        }}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(duplicateMarkup).toContain("Monster");
    expect(duplicateMarkup).toContain("Zum vorhandenen Anime wechseln");
    expect(duplicateMarkup).toContain("/admin/anime/21/edit");
  });

  it("renders the candidate chooser with title, type, year, and ID", () => {
    const markup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID=""
        searchQuery="Bleach"
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[
          {
            anisearch_id: "1078",
            title: "Bleach",
            type: "TV-Serie",
            year: 2004,
          },
        ]}
        result={null}
        conflict={null}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(markup).toContain("Suchergebnisse");
    expect(markup).toContain("Bleach");
    expect(markup).toContain("2004 | TV-Serie | AniSearch-ID 1078");
    expect(markup).toContain("Auswählen");
  });

  it("D-31: marks an already-existing candidate with a visible hint in its own row", () => {
    const markup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID=""
        searchQuery="Bleach"
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[
          {
            anisearch_id: "1078",
            title: "Bleach",
            type: "TV-Serie",
            year: 2004,
            existing_anime_id: 21,
            existing_title: "Bleach",
          },
          {
            anisearch_id: "15085",
            title: "Bleach: Thousand-Year Blood War",
            type: "TV-Serie",
            year: 2022,
          },
        ]}
        result={null}
        conflict={null}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    // Both candidates remain visible -- D-31 never hides a match.
    expect(markup).toContain("Bleach: Thousand-Year Blood War");
    expect(markup).toContain("Existiert schon als „Bleach“ (#21)");

    // The hint must live in the matched candidate's own row (before its "Auswählen"
    // button), not in a global banner shared by both rows.
    const hintIndex = markup.indexOf("Existiert schon als");
    const matchedButtonIndex = markup.indexOf("Auswählen");
    expect(hintIndex).toBeGreaterThan(-1);
    expect(hintIndex).toBeLessThan(matchedButtonIndex);
  });

  it("renders a candidate without existing_anime_id exactly as before (no hint)", () => {
    const markup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID=""
        searchQuery="Bleach"
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[
          {
            anisearch_id: "15085",
            title: "Bleach: Thousand-Year Blood War",
            type: "TV-Serie",
            year: 2022,
          },
        ]}
        result={null}
        conflict={null}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(markup).toContain("Bleach: Thousand-Year Blood War");
    expect(markup).not.toContain("Existiert schon als");
  });

  it("D-31: the dead global filtered-duplicate hint copy is never rendered anywhere", () => {
    const markup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID=""
        searchQuery="Bleach"
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[]}
        result={null}
        conflict={null}
        errorMessage="Keine AniSearch-Treffer gefunden. Bitte pruefe den Titel oder nutze die ID direkt."
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(markup).not.toContain(
      "AniSearch hat Titel gefunden, aber bereits vorhandene Anime werden in der Create-Auswahl ausgeblendet.",
    );

    const duplicateMarkup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID="12345"
        searchQuery="Bleach"
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[]}
        result={null}
        conflict={{
          anisearchID: "12345",
          existingAnimeID: 21,
          existingTitle: "Monster",
          redirectPath: "/admin/anime/21/edit",
        }}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(duplicateMarkup).toContain("Zum vorhandenen Anime wechseln");
    expect(duplicateMarkup).toContain("/admin/anime/21/edit");
  });
});
