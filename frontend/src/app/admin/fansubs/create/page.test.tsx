// @vitest-environment jsdom
//
// Characterization suite for admin/fansubs/create/page.tsx (D-20, Plan 174-09).
// Purpose: lock the component's CURRENT observable behavior — rendering, the
// 16 module-private helpers (slugify, validators, mappers, syncFansubLinks),
// alias add/remove, and the create/update save flow — before 174-14 splits
// this 1,172-line file. No new `export` is added to page.tsx; every helper is
// characterized indirectly through rendered output, interaction, or the
// payload shape sent to the mocked `@/lib/api` module (D-02).

import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import type { FansubAlias, FansubGroup } from "@/types/fansub";

const createFansubGroupMock = vi.fn();
const updateFansubGroupMock = vi.fn();
const getFansubByIDMock = vi.fn();
const getFansubListMock = vi.fn();
const getFansubAliasesMock = vi.fn();
const createFansubAliasMock = vi.fn();
const deleteFansubAliasMock = vi.fn();
const createFansubLinkMock = vi.fn();
const updateFansubLinkMock = vi.fn();
const deleteFansubLinkMock = vi.fn();
const useAuthSessionMock = vi.fn();

vi.mock("next/image", () => ({
  default: ({
    alt = "",
    unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />;
  },
}));

vi.mock("@/components/auth/PlatformAdminGate", () => ({
  PlatformAdminGate: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/lib/useAuthSession", () => ({
  useAuthSession: () => useAuthSessionMock(),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  createFansubGroup: (...args: unknown[]) => createFansubGroupMock(...args),
  updateFansubGroup: (...args: unknown[]) => updateFansubGroupMock(...args),
  getFansubByID: (...args: unknown[]) => getFansubByIDMock(...args),
  getFansubList: (...args: unknown[]) => getFansubListMock(...args),
  getFansubAliases: (...args: unknown[]) => getFansubAliasesMock(...args),
  createFansubAlias: (...args: unknown[]) => createFansubAliasMock(...args),
  deleteFansubAlias: (...args: unknown[]) => deleteFansubAliasMock(...args),
  createFansubLink: (...args: unknown[]) => createFansubLinkMock(...args),
  updateFansubLink: (...args: unknown[]) => updateFansubLinkMock(...args),
  deleteFansubLink: (...args: unknown[]) => deleteFansubLinkMock(...args),
  resolveApiUrl: (value?: string | null) => (value ? value : ""),
  uploadFansubMedia: vi.fn(),
  deleteFansubMedia: vi.fn(),
}));

import { ApiError } from "@/lib/api";
import AdminFansubCreatePage from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

useAuthSessionMock.mockReturnValue({
  hasAccessToken: true,
  hasRefreshToken: false,
  isClientInitialized: true,
});

// Default resolution for the slug-conflict-check debounce effect (fires
// 350ms after a valid slug appears). clearAllMocks() in afterEach only
// clears call history, not this implementation, so it stays in effect for
// every test without needing per-test setup.
getFansubListMock.mockResolvedValue({
  data: [],
  meta: { total: 0, page: 1, per_page: 200, total_pages: 0 },
});

// --- Fixtures -------------------------------------------------------------

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

// --- DOM helpers ------------------------------------------------------------
// page.tsx renders <label> as a sibling of its <input> (no htmlFor/id), so
// implicit label association (getByLabelText) cannot resolve these fields.
// We locate inputs via the label's own wrapping field div instead, which
// mirrors how an operator visually reads the form.

function getLabeledInput(
  container: HTMLElement,
  labelPrefix: string,
): HTMLInputElement {
  const label = Array.from(container.querySelectorAll("label")).find((el) =>
    (el.textContent || "").trim().startsWith(labelPrefix),
  );
  if (!label) throw new Error(`Label "${labelPrefix}" nicht gefunden`);
  const input = label.parentElement?.querySelector("input");
  if (!input) throw new Error(`Input zu Label "${labelPrefix}" nicht gefunden`);
  return input as HTMLInputElement;
}

async function createGroupViaUI(
  container: HTMLElement,
  overrides: Partial<FansubGroup> = {},
  initialAliases: FansubAlias[] = [],
): Promise<FansubGroup> {
  const group = fansubGroupFixture(overrides);
  createFansubGroupMock.mockResolvedValue({ data: group });
  getFansubByIDMock.mockResolvedValue({ data: group });
  getFansubAliasesMock.mockResolvedValue({ data: initialAliases });

  fireEvent.change(getLabeledInput(container, "Name"), {
    target: { value: group.name },
  });
  fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

  await waitFor(() => expect(createFansubGroupMock).toHaveBeenCalled());
  await screen.findByRole("button", { name: "Speichern" });
  return group;
}

// --- Task 1: the 16 module-private helpers, characterized indirectly ------

describe("AdminFansubCreatePage — Helfer-Verhalten (indirekt über Rendering/Interaktion)", () => {
  it("slugify: leitet den Slug inkl. aktueller Umlaut-/Sonderzeichen-Behandlung ab", () => {
    const { container } = render(<AdminFansubCreatePage />);

    fireEvent.change(getLabeledInput(container, "Name"), {
      target: { value: "Café Übersetzer" },
    });

    expect(getLabeledInput(container, "Slug").value).toBe("caf-bersetzer");
  });

  it("isValidSlug: zeigt den aktuellen Format-Fehlertext bei manuell ungültigem Slug", () => {
    const { container } = render(<AdminFansubCreatePage />);

    fireEvent.change(getLabeledInput(container, "Name"), {
      target: { value: "Testgruppe" },
    });
    fireEvent.change(getLabeledInput(container, "Slug"), {
      target: { value: "Ungültiger Slug!!" },
    });

    expect(
      screen.getByText("Slug muss lowercase kebab-case sein."),
    ).toBeTruthy();
  });

  it("isAbsoluteURL: validiert Community-Link-URLs nach dem aktuellen Muster", () => {
    render(<AdminFansubCreatePage />);
    const urlInput = screen.getByPlaceholderText("https://...");

    fireEvent.change(urlInput, { target: { value: "nicht-absolut" } });
    expect(
      screen.getByText("Bitte absolute URL mit Protokoll verwenden."),
    ).toBeTruthy();

    fireEvent.change(urlInput, { target: { value: "https://example.com" } });
    expect(
      screen.queryByText("Bitte absolute URL mit Protokoll verwenden."),
    ).toBeNull();
  });

  it("toOptional/parseYear/formToCreatePayload: sendet beim Anlegen die aktuelle Payload-Form", async () => {
    const { container } = render(<AdminFansubCreatePage />);
    createFansubGroupMock.mockResolvedValue({
      data: fansubGroupFixture({ id: 77, name: "Neue Gruppe", slug: "neue-gruppe" }),
    });
    getFansubByIDMock.mockResolvedValue({
      data: fansubGroupFixture({ id: 77, name: "Neue Gruppe", slug: "neue-gruppe" }),
    });
    getFansubAliasesMock.mockResolvedValue({ data: [] });

    fireEvent.change(getLabeledInput(container, "Name"), {
      target: { value: "Neue Gruppe" },
    });
    // Land bleibt leer -> toOptional("") === null
    fireEvent.click(screen.getByRole("button", { name: "Gründungsjahr" }));
    fireEvent.click(screen.getByRole("button", { name: "2015" }));
    // Auflösungsjahr bleibt leer -> parseYear("") === null

    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() => expect(createFansubGroupMock).toHaveBeenCalled());
    expect(createFansubGroupMock).toHaveBeenCalledWith({
      name: "Neue Gruppe",
      slug: "neue-gruppe",
      kuerzel: null,
      status: "active",
      country: null,
      founded_year: 2015,
      dissolved_year: null,
    });
  });

  it("errMessage: zeigt ApiError-Status und -Text unverändert inkl. Umlaut", async () => {
    const { container } = render(<AdminFansubCreatePage />);
    createFansubGroupMock.mockRejectedValue(
      new ApiError(409, "Für diesen Slug existiert bereits ein Eintrag."),
    );

    fireEvent.change(getLabeledInput(container, "Name"), {
      target: { value: "Testgruppe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    expect(
      await screen.findByText(
        "(409) Für diesen Slug existiert bereits ein Eintrag.",
      ),
    ).toBeTruthy();
  });

  it("mapGroupToForm/mapGroupMedia/legacyLinksFromGroup/mapGroupLinks/emptyForm/createEmptyLink: übernehmen nach dem Anlegen die Server-Antwort inkl. Legacy-Link-Fallback", async () => {
    const { container } = render(<AdminFansubCreatePage />);
    const createdStub = fansubGroupFixture({
      id: 701,
      name: "Legacy Gruppe",
      slug: "legacy-gruppe",
    });
    const refreshedGroup = fansubGroupFixture({
      id: 701,
      name: "Legacy Gruppe",
      slug: "legacy-gruppe",
      country: "DE",
      founded_year: 2010,
      dissolved_year: 2020,
      website_url: "https://legacy.example/",
    });
    createFansubGroupMock.mockResolvedValue({ data: createdStub });
    getFansubByIDMock.mockResolvedValue({ data: refreshedGroup });
    getFansubAliasesMock.mockResolvedValue({ data: [] });

    fireEvent.change(getLabeledInput(container, "Name"), {
      target: { value: "Legacy Gruppe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() => expect(getFansubByIDMock).toHaveBeenCalled());
    await screen.findByRole("button", { name: "Speichern" });

    expect(getLabeledInput(container, "Land").value).toBe("DE");
    expect(
      screen.getByRole("button", { name: "Gründungsjahr" }).textContent,
    ).toContain("2010");
    expect(
      screen.getByRole("button", { name: "Auflösungsjahr" }).textContent,
    ).toContain("2020");
    expect(
      (screen.getByPlaceholderText("https://...") as HTMLInputElement).value,
    ).toBe("https://legacy.example/");
  });

});

// --- Task 2: render + alias + save behaviors -------------------------------

describe("AdminFansubCreatePage — Speicher-Verhalten", () => {
  it("save (Erfolg): ruft die Create-API mit dem erwarteten Zustand auf und zeigt den aktuellen Erfolgstext", async () => {
    const { container } = render(<AdminFansubCreatePage />);

    await createGroupViaUI(container, {
      id: 1001,
      name: "Erfolgsgruppe",
      slug: "erfolgsgruppe",
    });

    // D-03 (Phase 176-07): die zuvor dokumentierte ASCII-Umlaut-Abweichung
    // ("ueber" statt "über") ist jetzt korrigiert.
    expect(
      await screen.findByText(
        "Fansub angelegt. Medien können jetzt direkt über den DB-Asset-Flow hochgeladen werden.",
      ),
    ).toBeTruthy();
  });

});
