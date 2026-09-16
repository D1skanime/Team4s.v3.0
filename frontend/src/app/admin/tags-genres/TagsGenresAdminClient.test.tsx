// @vitest-environment jsdom
//
// Plan 160-03: TagsGenresAdminClient ist die neue Admin-Pflegeseite für deutsche
// Tag-/Genre-Namen (D-04/D-07). Diese Tests decken die geplanten Behaviors ab:
// Laden beider Listen, isoliertes Speichern pro Zeile per Blur, Leeren auf leeren
// String UND auf einen reinen Leerzeichen-Wert (Auftraggeber-Mandat: Drei-Fall-
// Abdeckung auf der UI-Seite, spiegelt die Backend-Abdeckung aus Plan 160-02),
// sowie ErrorState/EmptyState statt eines rohen Fehlers bzw. einer leeren Tabelle.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TagsGenresAdminClient } from "./TagsGenresAdminClient";

const mockGetAdminTagNames = vi.hoisted(() => vi.fn());
const mockGetAdminGenreNames = vi.hoisted(() => vi.fn());
const mockUpdateAdminTagName = vi.hoisted(() => vi.fn());
const mockUpdateAdminGenreName = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  getAdminTagNames: mockGetAdminTagNames,
  getAdminGenreNames: mockGetAdminGenreNames,
  updateAdminTagName: mockUpdateAdminTagName,
  updateAdminGenreName: mockUpdateAdminGenreName,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const TAG_ROWS = [
  { id: 1, name: "Amnesia", count: 3, name_de: null },
  { id: 2, name: "Demon", count: 5, name_de: "Dämon" },
];

const GENRE_ROWS = [{ id: 10, name: "Action", count: 8, name_de: null }];

function mockSuccess() {
  mockGetAdminTagNames.mockResolvedValue({ data: TAG_ROWS });
  mockGetAdminGenreNames.mockResolvedValue({ data: GENRE_ROWS });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TagsGenresAdminClient — Liste", () => {
  it("rendert Tag- und Genre-Zeilen aus getAdminTagNames/getAdminGenreNames", async () => {
    mockSuccess();

    render(<TagsGenresAdminClient />);

    expect(await screen.findByText("Amnesia")).not.toBeNull();
    expect(screen.getByText("Demon")).not.toBeNull();
    expect(screen.getByText("Action")).not.toBeNull();
  });
});

describe("TagsGenresAdminClient — deutschen Namen setzen", () => {
  it("ruft updateAdminTagName nur für die bearbeitete Zeile mit ihrer ID und dem neuen Wert auf", async () => {
    mockSuccess();
    mockUpdateAdminTagName.mockResolvedValue({ data: { id: 1, name_de: "Amnesie" } });

    render(<TagsGenresAdminClient />);

    const input = await screen.findByLabelText("Deutscher Name (Amnesia)");
    fireEvent.change(input, { target: { value: "Amnesie" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateAdminTagName).toHaveBeenCalledWith(1, "Amnesie");
    });
    expect(mockUpdateAdminTagName).toHaveBeenCalledTimes(1);
    expect(mockUpdateAdminGenreName).not.toHaveBeenCalled();
  });
});

describe("TagsGenresAdminClient — Leeren auf leeren String (Fall b)", () => {
  it("ruft updateAdminTagName mit einem leeren String auf, wenn das Feld geleert wird", async () => {
    mockSuccess();
    mockUpdateAdminTagName.mockResolvedValue({ data: { id: 2, name_de: "" } });

    render(<TagsGenresAdminClient />);

    const input = await screen.findByLabelText("Deutscher Name (Demon)");
    expect((input as HTMLInputElement).value).toBe("Dämon");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateAdminTagName).toHaveBeenCalledWith(2, "");
    });
  });
});

describe("TagsGenresAdminClient — Leeren auf Leerzeichen-Wert (Fall c, Auftraggeber-Mandat)", () => {
  it("ruft updateAdminGenreName mit einem reinen Leerzeichen-Wert auf (Backend übernimmt Trim/Clear)", async () => {
    mockSuccess();
    mockUpdateAdminGenreName.mockResolvedValue({ data: { id: 10, name_de: "" } });

    render(<TagsGenresAdminClient />);

    const input = await screen.findByLabelText("Deutscher Name (Action)");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateAdminGenreName).toHaveBeenCalledWith(10, "   ");
    });
  });
});

describe("TagsGenresAdminClient — Fehlerzustand", () => {
  it("rendert ErrorState mit einer Wiederholen-Aktion, wenn das Laden fehlschlägt", async () => {
    mockGetAdminTagNames.mockRejectedValue(new Error("Netzwerkfehler"));
    mockGetAdminGenreNames.mockResolvedValue({ data: GENRE_ROWS });

    render(<TagsGenresAdminClient />);

    expect(
      await screen.findByText("Tags und Genres konnten nicht geladen werden"),
    ).not.toBeNull();
    const retryButton = screen.getByRole("button", { name: "Erneut versuchen" });
    expect(retryButton).not.toBeNull();

    mockGetAdminTagNames.mockResolvedValue({ data: TAG_ROWS });
    fireEvent.click(retryButton);

    expect(await screen.findByText("Amnesia")).not.toBeNull();
  });
});

describe("TagsGenresAdminClient — Leerzustand", () => {
  it("rendert EmptyState, wenn die Tag-Liste leer ist", async () => {
    mockGetAdminTagNames.mockResolvedValue({ data: [] });
    mockGetAdminGenreNames.mockResolvedValue({ data: GENRE_ROWS });

    render(<TagsGenresAdminClient />);

    expect(await screen.findByText("Keine Tags vorhanden")).not.toBeNull();
    expect(screen.getByText("Action")).not.toBeNull();
  });
});
