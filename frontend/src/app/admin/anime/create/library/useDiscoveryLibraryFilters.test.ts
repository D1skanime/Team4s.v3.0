// @vitest-environment jsdom
//
// 165-09 (D-11): useDiscoveryLibraryFilters synchronisiert filter/q/cursor über die
// URL, analog zu useUserListFilters.test.ts's Rundreise-Tests für die Benutzerliste.

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.hoisted(() => vi.fn());
const mockUseSearchParams = vi.hoisted(() => vi.fn(() => new URLSearchParams()));
const mockUsePathname = vi.hoisted(() => vi.fn(() => "/admin/anime/create/library"));
const mockUseRouter = vi.hoisted(() => vi.fn(() => ({ replace: mockReplace })));

vi.mock("next/navigation", () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}));

import { useDiscoveryLibraryFilters } from "./useDiscoveryLibraryFilters";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
});

function lastReplaceCallURL(): string {
  const calls = mockReplace.mock.calls;
  return String(calls[calls.length - 1]?.[0] ?? "");
}

describe("useDiscoveryLibraryFilters", () => {
  it("resolves to filter=offen when no URL params are present", () => {
    const { result } = renderHook(() => useDiscoveryLibraryFilters());
    expect(result.current.params.filter).toBe("offen");
  });

  it("changing the filter writes the filter URL param and clears an existing cursor", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=abc"));
    const { result } = renderHook(() => useDiscoveryLibraryFilters());

    act(() => {
      result.current.handleFilterChange("bereits_vorhanden");
    });

    expect(mockReplace).toHaveBeenCalled();
    const url = lastReplaceCallURL();
    expect(url).toContain("filter=bereits_vorhanden");
    expect(url).not.toContain("cursor=abc");
  });

  it("changing the search value writes q after the debounce and clears an existing cursor", async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=abc"));
    const { result } = renderHook(() => useDiscoveryLibraryFilters());

    act(() => {
      result.current.handleSearchChange("naruto");
    });

    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    const url = lastReplaceCallURL();
    expect(url).toContain("q=naruto");
    expect(url).not.toContain("cursor=abc");
  });

  it("handleCursorChange writes the cursor URL param WITHOUT resetting filter/q", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("filter=alle&q=naruto"));
    const { result } = renderHook(() => useDiscoveryLibraryFilters());

    act(() => {
      result.current.handleCursorChange("cursor-xyz");
    });

    const url = lastReplaceCallURL();
    expect(url).toContain("cursor=cursor-xyz");
    expect(url).toContain("filter=alle");
    expect(url).toContain("q=naruto");
  });

  it("handleCursorBack pops the URL-persisted cursor history instead of issuing a new cursor", () => {
    // GAP-11: cursorHistory is now derived from the `hist` URL param, so a
    // second call reflecting a fresh URL state (as router.replace would
    // actually produce) is simulated by updating the searchParams mock
    // between the two act() calls — this hook no longer holds its own state.
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    const { result, rerender } = renderHook(() => useDiscoveryLibraryFilters());

    act(() => {
      result.current.handleCursorChange("page-2-cursor");
    });
    let url = lastReplaceCallURL();
    expect(url).toContain("cursor=page-2-cursor");
    expect(url).toContain("hist=");

    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=page-2-cursor&hist="));
    rerender();
    expect(result.current.cursorHistory).toEqual([""]);

    act(() => {
      result.current.handleCursorBack();
    });

    url = lastReplaceCallURL();
    expect(url).not.toContain("cursor=");
    expect(url).not.toContain("hist=");
  });

  it("GAP-11: rendering with a URL-encoded hist param reconstructs cursorHistory on the very first render", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("filter=alle&cursor=XYZ&hist=A%2CB"));
    const { result } = renderHook(() => useDiscoveryLibraryFilters());

    expect(result.current.cursorHistory).toEqual(["A", "B"]);
  });

  it("GAP-11: handleCursorChange appends the OLD cursor to hist and writes both params", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=C1&hist=A%2CB"));
    const { result } = renderHook(() => useDiscoveryLibraryFilters());

    act(() => {
      result.current.handleCursorChange("nextCursor");
    });

    const url = lastReplaceCallURL();
    expect(url).toContain("cursor=nextCursor");
    expect(url).toContain(`hist=${encodeURIComponent("A,B,C1")}`);
  });

  it("GAP-11: handleCursorBack pops the last hist entry and writes it back as the cursor", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=nextCursor&hist=A%2CB%2CC1"));
    const { result } = renderHook(() => useDiscoveryLibraryFilters());

    act(() => {
      result.current.handleCursorBack();
    });

    const url = lastReplaceCallURL();
    expect(url).toContain("cursor=C1");
    expect(url).toContain(`hist=${encodeURIComponent("A,B")}`);
  });

  it("GAP-11: handleFilterChange and handleSearchChange clear hist exactly like they clear cursor", async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=abc&hist=A%2CB"));
    const { result } = renderHook(() => useDiscoveryLibraryFilters());

    act(() => {
      result.current.handleFilterChange("bereits_vorhanden");
    });
    let url = lastReplaceCallURL();
    expect(url).not.toContain("hist=");

    mockReplace.mockClear();
    mockUseSearchParams.mockReturnValue(new URLSearchParams("cursor=abc&hist=A%2CB"));
    const { result: result2 } = renderHook(() => useDiscoveryLibraryFilters());

    act(() => {
      result2.current.handleSearchChange("naruto");
    });

    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    url = lastReplaceCallURL();
    expect(url).not.toContain("hist=");
  });

  it("GAP-02: hydrates the search field from the q URL param on first render", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=Accel World"));
    const { result } = renderHook(() => useDiscoveryLibraryFilters());

    expect(result.current.searchValue).toBe("Accel World");
    expect(result.current.params.q).toBe("Accel World");
  });

  it("keeps the params object reference-stable across re-renders with unchanged URL params", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("filter=alle"));
    const { result, rerender } = renderHook(() => useDiscoveryLibraryFilters());
    const first = result.current.params;
    rerender();
    const second = result.current.params;
    expect(first).toBe(second);
  });
});
