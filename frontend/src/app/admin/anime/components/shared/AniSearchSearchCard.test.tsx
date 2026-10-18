// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AniSearchSearchCard } from "./AniSearchSearchCard";

afterEach(() => {
  cleanup();
});

function baseProps() {
  return {
    searchInputId: "test-anisearch-title-search",
    searchLabel: "Titel suchen",
    searchQuery: "",
    onSearchQueryChange: vi.fn(),
    onSearchSubmit: vi.fn(),
    isSearchingCandidates: false,
    searchButtonLabel: "Suchen",
    idInputId: "test-anisearch-id-input",
    idLabel: "ID oder URL",
    idValue: "",
    onIDChange: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    submitButtonLabel: "Laden",
    candidates: [],
    onCandidateSelect: vi.fn(),
    candidateActionLabel: "Auswählen",
  };
}

describe("AniSearchSearchCard", () => {
  it("fires onSearchQueryChange when typing a title", () => {
    const props = baseProps();
    render(<AniSearchSearchCard {...props} />);

    fireEvent.change(screen.getByLabelText("Titel suchen"), {
      target: { value: "Bleach" },
    });
    expect(props.onSearchQueryChange).toHaveBeenCalledWith("Bleach");
  });

  it("fires onSearchSubmit when the search button is clicked with a non-empty query", () => {
    const props = baseProps();
    render(<AniSearchSearchCard {...props} searchQuery="Bleach" />);

    fireEvent.click(screen.getByRole("button", { name: "Suchen" }));
    expect(props.onSearchSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables the search button while the query is empty", () => {
    const props = baseProps();
    render(<AniSearchSearchCard {...props} />);

    expect((screen.getByRole("button", { name: "Suchen" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("fires onIDChange when typing an ID", () => {
    const props = baseProps();
    render(<AniSearchSearchCard {...props} />);

    fireEvent.change(screen.getByLabelText("ID oder URL"), {
      target: { value: "5170" },
    });
    expect(props.onIDChange).toHaveBeenCalledWith("5170");
  });

  it("fires onSubmit when the submit button is clicked with a non-empty ID", () => {
    const props = baseProps();
    render(<AniSearchSearchCard {...props} idValue="5170" />);

    fireEvent.click(screen.getByRole("button", { name: "Laden" }));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("swaps the submit button label to the submitting label while loading", () => {
    const props = baseProps();
    render(
      <AniSearchSearchCard
        {...props}
        idValue="5170"
        isSubmitting
        submittingLabel="Lädt..."
      />,
    );

    expect(screen.getByRole("button", { name: "Lädt..." })).not.toBeNull();
  });

  it("renders candidates and fires onCandidateSelect with the chosen candidate", () => {
    const props = baseProps();
    render(
      <AniSearchSearchCard
        {...props}
        candidates={[
          { anisearch_id: "1078", title: "Bleach", type: "TV-Serie", year: 2004 },
        ]}
      />,
    );

    expect(screen.getByText("Bleach")).not.toBeNull();
    expect(screen.getByText("2004 | TV-Serie | AniSearch-ID 1078")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Auswählen" }));
    expect(props.onCandidateSelect).toHaveBeenCalledWith({
      anisearch_id: "1078",
      title: "Bleach",
      type: "TV-Serie",
      year: 2004,
    });
  });

  it("marks an already-existing candidate with a visible hint", () => {
    const props = baseProps();
    render(
      <AniSearchSearchCard
        {...props}
        candidates={[
          {
            anisearch_id: "1078",
            title: "Bleach",
            type: "TV-Serie",
            year: 2004,
            existing_anime_id: 21,
            existing_title: "Bleach",
          },
        ]}
      />,
    );

    expect(screen.getByText("Existiert schon als „Bleach“ (#21)")).not.toBeNull();
  });

  it("renders the dismiss button only when onCandidateDismiss is provided", () => {
    const props = baseProps();
    const onCandidateDismiss = vi.fn();
    render(
      <AniSearchSearchCard
        {...props}
        candidates={[{ anisearch_id: "1078", title: "Bleach", type: "TV-Serie", year: 2004 }]}
        onCandidateDismiss={onCandidateDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Suche verfeinern" }));
    expect(onCandidateDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not render a dismiss button when onCandidateDismiss is omitted", () => {
    const props = baseProps();
    render(
      <AniSearchSearchCard
        {...props}
        candidates={[{ anisearch_id: "1078", title: "Bleach", type: "TV-Serie", year: 2004 }]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Suche verfeinern" })).toBeNull();
  });
});
