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
const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    ...useSearchParamsMock(),
    toString: () => "",
  }),
  useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock }),
  usePathname: () => "/admin/episode-versions/42/edit",
}));

const useEpisodeVersionEditorMock = vi.fn();
const useReleaseVersionMediaMock = vi.fn<() => UseReleaseVersionMediaResult>();
const useEpisodeNeighborNavigationMock = vi.fn();
const getAuthSessionSnapshotMock = vi.fn();
const getCurrentUserMock = vi.fn();
const getReleaseVersionCapabilitiesMock = vi.fn();

vi.mock("./useEpisodeVersionEditor", () => ({
  useEpisodeVersionEditor: () => useEpisodeVersionEditorMock(),
}));

vi.mock("./useReleaseVersionMedia", () => ({
  useReleaseVersionMedia: () => useReleaseVersionMediaMock(),
}));

vi.mock("./useEpisodeNeighborNavigation", () => ({
  useEpisodeNeighborNavigation: () => useEpisodeNeighborNavigationMock(),
}));

vi.mock("./EpisodeNavigationControls", () => ({
  EpisodeNavigationControls: () => (
    <div data-testid="episode-navigation-controls" />
  ),
}));

vi.mock("./ReleaseVersionNotesTab", () => ({
  ReleaseVersionNotesTab: ({ versionId }: { versionId: number }) => (
    <div data-testid="release-version-notes-tab">Notes {versionId}</div>
  ),
}));

vi.mock("./SegmenteTab", () => ({
  SegmenteTab: () => <div data-testid="segmente-tab">Segmente</div>,
}));

vi.mock("@/lib/api", () => ({
  AUTH_SESSION_CHANGED_EVENT: "team4s:auth-session-changed",
  getAuthSessionSnapshot: () => getAuthSessionSnapshotMock(),
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
  useEpisodeNeighborNavigationMock.mockReturnValue({
    isLoading: false,
    error: null,
    currentIndex: -1,
    totalCount: 0,
    prevVersionId: null,
    prevEpisodeNumber: null,
    nextVersionId: null,
    nextEpisodeNumber: null,
  });
  getAuthSessionSnapshotMock.mockReturnValue({
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: "Admin",
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
      can_manage_segments: true,
    },
  });
}

function mockContributorScope(capabilities: {
  can_view_media: boolean;
  can_upload_media?: boolean;
  can_update_media?: boolean;
  can_delete_media?: boolean;
  can_edit_notes: boolean;
  can_manage_segments?: boolean;
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
      can_manage_segments: capabilities.can_manage_segments ?? false,
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
        crc32: "1CC0A2E3",
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
      crc32: "1CC0A2E3",
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
        can_manage_segments: boolean;
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
        can_manage_segments: true,
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

  it("loads release capabilities when only a refresh session is present", async () => {
    getAuthSessionSnapshotMock.mockReturnValue({
      hasAccessToken: false,
      hasRefreshToken: true,
      displayName: "Admin",
    });
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    expect(
      await screen.findByRole("button", { name: "Informationen" }),
    ).not.toBeNull();
    expect(getReleaseVersionCapabilitiesMock).toHaveBeenCalledWith(42);
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

  it("shows only segments for non-platform users with segment capability", async () => {
    mockContributorScope({
      can_view_media: false,
      can_edit_notes: false,
      can_manage_segments: true,
    });
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    expect(await screen.findByRole("button", { name: "Segmente" })).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: "Media / Assets" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Notizen / BeitrÃ¤ge" }),
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

  it("führt 'Zurück' aus dem Fansub-Kontext zurück zum Release-Tab der Gruppe", async () => {
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    await screen.findByRole("button", { name: "Informationen" });

    const backLink = screen.getByRole("link", { name: "Zurück" });
    expect(backLink.getAttribute("href")).toBe(
      "/admin/fansubs/10/edit?tab=releases",
    );
  });

  it("bevorzugt einen sicheren return_to-Rückweg vor der ersten Release-Gruppe", async () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) =>
        key === "return_to" ? "/admin/fansubs/88/edit?tab=releases" : null,
    });
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    await screen.findByRole("button", { name: "Informationen" });

    const backLink = screen.getByRole("link", { name: "Zurück" });
    expect(backLink.getAttribute("href")).toBe(
      "/admin/fansubs/88/edit?tab=releases",
    );
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

  it("shows the CRC32 field on the information tab", async () => {
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue(makeEditorState());
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    await screen.findByRole("button", { name: "Informationen" });

    expect(screen.getByText("CRC32")).not.toBeNull();
    expect(screen.getByDisplayValue("1CC0A2E3")).not.toBeNull();
  });

  it("uses the project DatePicker for the release date", async () => {
    mockPlatformAdminScope();
    useEpisodeVersionEditorMock.mockReturnValue({
      ...makeEditorState(),
      formState: {
        ...makeEditorState().formState,
        releaseDate: "2009-12-24",
      },
    });
    useReleaseVersionMediaMock.mockReturnValue(makeMediaState());

    render(<EpisodeVersionEditorPage />);

    await screen.findByRole("button", { name: "Informationen" });

    expect(
      screen.getByRole("button", { name: "Release-Datum auswählen" }),
    ).not.toBeNull();
    expect(screen.getByText("24.12.2009")).not.toBeNull();
  });
});
