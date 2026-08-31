// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshKeycloakToken = vi.fn();

vi.mock("@/lib/keycloakAuth", () => ({
  isKeycloakEnabled: () => true,
  logoutFromKeycloak: vi.fn(),
  refreshKeycloakToken: (...args: unknown[]) => refreshKeycloakToken(...args),
}));

import { ApiError, clearAuthSession, getOwnDashboard } from "./api";
import type { OwnDashboardResponse } from "@/types/dashboard";

const dashboardData: OwnDashboardResponse = {
  data: {
    has_member_profile: true,
    total_points: 1250,
    badges_count: 6,
    projects_count: 3,
    images_count: 42,
    contributions_count: 17,
    role_volume: [{ role_code: "translator", count: 12 }],
    category_progress: [
      {
        family: "contribution_projects",
        current_tier: "silver",
        current_count: 8,
        next_threshold: 15,
      },
    ],
    pending_claims: [],
    pending_group_media_reviews: [],
    pending_release_reviews: [],
  },
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("own dashboard API contract", () => {
  beforeEach(() => {
    clearAuthSession();
  });

  afterEach(() => {
    clearAuthSession();
    refreshKeycloakToken.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("resolves getOwnDashboard() to the parsed OwnDashboardResponse body on a 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(dashboardData));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getOwnDashboard()).resolves.toEqual(dashboardData);
  });

  it('calls exactly /api/v1/me/dashboard with cache: "no-store"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(dashboardData));
    vi.stubGlobal("fetch", fetchMock);

    await getOwnDashboard();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toMatch(/\/api\/v1\/me\/dashboard$/);
    expect(init).toEqual(expect.objectContaining({ cache: "no-store" }));
  });

  it("rejects with an ApiError carrying status/message/code on a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Nicht angemeldet.",
          },
        },
        401,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getOwnDashboard()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Nicht angemeldet.",
    } satisfies Partial<ApiError>);
  });
});
