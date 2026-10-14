// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { EpisodeNavigationControls } from "./EpisodeNavigationControls";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EpisodeNavigationControls", () => {
  it("deaktiviert beide Segmente waehrend isLoading", () => {
    render(
      <EpisodeNavigationControls
        prevVersionId={101}
        prevEpisodeNumber={1}
        nextVersionId={103}
        nextEpisodeNumber={3}
        currentIndex={1}
        totalCount={3}
        isLoading={true}
        activeTab="segmente"
      />,
    );

    const prevButton = screen.getByRole("button", {
      name: "Vorherige Folge",
    });
    const nextButton = screen.getByRole("button", {
      name: "Nächste Folge",
    });

    expect((prevButton as HTMLButtonElement).disabled).toBe(true);
    expect((nextButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(prevButton);
    fireEvent.click(nextButton);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("deaktiviert das 'Zurueck'-Segment, wenn prevVersionId null ist", () => {
    render(
      <EpisodeNavigationControls
        prevVersionId={null}
        prevEpisodeNumber={null}
        nextVersionId={103}
        nextEpisodeNumber={3}
        currentIndex={0}
        totalCount={3}
        isLoading={false}
        activeTab="segmente"
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Vorherige Folge" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Nächste Folge" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("deaktiviert das 'Weiter'-Segment, wenn nextVersionId null ist", () => {
    render(
      <EpisodeNavigationControls
        prevVersionId={101}
        prevEpisodeNumber={1}
        nextVersionId={null}
        nextEpisodeNumber={null}
        currentIndex={2}
        totalCount={3}
        isLoading={false}
        activeTab="segmente"
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Nächste Folge" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Vorherige Folge" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("navigiert per Klick auf 'Weiter' zur nextVersionId mit aktivem Tab", () => {
    render(
      <EpisodeNavigationControls
        prevVersionId={101}
        prevEpisodeNumber={1}
        nextVersionId={103}
        nextEpisodeNumber={3}
        currentIndex={1}
        totalCount={3}
        isLoading={false}
        activeTab="segmente"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nächste Folge" }));
    expect(pushMock).toHaveBeenCalledWith(
      "/admin/episode-versions/103/edit?tab=segmente",
    );
  });

  it("navigiert per Klick auf 'Zurueck' zur prevVersionId mit aktivem Tab", () => {
    render(
      <EpisodeNavigationControls
        prevVersionId={101}
        prevEpisodeNumber={1}
        nextVersionId={103}
        nextEpisodeNumber={3}
        currentIndex={1}
        totalCount={3}
        isLoading={false}
        activeTab="notizen"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vorherige Folge" }));
    expect(pushMock).toHaveBeenCalledWith(
      "/admin/episode-versions/101/edit?tab=notizen",
    );
  });

  it("rendert die Positionsanzeige 'Folge X / Y', wenn currentIndex und totalCount gueltig sind", () => {
    render(
      <EpisodeNavigationControls
        prevVersionId={101}
        prevEpisodeNumber={1}
        nextVersionId={103}
        nextEpisodeNumber={3}
        currentIndex={1}
        totalCount={3}
        isLoading={false}
        activeTab="segmente"
      />,
    );

    expect(screen.getByText("Folge 2 / 3")).not.toBeNull();
  });

  it("rendert keine Positionsanzeige, wenn currentIndex -1 ist", () => {
    render(
      <EpisodeNavigationControls
        prevVersionId={null}
        prevEpisodeNumber={null}
        nextVersionId={null}
        nextEpisodeNumber={null}
        currentIndex={-1}
        totalCount={0}
        isLoading={false}
        activeTab="segmente"
      />,
    );

    expect(screen.queryByText(/Folge \d+ \/ \d+/)).toBeNull();
  });

  it("rendert die sichtbaren Text-Labels 'Zurück'/'Weiter' im DOM", () => {
    render(
      <EpisodeNavigationControls
        prevVersionId={101}
        prevEpisodeNumber={1}
        nextVersionId={103}
        nextEpisodeNumber={3}
        currentIndex={1}
        totalCount={3}
        isLoading={false}
        activeTab="segmente"
      />,
    );

    expect(screen.getByText("Zurück")).not.toBeNull();
    expect(screen.getByText("Weiter")).not.toBeNull();
  });
});
