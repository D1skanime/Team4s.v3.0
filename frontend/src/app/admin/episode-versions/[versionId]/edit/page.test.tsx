// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import type { UseReleaseVersionMediaResult } from "./useReleaseVersionMedia";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

type SearchParamsMock = {
  get: (key: string) => string | null;
};

const useSearchParamsMock = vi.fn<() => SearchParamsMock>(() => ({
  get: () => null as string | null,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

const useEpisodeVersionEditorMock = vi.fn();
const useReleaseVersionMediaMock = vi.fn<() => UseReleaseVersionMediaResult>();
const getCurrentUserMock = vi.fn();
const getReleaseVersionCapabilitiesMock = vi.fn();

vi.mock("./useEpisodeVersionEditor", () => ({
  useEpisodeVersionEditor: () => useEpisodeVersionEditorMock(),
}));

vi.mock("./useReleaseVersionMedia", () => ({
  useReleaseVersionMedia: () => useReleaseVersionMediaMock(),
}));

vi.mock("./ReleaseVersionNotesTab", () => ({
  ReleaseVersionNotesTab: ({ versionId }: { versionId: number }) => (
    <div data-testid="release-version-notes-tab">Notes {versionId}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  AUTH_SESSION_CHANGED_EVENT: "team4s:auth-session-changed",
  getAuthSessionSnapshot: () => ({
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: "Admin",
  }),
  getCurrentUser: () => getCurrentUserMock(),
  getReleaseVersionCapabilities: (...args: unknown[]) =>
    getReleaseVersionCapabilitiesMock(...args),
}));

import { EpisodeVersionEditorPage } from "./EpisodeVersionEditorPage";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  useSearchParamsMock.mockReturnValue({
    get: () => null as string | null,
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function mockPlatformAdminScope() {
  getCurrentUserMock.mockResolvedValue({
    data: { id: 1, display_name: "Admin", is_platform_admin: true },
  });
  getReleaseVersionCapabilitiesMock.mockResolvedValue({
    data: {
      can_view_media: true,
      can_upload_media: true,
      can_update_media: true,
      can_delete_media: true,
      can_edit_notes: true,
    },
  });
}

function mockContributorScope(capabilities: {
  can_view_media: boolean;
  can_upload_media?: boolean;
  can_update_media?: boolean;
  can_delete_media?: boolean;
  can_edit_notes: boolean;
}) {
  getCurrentUserMock.mockResolvedValue({
    data: { id: 2, display_name: "Contributor", is_platform_admin: false },
  });
  getReleaseVersionCapabilitiesMock.mockResolvedValue({
    data: {
      can_view_media: capabilities.can_view_media,
      can_upload_media: capabilities.can_upload_media ?? false,
      can_update_media: capabilities.can_update_media ?? false,
      can_delete_media: capabilities.can_delete_media ?? false,
      can_edit_notes: capabilities.can_edit_notes,
    },
  });
}

function makeEditorState() {
  return {
    contextData: {
      version: {
        id: 42,
        anime_id: 1,
        episode_number: 1,
        release_version: "v1",
        duration_seconds: null,
      },
      selected_groups: [{ id: 10, name: "SubGroup" }],
      anime_title: "Test Anime",
      anime_folder_path: "C:/anime/Test Anime",
    },
    formState: {
      title: "",
      mediaProvider: "",
      mediaItemID: "",
      videoQuality: "",
      subtitleType: "",
      releaseDate: "",
      streamURL: "",
      durationSeconds: "",
    },
    setFormState: vi.fn(),
    selectedGroups: [
      { id: 10, name: "SubGroup", slug: "subgroup", logo_url: null },
    ],
    folderPath: "C:/anime/Test Anime",
    availableFiles: [],
    selectedFile: null,
    showFilePanel: false,
    setShowFilePanel: vi.fn(),
    advancedMode: false,
    setAdvancedMode: vi.fn(),
    groupQuery: "",
    setGroupQuery: vi.fn(),
    groupResults: [],
    isLoading: false,
    isSaving: false,
    isDeleting: false,
    isScanning: false,
    isSearching: false,
    errorMessage: null,
    successMessage: null,
    searchMessage: null,
    hasUnsavedChanges: false,
    handleScanFolder: vi.fn(),
    applyFile: vi.fn(),
    addGroup: vi.fn(),
    removeGroup: vi.fn(),
    handleSave: vi.fn(),
    handleDelete: vi.fn(),
  };
}

function makeMediaState(
  error: string | null = null,
): UseReleaseVersionMediaResult {
  return {
    items: [],
    isLoading: false,
    error,
    reload: vi.fn(),
    uploadItems: [],
    startUpload: vi.fn().mockResolvedValue(undefined),
    retryUpload: vi.fn().mockResolvedValue(undefined),
    clearUploadQueue: vi.fn(),
    patchItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue(undefined),
    patchError: null,
    deleteError: null,
    reorderError: null,
  };
}

describe("EpisodeVersionEditorPage media tab", () => {
  it("does not render the admin tab shell until user and release capabilities are loaded", async () => {
    const user = deferred<{
      data: { id: number; display_name: string; is_platform_admin: boolean };
    }>();
    const capabilities = deferred<{
      data: {
        can_view_media: boolean;
        can_upload_media: boolean;
        can_update_media: boolean;
        can_delete_media: boolean;
        can_edit_notes: boolean;
      };
    }>();
    getCurrentUserMock.mockReturnValue(user.promise);
    getReleaseVersionCapabilitiesMock.mockReturnValue(capabilities.promise);
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    expect(screen.getByText("Berechtigungen werden geladen...")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Informationen" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Segmente" })).toBeNull();

    user.resolve({
      data: { id: 1, display_name: "Admin", is_platform_admin: true },
    });
    capabilities.resolve({
      data: {
        can_view_media: true,
        can_upload_media: true,
        can_update_media: true,
        can_delete_media: true,
        can_edit_notes: true,
      },
    });

    expect(
      await screen.findByRole("button", { name: "Informationen" }),
    ).not.toBeNull();
  });

  it("renders the Media / Assets tab button", async () => {
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    expect(
      await screen.findByRole("button", { name: "Media / Assets" }),
    ).not.toBeNull();
  });

  it("shows the context card with fansub and release version on the media tab", async () => {
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Media / Assets" }),
    );

    expect(screen.getAllByText("SubGroup").length).toBeGreaterThan(0);
    expect(screen.getAllByText("v1").length).toBeGreaterThan(0);
  });

  it("keeps the editor shell visible when the media section reports an API error", async () => {
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState("API Fehler"));

    render(<EpisodeVersionEditorPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Media / Assets" }),
    );

    expect(screen.getByText(/API Fehler/i)).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Informationen" }),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Segmente" })).not.toBeNull();
  });

  it("shows only the media workspace for non-platform users with media capability", async () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "tab" ? "informationen" : null),
    });
    mockContributorScope({ can_view_media: true, can_edit_notes: false });
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    const mediaTab = await screen.findByRole("button", {
      name: "Media / Assets",
    });
    fireEvent.click(mediaTab);

    await waitFor(() => {
      expect(screen.getByText("Fansub-Gruppe")).not.toBeNull();
    });

    expect(
      screen.queryByRole("button", { name: "Notizen / Beiträge" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Informationen" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Segmente" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Speichern" })).toBeNull();
  });

  it("shows only notes for non-platform users with notes capability", async () => {
    mockContributorScope({ can_view_media: false, can_edit_notes: true });
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    const notesTab = await screen.findByRole("button", {
      name: "Notizen / Beiträge",
    });
    fireEvent.click(notesTab);

    expect(
      await screen.findByTestId("release-version-notes-tab"),
    ).not.toBeNull();

    expect(
      screen.queryByRole("button", { name: "Media / Assets" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Informationen" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Speichern" })).toBeNull();
  });

  it("does not expose editor tabs or admin actions for non-platform users without release capabilities", async () => {
    mockContributorScope({ can_view_media: false, can_edit_notes: false });
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    await waitFor(() => {
      expect(getReleaseVersionCapabilitiesMock).toHaveBeenCalledWith(42);
    });

    expect(
      screen.getByText("Kein Zugriff auf diese Release-Version."),
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: "Media / Assets" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Notizen / Beiträge" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Informationen" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Speichern" })).toBeNull();
  });

  it("zeigt 'Zur Fansubgruppe'-Link auf /admin/fansubs/10/edit wenn Gruppe bekannt", async () => {
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    // Admin-Tabs laden lassen
    await screen.findByRole("button", { name: "Informationen" });

    const links = screen.getAllByRole("link", { name: "Zur Fansubgruppe" });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute("href")).toBe("/admin/fansubs/10/edit");
  });

  it("zeigt groupName in der Subtitle als Link zur Fansubgruppe", async () => {
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    await screen.findByRole("button", { name: "Informationen" });

    // next/link ist als <a> gemockt — suche nach dem Link mit Text "SubGroup"
    const subtitleLink = screen.getByRole("link", { name: "SubGroup" });
    expect(subtitleLink.getAttribute("href")).toBe("/admin/fansubs/10/edit");
  });
});
