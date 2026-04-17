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
    expect(markup).toContain("Manuell &gt; AniSearch &gt; Jellyfin");
    expect(markup).toContain("Noch keine AniSearch-Daten geladen.");
    expect(markup).toContain("Nichts wird gespeichert");
  });

  it("renders the required summary groups and duplicate CTA", () => {
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
            "AniSearch hat bestehende Jellyfin-Werte fuer Titel und Beschreibung ueberschrieben.",
            "Manuell gepflegte Genres bleiben erhalten.",
          ],
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

    expect(summaryMarkup).toContain("Aktualisierte Felder");
    expect(summaryMarkup).toContain("Relationen");
    expect(summaryMarkup).toContain("AniSearch-Status");
    expect(summaryMarkup).toContain("Titel");
    expect(summaryMarkup).toContain("Beschreibung");
    expect(summaryMarkup).toContain("Genres");
    expect(summaryMarkup).toContain(
      "AniSearch hat bestehende Jellyfin-Werte fuer Titel und Beschreibung ueberschrieben.",
    );
    expect(summaryMarkup).toContain("Manuell gepflegte Genres bleiben erhalten.");

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

    expect(markup).toContain("AniSearch Treffer waehlen");
    expect(markup).toContain("Bleach");
    expect(markup).toContain("TV-Serie | 2004 | ID 1078");
  });

  it("renders the filtered-duplicate empty-state copy while keeping duplicate redirect CTA available", () => {
    const filteredMarkup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID=""
        searchQuery="Bleach"
        isLoading={false}
        isSearchingCandidates={false}
        candidates={[]}
        result={null}
        conflict={null}
        errorMessage="Alle 2 gefundenen AniSearch-Treffer sind bereits als Anime erfasst und wurden ausgeblendet."
        onAniSearchIDChange={() => undefined}
        onSearchQueryChange={() => undefined}
        onSearchSubmit={() => undefined}
        onCandidateDismiss={() => undefined}
        onCandidateSelect={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(filteredMarkup).toContain("Alle 2 gefundenen AniSearch-Treffer sind bereits als Anime erfasst und wurden ausgeblendet.");
    expect(filteredMarkup).not.toContain("Keine AniSearch-Treffer gefunden");

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
