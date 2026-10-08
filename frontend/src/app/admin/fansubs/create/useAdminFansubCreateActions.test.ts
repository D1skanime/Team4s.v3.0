// Function-level tests for the extracted action hook (174-14, D-25). These
// check that the function behind each button does the right thing — calls
// the right API with the right arguments, sets the right state, follows the
// right error path — without rendering or clicking anything. UI behavior
// (visible, clickable, order, presentation) is verified live per the
// 174-UAT-CHECKLIST, not here.

import { createElement, type FormEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FansubAlias, FansubGroup } from "@/types/fansub";

import type { CommunityLinkDraft, FormState } from "./adminFansubCreateHelpers";

const createFansubAliasMock = vi.fn();
const createFansubGroupMock = vi.fn();
const deleteFansubAliasMock = vi.fn();
const getFansubAliasesMock = vi.fn();
const getFansubByIDMock = vi.fn();
const updateFansubGroupMock = vi.fn();
const createFansubLinkMock = vi.fn();
const updateFansubLinkMock = vi.fn();
const deleteFansubLinkMock = vi.fn();

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  createFansubAlias: (...args: unknown[]) => createFansubAliasMock(...args),
  createFansubGroup: (...args: unknown[]) => createFansubGroupMock(...args),
  deleteFansubAlias: (...args: unknown[]) => deleteFansubAliasMock(...args),
  getFansubAliases: (...args: unknown[]) => getFansubAliasesMock(...args),
  getFansubByID: (...args: unknown[]) => getFansubByIDMock(...args),
  updateFansubGroup: (...args: unknown[]) => updateFansubGroupMock(...args),
  createFansubLink: (...args: unknown[]) => createFansubLinkMock(...args),
  updateFansubLink: (...args: unknown[]) => updateFansubLinkMock(...args),
  deleteFansubLink: (...args: unknown[]) => deleteFansubLinkMock(...args),
}));

import { ApiError } from "@/lib/api";
import { useAdminFansubCreateActions } from "./useAdminFansubCreateActions";

