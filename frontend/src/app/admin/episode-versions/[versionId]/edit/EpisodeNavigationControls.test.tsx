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
  it("deaktiviert beide Buttons waehrend isLoading", () => {
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
      name: /Vorherige Folge/i,
    });
    const nextButton = screen.getByRole("button", {
      name: /Nächste Folge/i,
    });

    expect((prevButton as HTMLButtonElement).disabled).toBe(true);
    expect((nextButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(prevButton);
    fireEvent.click(nextButton);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("deaktiviert 'Vorherige Folge', wenn prevVersionId null ist", () => {
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
      (screen.getByRole("button", { name: /Vorherige Folge/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /Nächste Folge/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("deaktiviert 'Nächste Folge', wenn nextVersionId null ist", () => {
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
      (screen.getByRole("button", { name: /Nächste Folge/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /Vorherige Folge/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("navigiert per Klick auf 'Nächste Folge' zur nextVersionId mit aktivem Tab", () => {
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

    fireEvent.click(screen.getByRole("button", { name: /Nächste Folge/i }));
    expect(pushMock).toHaveBeenCalledWith(
      "/admin/episode-versions/103/edit?tab=segmente",
    );
  });

  it("navigiert per Klick auf 'Vorherige Folge' zur prevVersionId mit aktivem Tab", () => {
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

    fireEvent.click(screen.getByRole("button", { name: /Vorherige Folge/i }));
    expect(pushMock).toHaveBeenCalledWith(
      "/admin/episode-versions/101/edit?tab=notizen",
    );
  });

  it("rendert die Positionsanzeige, wenn currentIndex und totalCount gueltig sind", () => {
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

    expect(screen.getByText("Folge 2 von 3")).not.toBeNull();
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

    expect(screen.queryByText(/Folge \d+ von \d+/)).toBeNull();
  });
});
