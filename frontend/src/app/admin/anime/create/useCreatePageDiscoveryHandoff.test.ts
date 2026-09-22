// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  useCreatePageDiscoveryHandoff,
  type UseCreatePageDiscoveryHandoffParams,
} from "./useCreatePageDiscoveryHandoff";

describe("useCreatePageDiscoveryHandoff", () => {
  it("adopts the Jellyfin candidate exactly once when a jellyfinID is present and not yet adopted, even across re-renders", () => {
    const adoptCandidate = vi.fn();
    const setSearchQuery = vi.fn();
    const initialProps: UseCreatePageDiscoveryHandoffParams = {
      jellyfinID: "series-42",
      hasAdoptedPreview: false,
      adoptCandidate,
      jellyfinPreviewFolderNameSeed: undefined,
      searchQuery: "",
      setSearchQuery,
    };

    const { rerender } = renderHook(
      (props: UseCreatePageDiscoveryHandoffParams) =>
        useCreatePageDiscoveryHandoff(props),
      { initialProps },
    );

    expect(adoptCandidate).toHaveBeenCalledTimes(1);
    expect(adoptCandidate).toHaveBeenCalledWith("series-42");

    rerender({ ...initialProps });
    rerender({ ...initialProps });

    expect(adoptCandidate).toHaveBeenCalledTimes(1);
  });

  it("never adopts again when the preview was already adopted by a prior mount", () => {
    const adoptCandidate = vi.fn();
    const setSearchQuery = vi.fn();

    renderHook(() =>
      useCreatePageDiscoveryHandoff({
        jellyfinID: "series-42",
        hasAdoptedPreview: true,
        adoptCandidate,
        jellyfinPreviewFolderNameSeed: undefined,
        searchQuery: "",
        setSearchQuery,
      }),
    );

    expect(adoptCandidate).not.toHaveBeenCalled();
  });

  it("prefills the AniSearch search field exactly once from the cleaned folder name, never overwriting existing text", () => {
    const adoptCandidate = vi.fn();
    const setSearchQuery = vi.fn();
    const baseProps: UseCreatePageDiscoveryHandoffParams = {
      jellyfinID: "series-42",
      hasAdoptedPreview: true,
      adoptCandidate,
      jellyfinPreviewFolderNameSeed: undefined,
      searchQuery: "",
      setSearchQuery,
    };

    const { rerender } = renderHook(
      (props: UseCreatePageDiscoveryHandoffParams) =>
        useCreatePageDiscoveryHandoff(props),
      { initialProps: baseProps },
    );

    expect(setSearchQuery).not.toHaveBeenCalled();

    rerender({ ...baseProps, jellyfinPreviewFolderNameSeed: "Naruto" });

    expect(setSearchQuery).toHaveBeenCalledTimes(1);
    expect(setSearchQuery).toHaveBeenCalledWith("Naruto");

    rerender({ ...baseProps, jellyfinPreviewFolderNameSeed: "Naruto" });
    rerender({ ...baseProps, jellyfinPreviewFolderNameSeed: "Naruto Shippuden" });

    expect(setSearchQuery).toHaveBeenCalledTimes(1);
  });

  it("never prefills over text the admin already typed", () => {
    const adoptCandidate = vi.fn();
    const setSearchQuery = vi.fn();

    renderHook(() =>
      useCreatePageDiscoveryHandoff({
        jellyfinID: "series-42",
        hasAdoptedPreview: true,
        adoptCandidate,
        jellyfinPreviewFolderNameSeed: "Naruto",
        searchQuery: "Bleach",
        setSearchQuery,
      }),
    );

    expect(setSearchQuery).not.toHaveBeenCalled();
  });

  it("does nothing at all when jellyfinID is null, regardless of other state", () => {
    const adoptCandidate = vi.fn();
    const setSearchQuery = vi.fn();

    renderHook(() =>
      useCreatePageDiscoveryHandoff({
        jellyfinID: null,
        hasAdoptedPreview: false,
        adoptCandidate,
        jellyfinPreviewFolderNameSeed: "Naruto",
        searchQuery: "",
        setSearchQuery,
      }),
    );

    expect(adoptCandidate).not.toHaveBeenCalled();
    expect(setSearchQuery).not.toHaveBeenCalled();
  });

  it("GAP-19: strips a trailing year suffix before prefilling the search field", () => {
    const adoptCandidate = vi.fn();
    const setSearchQuery = vi.fn();
    const baseProps: UseCreatePageDiscoveryHandoffParams = {
      jellyfinID: "series-42",
      hasAdoptedPreview: true,
      adoptCandidate,
      jellyfinPreviewFolderNameSeed: undefined,
      searchQuery: "",
      setSearchQuery,
    };

    const { rerender } = renderHook(
      (props: UseCreatePageDiscoveryHandoffParams) =>
        useCreatePageDiscoveryHandoff(props),
      { initialProps: baseProps },
    );

    rerender({
      ...baseProps,
      jellyfinPreviewFolderNameSeed: "Accel World Infinite Burst (2016)",
    });

    expect(setSearchQuery).toHaveBeenCalledTimes(1);
    expect(setSearchQuery).toHaveBeenCalledWith("Accel World Infinite Burst");
  });
});
