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

  it("handleCursorBack pops the client-held cursor history instead of issuing a new cursor", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    const { result } = renderHook(() => useDiscoveryLibraryFilters());

    act(() => {
      result.current.handleCursorChange("page-2-cursor");
    });
    expect(result.current.cursorHistory).toEqual([""]);

    act(() => {
      result.current.handleCursorBack();
    });

    expect(result.current.cursorHistory).toEqual([]);
    const url = lastReplaceCallURL();
    expect(url).not.toContain("cursor=");
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