function fansubGroupFixture(overrides: Partial<FansubGroup> = {}): FansubGroup {
  return {
    id: 1,
    slug: "neue-gruppe",
    name: "Neue Gruppe",
    logo_id: null,
    banner_id: null,
    logo_url: null,
    banner_url: null,
    founded_year: null,
    dissolved_year: null,
    status: "active",
    website_url: null,
    discord_url: null,
    irc_url: null,
    country: null,
    anime_relations_count: 0,
    projects_count: 0,
    release_versions_count: 0,
    members_count: 0,
    aliases_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function fansubAliasFixture(overrides: Partial<FansubAlias> = {}): FansubAlias {
  return {
    id: 1,
    fansub_group_id: 1,
    alias: "Alias",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function baseForm(overrides: Partial<FormState> = {}): FormState {
  return {
    name: "Neue Gruppe",
    slug: "neue-gruppe",
    status: "active",
    groupType: "group",
    country: "",
    foundedYear: "",
    dissolvedYear: "",
    ...overrides,
  };
}

function fakeSubmitEvent(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

describe("useAdminFansubCreateActions", () => {
  const setCreatedGroup = vi.fn();
  const setForm = vi.fn();
  const setInitialForm = vi.fn();
  const setAliases = vi.fn();
  const setAliasDrafts = vi.fn();
  const setInitialAliasDrafts = vi.fn();
  const setAliasInput = vi.fn();
  const setAliasError = vi.fn();
  const setAliasBusy = vi.fn();
  const setLinks = vi.fn();
  const setInitialLinks = vi.fn();
  const setLogoMedia = vi.fn();
  const setInitialLogoMedia = vi.fn();
  const setBannerMedia = vi.fn();
  const setInitialBannerMedia = vi.fn();
  const setManualSlug = vi.fn();
  const setSaving = vi.fn();
  const setError = vi.fn();
  const setToast = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  function captureActions(
    overrides: Partial<Parameters<typeof useAdminFansubCreateActions>[0]> = {},
  ): ReturnType<typeof useAdminFansubCreateActions> {
    let captured: ReturnType<typeof useAdminFansubCreateActions> | null = null;

    function Harness() {
      // Test-only hook harness: renderToStaticMarkup runs synchronously, so
      // capture the hook's return value for direct assertions (no DOM).
      // eslint-disable-next-line react-hooks/globals
      captured = useAdminFansubCreateActions({
        createdGroup: null,
        setCreatedGroup,
        form: baseForm(),
        setForm,
        setInitialForm,
        aliases: [],
        setAliases,
        aliasDrafts: [],
        setAliasDrafts,
        setInitialAliasDrafts,
        aliasInput: "",
        setAliasInput,
        setAliasError,
        setAliasBusy,
        links: [],
        setLinks,
        initialLinks: [],
        setInitialLinks,
        logoMedia: null,
        setLogoMedia,
        setInitialLogoMedia,
        bannerMedia: null,
        setBannerMedia,
        setInitialBannerMedia,
        setManualSlug,
        setSaving,
        hasRuntimeAuthToken: true,
        invalid: false,
        setError,
        setToast,
        ...overrides,
      });
      return null;
    }

    renderToStaticMarkup(createElement(Harness));
    if (!captured) throw new Error("Hook capture failed");
    return captured;
  }

  describe("addAlias", () => {
    it("before the group exists: only changes the local draft list (sorted), no API call", async () => {
      const actions = captureActions({ aliasInput: "Neu", aliasDrafts: ["Alt"] });

      await actions.addAlias();

      expect(createFansubAliasMock).not.toHaveBeenCalled();
      expect(setAliasBusy).toHaveBeenNthCalledWith(1, true);
      expect(setAliasDrafts).toHaveBeenCalledTimes(1);
      const updater = setAliasDrafts.mock.calls[0][0] as (
        current: string[],
      ) => string[];
      expect(updater(["Alt"])).toEqual(["Alt", "Neu"]);
      expect(setAliasInput).toHaveBeenCalledWith("");
    });

    it("duplicate alias (case-insensitive): sets the current error text, no API call", async () => {
      const actions = captureActions({
        aliasInput: "alt",
        aliasDrafts: ["Alt"],
      });

      await actions.addAlias();

      expect(setAliasError).toHaveBeenCalledWith("Tag existiert bereits.");
      expect(createFansubAliasMock).not.toHaveBeenCalled();
      expect(setAliasDrafts).not.toHaveBeenCalled();
    });

    it("after creation: calls createFansubAlias with the trimmed value and updates list/draft/input/toast", async () => {
      const group = fansubGroupFixture({ id: 5 });
      const existingAlias = fansubAliasFixture({ id: 1, alias: "Alt" });
      createFansubAliasMock.mockResolvedValue({
        data: fansubAliasFixture({ id: 2, alias: "Neu" }),
      });
      const actions = captureActions({
        createdGroup: group,
        aliases: [existingAlias],
        aliasInput: "  Neu  ",
      });

      await actions.addAlias();

      expect(createFansubAliasMock).toHaveBeenCalledWith(5, { alias: "Neu" });
      expect(setAliases).toHaveBeenCalledWith([existingAlias, fansubAliasFixture({ id: 2, alias: "Neu" })]);
      expect(setAliasDrafts).toHaveBeenCalledWith(["Alt", "Neu"]);
      expect(setInitialAliasDrafts).toHaveBeenCalledWith(["Alt", "Neu"]);
      expect(setAliasInput).toHaveBeenCalledWith("");
      expect(setToast).toHaveBeenCalledWith("Tag hinzugefügt.");
    });

    it("API failure: sets the error message via errMessage and resets the busy flag", async () => {
      const group = fansubGroupFixture({ id: 5 });
      createFansubAliasMock.mockRejectedValue(new ApiError(500, "Serverfehler."));
      const actions = captureActions({ createdGroup: group, aliasInput: "Neu" });

      await actions.addAlias();

      expect(setError).toHaveBeenCalledWith("(500) Serverfehler.");
      expect(setAliasBusy).toHaveBeenLastCalledWith(false);
    });
  });

  describe("removeAlias", () => {
    it("before the group exists: removes the alias from the local draft list only, no API call", async () => {
      const actions = captureActions({ createdGroup: null });

      await actions.removeAlias("Alt");

      expect(deleteFansubAliasMock).not.toHaveBeenCalled();
      expect(setAliasDrafts).toHaveBeenCalledTimes(1);
      const updater = setAliasDrafts.mock.calls[0][0] as (
        current: string[],
      ) => string[];
      expect(updater(["Alt", "Neu"])).toEqual(["Neu"]);
    });

    it("after creation: calls deleteFansubAlias and updates the alias/draft lists", async () => {
      const group = fansubGroupFixture({ id: 5 });
      const alias = fansubAliasFixture({ id: 9, alias: "Alt" });
      deleteFansubAliasMock.mockResolvedValue({ data: {} });
      const actions = captureActions({ createdGroup: group, aliases: [alias] });

      await actions.removeAlias("Alt");

      expect(deleteFansubAliasMock).toHaveBeenCalledWith(5, 9);
      expect(setAliases).toHaveBeenCalledWith([]);
      expect(setAliasDrafts).toHaveBeenCalledWith([]);
      expect(setInitialAliasDrafts).toHaveBeenCalledWith([]);
      expect(setToast).toHaveBeenCalledWith("Tag entfernt.");
    });
  });

  describe("save (create)", () => {
    it("validation failure (invalid=true): does not call the create API", async () => {
      const actions = captureActions({ invalid: true });

      await actions.save(fakeSubmitEvent());

      expect(createFansubGroupMock).not.toHaveBeenCalled();
      expect(setSaving).not.toHaveBeenCalled();
    });

    it("success: calls createFansubGroup with the formToCreatePayload shape and refreshes via getFansubByID/getFansubAliases", async () => {
      const createdGroup = fansubGroupFixture({ id: 77, name: "Neue Gruppe", slug: "neue-gruppe" });
      createFansubGroupMock.mockResolvedValue({ data: createdGroup });
      getFansubByIDMock.mockResolvedValue({ data: createdGroup });
      getFansubAliasesMock.mockResolvedValue({ data: [] });

      const actions = captureActions({
        form: baseForm({ foundedYear: "2015" }),
        aliasDrafts: ["Erstalias"],
        links: [] as CommunityLinkDraft[],
      });

      await actions.save(fakeSubmitEvent());

      expect(createFansubGroupMock).toHaveBeenCalledWith({
        name: "Neue Gruppe",
        slug: "neue-gruppe",
        status: "active",
        group_type: "group",
        country: null,
        founded_year: 2015,
        dissolved_year: null,
      });
      expect(createFansubAliasMock).toHaveBeenCalledWith(77, { alias: "Erstalias" });
      expect(getFansubByIDMock).toHaveBeenCalledWith(77);
      expect(getFansubAliasesMock).toHaveBeenCalledWith(77);
      expect(setToast).toHaveBeenCalledWith(
        "Fansub angelegt. Medien können jetzt direkt über den DB-Asset-Flow hochgeladen werden.",
      );
      expect(setSaving).toHaveBeenLastCalledWith(false);
    });

    it("API failure: sets the error message and resets saving", async () => {
      createFansubGroupMock.mockRejectedValue(new ApiError(409, "Slug vergeben."));
      const actions = captureActions({ aliasDrafts: [], links: [] });

      await actions.save(fakeSubmitEvent());

      expect(setError).toHaveBeenCalledWith("(409) Slug vergeben.");
      expect(setSaving).toHaveBeenLastCalledWith(false);
    });
  });

  describe("save (patch)", () => {
    it("calls updateFansubGroup with the patch payload and syncs changed links (create/update/delete)", async () => {
      const createdGroup = fansubGroupFixture({ id: 50 });
      updateFansubGroupMock.mockResolvedValue({ data: createdGroup });
      getFansubByIDMock.mockResolvedValue({ data: createdGroup });
      getFansubAliasesMock.mockResolvedValue({ data: [] });
      createFansubLinkMock.mockResolvedValue({ data: {} });
      updateFansubLinkMock.mockResolvedValue({ data: {} });
      deleteFansubLinkMock.mockResolvedValue({ data: {} });

      const initialLinks: CommunityLinkDraft[] = [
        { key: "a", id: 1, link_type: "website", name: "", url: "https://old.example/" },
        { key: "b", id: 2, link_type: "discord", name: "", url: "https://gone.example/" },
      ];
      const links: CommunityLinkDraft[] = [
        { key: "a", id: 1, link_type: "website", name: "", url: "https://new.example/" },
        { key: "c", id: null, link_type: "github", name: "", url: "https://github.example/" },
      ];

      const actions = captureActions({
        createdGroup,
        form: baseForm({ country: "DE" }),
        logoMedia: { id: 3, publicURL: "https://logo.example/" },
        bannerMedia: null,
        initialLinks,
        links,
      });

      await actions.save(fakeSubmitEvent());

      expect(updateFansubGroupMock).toHaveBeenCalledWith(50, {
        name: "Neue Gruppe",
        slug: "neue-gruppe",
        status: "active",
        group_type: "group",
        country: "DE",
        founded_year: null,
        dissolved_year: null,
        logo_id: 3,
        banner_id: null,
        logo_url: "https://logo.example/",
        banner_url: null,
      });
      expect(updateFansubLinkMock).toHaveBeenCalledWith(50, 1, {
        link_type: "website",
        name: null,
        url: "https://new.example/",
      });
      expect(deleteFansubLinkMock).toHaveBeenCalledWith(50, 2);
      expect(createFansubLinkMock).toHaveBeenCalledWith(50, {
        link_type: "github",
        name: null,
        url: "https://github.example/",
      });
      expect(getFansubByIDMock).toHaveBeenCalledWith(50);
      expect(setToast).toHaveBeenCalledWith("Änderungen gespeichert.");
    });
  });

  describe("refreshCreatedState", () => {
    it("maps the server response into form/links/media/alias setters", async () => {
      const refreshedGroup = fansubGroupFixture({
        id: 701,
        name: "Legacy Gruppe",
        slug: "legacy-gruppe",
        country: "DE",
        founded_year: 2010,
        website_url: "https://legacy.example/",
      });
      getFansubByIDMock.mockResolvedValue({ data: refreshedGroup });
      getFansubAliasesMock.mockResolvedValue({
        data: [fansubAliasFixture({ id: 1, alias: "Zebra" }), fansubAliasFixture({ id: 2, alias: "Apfel" })],
      });

      const actions = captureActions();

      await actions.refreshCreatedState(701);

      expect(setCreatedGroup).toHaveBeenCalledWith(refreshedGroup);
      expect(setForm).toHaveBeenCalledWith({
        name: "Legacy Gruppe",
        slug: "legacy-gruppe",
        status: "active",
        groupType: "group",
        country: "DE",
        foundedYear: "2010",
        dissolvedYear: "",
      });
      expect(setAliases.mock.calls[0][0].map((a: FansubAlias) => a.alias)).toEqual(["Apfel", "Zebra"]);
      expect(setAliasDrafts).toHaveBeenCalledWith(["Apfel", "Zebra"]);
      expect(setLinks.mock.calls[0][0]).toEqual([
        {
          key: "-1-0",
          id: -1,
          link_type: "website",
          name: "",
          url: "https://legacy.example/",
        },
      ]);
      expect(setManualSlug).toHaveBeenCalledWith(false);
    });
  });
});
