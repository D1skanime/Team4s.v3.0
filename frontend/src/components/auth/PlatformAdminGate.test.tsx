// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const apiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getFansubList: vi.fn(),
}));

const useAuthSessionMock = vi.hoisted(() =>
  vi.fn(() => ({ hasAccessToken: true, isClientInitialized: true })),
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
});
