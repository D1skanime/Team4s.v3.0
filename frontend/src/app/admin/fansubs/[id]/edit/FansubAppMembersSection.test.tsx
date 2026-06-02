// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const listFansubAppMembers = vi.fn();
const getFansubGroupCapabilities = vi.fn();
const searchFansubAppMemberCandidates = vi.fn();
const createFansubAppMember = vi.fn();
const updateFansubAppMemberRole = vi.fn();
const updateFansubAppMemberStatus = vi.fn();
const listFansubGroupInvitations = vi.fn();
const createFansubGroupInvitation = vi.fn();
const cancelFansubGroupInvitation = vi.fn();

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  listFansubAppMembers: (...args: unknown[]) => listFansubAppMembers(...args),
  getFansubGroupCapabilities: (...args: unknown[]) => getFansubGroupCapabilities(...args),
  searchFansubAppMemberCandidates: (...args: unknown[]) => searchFansubAppMemberCandidates(...args),
  createFansubAppMember: (...args: unknown[]) => createFansubAppMember(...args),
  updateFansubAppMemberRole: (...args: unknown[]) => updateFansubAppMemberRole(...args),
  updateFansubAppMemberStatus: (...args: unknown[]) => updateFansubAppMemberStatus(...args),
  listFansubGroupInvitations: (...args: unknown[]) => listFansubGroupInvitations(...args),
  createFansubGroupInvitation: (...args: unknown[]) => createFansubGroupInvitation(...args),
  cancelFansubGroupInvitation: (...args: unknown[]) => cancelFansubGroupInvitation(...args),
}));

