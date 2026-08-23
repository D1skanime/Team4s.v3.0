// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

const apiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getFansubList: vi.fn(),
}));

const useAuthSessionMock = vi.hoisted(() =>
  vi.fn(() => ({
    hasAccessToken: true,
    hasRefreshToken: false,
    isClientInitialized: true,
  })),
);

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/useAuthSession", () => ({
  useAuthSession: () => useAuthSessionMock(),
}));

vi.mock("@/lib/api", () => ({
  getCurrentUser: (...args: unknown[]) => apiMocks.getCurrentUser(...args),
  getFansubList: (...args: unknown[]) => apiMocks.getFansubList(...args),
}));

import { PlatformAdminGate } from "./PlatformAdminGate";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function FansubListConsumer() {
  useEffect(() => {
    void apiMocks.getFansubList({ per_page: 1 });
  }, []);

  return <p>Fansub list consumer mounted</p>;
}

describe("PlatformAdminGate", () => {
  // --- Wave-0 RED: Regression für hasRefreshToken-only-Session (Pitfall 5 / T-80-01-02) ---
  //
  // Prüft, dass eine Session mit hasRefreshToken=true (aber hasAccessToken=false)
  // den Admin-Inhalt rendert und KEIN Logout-Flash auslöst.
  //
  // Hintergrund: PlatformAdminGate.tsx wurde in Plan 80-01 gefixt:
  // `if (!hasAccessToken && !hasRefreshToken)` statt `if (!hasAccessToken)`.
  // Dieser Test sichert die Regression ab, damit der Fix nicht versehentlich rückgängig gemacht wird.
  it("renders_admin_content_with_refresh_token_only", async () => {
    // hasAccessToken=false, hasRefreshToken=true → Gate soll Kinder rendern (kein Logout-State)
    useAuthSessionMock.mockReturnValueOnce({
      hasAccessToken: false,
      hasRefreshToken: true,
      isClientInitialized: true,
    });

    apiMocks.getCurrentUser.mockResolvedValue({
      data: { id: 1, display_name: "Admin", is_platform_admin: true },
    });

    render(
      <PlatformAdminGate>
        <p>Admin-Inhalt sichtbar</p>
      </PlatformAdminGate>,
    );

    // Das Gate darf nicht in einen Logout-Zustand wechseln.
    // Nach Ladephase muss Admin-Inhalt rendern (Platform-Admin bestätigt via getCurrentUser).
    expect(
      await screen.findByText("Admin-Inhalt sichtbar"),
    ).not.toBeNull();
  });

  it("does not mount children that would call getFansubList when access is denied", async () => {
    apiMocks.getCurrentUser.mockResolvedValue({
      data: { id: 7, display_name: "Contributor", is_platform_admin: false },
    });

    render(
      <PlatformAdminGate>
        <FansubListConsumer />
      </PlatformAdminGate>,
    );

    expect(
      await screen.findByText("Diese Ansicht ist dem Team4s-Admin vorbehalten."),
    ).not.toBeNull();
    expect(screen.queryByText("Fansub list consumer mounted")).toBeNull();
    expect(apiMocks.getFansubList).not.toHaveBeenCalled();
  });

  it("mounts children after platform-admin access is confirmed", async () => {
    apiMocks.getCurrentUser.mockResolvedValue({
      data: { id: 1, display_name: "Admin", is_platform_admin: true },
    });

    render(
      <PlatformAdminGate>
        <FansubListConsumer />
      </PlatformAdminGate>,
    );

    expect(await screen.findByText("Fansub list consumer mounted")).not.toBeNull();
    await waitFor(() => {
      expect(apiMocks.getFansubList).toHaveBeenCalledWith({ per_page: 1 });
    });
  });

  it("keeps children mounted across a simulated token refresh (no loading flash after first resolution)", async () => {
    apiMocks.getCurrentUser.mockResolvedValueOnce({
      data: { id: 1, display_name: "Admin", is_platform_admin: true },
    });

    const { rerender } = render(
      <PlatformAdminGate>
        <p data-testid="persistent-child">Admin-Inhalt sichtbar</p>
      </PlatformAdminGate>,
    );

    // First resolution completes: loading fallback disappears, child mounts.
    expect(await screen.findByTestId("persistent-child")).not.toBeNull();

    // Simulate a token refresh: useAuthSession() returns a changed hasAccessToken
    // value on the next render, which re-runs the resolution effect. The second
    // getCurrentUser() call is deliberately left pending (never resolves during
    // this test) to prove the loading fallback does not reappear while it is in flight.
    let releaseSecondCall: (() => void) | undefined;
    apiMocks.getCurrentUser.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseSecondCall = () =>
            resolve({
              data: { id: 1, display_name: "Admin", is_platform_admin: true },
            });
        }),
    );
    useAuthSessionMock.mockReturnValueOnce({
      hasAccessToken: false,
      hasRefreshToken: true,
      isClientInitialized: true,
    });

    rerender(
      <PlatformAdminGate>
        <p data-testid="persistent-child">Admin-Inhalt sichtbar</p>
      </PlatformAdminGate>,
    );

    // The persistent child must remain present continuously — never lost to the
    // loading fallback while the second (background) resolution is still pending.
    expect(screen.getByTestId("persistent-child")).not.toBeNull();
    expect(screen.queryByText("Berechtigungen werden geladen...")).toBeNull();

    // Drain the pending second call within act() so its state update is not
    // observed after the test completes.
    await act(async () => {
      releaseSecondCall?.();
      await Promise.resolve();
    });
  });
});
