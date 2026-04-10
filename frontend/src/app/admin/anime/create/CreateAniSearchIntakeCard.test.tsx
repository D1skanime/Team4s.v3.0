import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CreateAniSearchIntakeCard } from "./CreateAniSearchIntakeCard";

describe("CreateAniSearchIntakeCard", () => {
  it("renders the idle controls and helper copy", () => {
    const markup = renderToStaticMarkup(
      <CreateAniSearchIntakeCard
        anisearchID=""
        isLoading={false}
        result={null}
        conflict={null}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

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
        isLoading={false}
        result={{
          anisearchID: "12345",
          source: "anisearch:12345",
          summary:
            "AniSearch ID 12345 hat den Entwurf aktualisiert. Noch nichts gespeichert.",
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
        onSubmit={() => undefined}
      />,
    );

    expect(summaryMarkup).toContain("Aktualisierte Felder");
    expect(summaryMarkup).toContain("Relationen");
    expect(summaryMarkup).toContain("Entwurfsstatus");
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
        isLoading={false}
        result={null}
        conflict={{
          anisearchID: "12345",
          existingAnimeID: 21,
          existingTitle: "Monster",
          redirectPath: "/admin/anime/21/edit",
        }}
        errorMessage={null}
        onAniSearchIDChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(duplicateMarkup).toContain("Monster");
    expect(duplicateMarkup).toContain("Zum vorhandenen Anime wechseln");
    expect(duplicateMarkup).toContain("/admin/anime/21/edit");
  });
});