import { FansubAppMembersSection } from "./FansubAppMembersSection";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FansubAppMembersSection", () => {
  it("renders current app members with active roles", async () => {
    getFansubGroupCapabilities.mockResolvedValue({
      data: {
        can_edit_group: true,
        can_manage_links: true,
        can_view_members: true,
        can_manage_members: true,
        can_edit_notes: true,
        can_view_invitations: true,
        can_create_invitation: true,
        can_cancel_invitation: true,
      },
    });
    listFansubAppMembers.mockResolvedValue({
      data: [
        {
          id: 21,
          fansub_group_id: 88,
          app_user_id: 11,
          status: "active",
          roles: ["fansub_lead", "editor"],
          created_at: "2026-05-16T08:10:00Z",
          updated_at: "2026-05-16T08:20:00Z",
          member: {
            member_id: 44,
            fansub_name: "Phase Admin",
          },
        },
      ],
    });
    listFansubGroupInvitations.mockResolvedValue({ data: [] });

    render(<FansubAppMembersSection fansubId={88} hasAccessToken />);

    expect(await screen.findByText("Phase Admin")).not.toBeNull();
    expect(screen.getAllByText("Fansub-Lead").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Editing").length).toBeGreaterThan(0);
    expect(screen.getByText("Aktiv")).not.toBeNull();
    expect(screen.queryByText("phase-admin@example.local")).toBeNull();
    expect(screen.queryByText(/phase 45 mvp/i)).toBeNull();
  });

  it("adds a new member through candidate search with selected roles", async () => {
    getFansubGroupCapabilities.mockResolvedValue({
      data: {
        can_edit_group: true,
        can_manage_links: true,
        can_view_members: true,
        can_manage_members: true,
        can_edit_notes: true,
        can_view_invitations: false,
        can_create_invitation: false,
        can_cancel_invitation: false,
      },
    });
    listFansubAppMembers
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: 22,
            fansub_group_id: 88,
            app_user_id: 12,
            status: "active",
            roles: ["fansub_lead", "editor"],
            created_at: "2026-05-16T08:15:00Z",
            updated_at: "2026-05-16T08:15:00Z",
            member: {
              member_id: 45,
              fansub_name: "Phase Member",
            },
          },
        ],
      });
    searchFansubAppMemberCandidates.mockResolvedValue({
      data: [
        {
          app_user_id: 12,
          member_id: 45,
          fansub_name: "Phase Member",
        },
      ],
    });
    createFansubAppMember.mockResolvedValue({ data: {} });

    render(<FansubAppMembersSection fansubId={88} hasAccessToken />);

    fireEvent.click(await screen.findByRole("button", { name: "Mitglied hinzufügen" }));

    const searchInput = await screen.findByRole("searchbox", {
      name: "Fansub-Nick suchen",
    });
    fireEvent.change(searchInput, { target: { value: "phase" } });

    const candidateButton = await screen.findByRole("button", { name: /Phase Member/ });
    fireEvent.click(candidateButton);

    expect(screen.getByText("Ausgewähltes Profil")).not.toBeNull();
    expect(screen.getByText("Aufgabe auswählen")).not.toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: /Editing/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Mitglied hinzufügen" }).at(-1) as HTMLElement);

    await waitFor(() => {
      expect(createFansubAppMember).toHaveBeenCalledWith(
        88,
        { app_user_id: 12, roles: ["editor"] },
      );
    });
  });

  it("creates an invitation and shows the one-time invite link", async () => {
    getFansubGroupCapabilities.mockResolvedValue({
      data: {
        can_edit_group: true,
        can_manage_links: true,
        can_view_members: true,
        can_manage_members: true,
        can_edit_notes: true,
        can_view_invitations: true,
        can_create_invitation: true,
        can_cancel_invitation: true,
      },
    });
    listFansubAppMembers.mockResolvedValue({ data: [] });
    listFansubGroupInvitations
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: 91,
            fansub_group_id: 88,
            email: "invitee@example.local",
            invited_role_codes: ["fansub_lead", "editor"],
            status: "pending",
            expires_at: "2026-05-23T12:00:00Z",
            created_at: "2026-05-16T12:00:00Z",
            updated_at: "2026-05-16T12:00:00Z",
            member: {
              member_id: 46,
              fansub_name: "InviteeNick",
            },
          },
        ],
      });
    createFansubGroupInvitation.mockResolvedValue({
      data: {
        id: 91,
        email: "invitee@example.local",
        invited_role_codes: ["fansub_lead", "editor"],
        status: "pending",
        expires_at: "2026-05-23T12:00:00Z",
        invite_link: "/invitations/accept?token=abc123",
      },
    });

    render(<FansubAppMembersSection fansubId={88} hasAccessToken />);

    fireEvent.click(await screen.findByRole("button", { name: "Mitglied hinzufügen" }));

    fireEvent.change(
      await screen.findByRole("textbox", { name: "E-Mail-Adresse für die Einladung" }),
      { target: { value: "invitee@example.local" } },
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Editing/ }).at(-1) as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Einladung erstellen" }));

    await waitFor(() => {
      expect(createFansubGroupInvitation).toHaveBeenCalledWith(
        88,
        {
          email: "invitee@example.local",
          invited_role_codes: ["editor"],
        },
      );
    });

    // Erfolgsmeldung zeigt Mailversand, nicht Copy/Paste-Workaround
    expect(await screen.findByText("Einladung wurde gesendet.")).not.toBeNull();
    // invite_link bleibt als Entwickler-Fallback im DOM (details/code), aber nicht als primaerer Hinweis
    expect(await screen.findByText(/\/invitations\/accept\?token=abc123/)).not.toBeNull();
    expect(await screen.findByText("InviteeNick")).not.toBeNull();
    expect(screen.getByText("invitee@example.local")).not.toBeNull();
  });

  it("shows smtp error message on 502 invitation failure", async () => {
    getFansubGroupCapabilities.mockResolvedValue({
      data: {
        can_edit_group: true,
        can_manage_links: true,
        can_view_members: true,
        can_manage_members: false,
        can_edit_notes: true,
        can_view_invitations: true,
        can_create_invitation: true,
        can_cancel_invitation: true,
      },
    });
    listFansubAppMembers.mockResolvedValue({ data: [] });
    listFansubGroupInvitations.mockResolvedValue({ data: [] });

    const { ApiError: MockApiError } = await import("@/lib/api");
    createFansubGroupInvitation.mockRejectedValue(
      new MockApiError(502, "Einladung konnte nicht gesendet werden. Bitte prüfe die SMTP-Konfiguration."),
    );

    render(<FansubAppMembersSection fansubId={88} hasAccessToken />);

    fireEvent.click(await screen.findByRole("button", { name: "Mitglied hinzufügen" }));

    fireEvent.change(
      await screen.findByRole("textbox", { name: "E-Mail-Adresse für die Einladung" }),
      { target: { value: "smtp-fail@example.local" } },
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Editing/ }).at(-1) as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Einladung erstellen" }));

    expect(
      await screen.findByText("Einladungsmail konnte nicht zugestellt werden. Bitte SMTP-Konfiguration prüfen."),
    ).not.toBeNull();
  });
});
