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
          app_user: {
            id: 11,
            email: "phase-admin@example.local",
            display_name: "Phase Admin",
            keycloak_subject: "sub-11",
            status: "active",
            created_at: "2026-05-16T08:00:00Z",
            updated_at: "2026-05-16T08:00:00Z",
            global_roles: ["platform_admin"],
          },
        },
      ],
    });
    listFansubGroupInvitations.mockResolvedValue({ data: [] });

    render(<FansubAppMembersSection fansubId={88} hasAccessToken />);

    expect(await screen.findByText("Phase Admin")).not.toBeNull();
    expect(screen.getAllByText("Fansub-Lead").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Editing").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "/admin/profile" }).getAttribute("href")).toBe("/admin/profile");
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
            app_user: {
              id: 12,
              email: "phase-member@example.local",
              display_name: "Phase Member",
              keycloak_subject: "sub-12",
              status: "active",
              created_at: "2026-05-16T08:00:00Z",
              updated_at: "2026-05-16T08:00:00Z",
              global_roles: [],
            },
          },
        ],
      });
    searchFansubAppMemberCandidates.mockResolvedValue({
      data: [
        {
          id: 12,
          email: "phase-member@example.local",
          display_name: "Phase Member",
          keycloak_subject: "sub-12",
          status: "active",
          created_at: "2026-05-16T08:00:00Z",
          updated_at: "2026-05-16T08:00:00Z",
          global_roles: [],
        },
      ],
    });
    createFansubAppMember.mockResolvedValue({ data: {} });

    render(<FansubAppMembersSection fansubId={88} hasAccessToken />);

    const searchInput = await screen.findByRole("searchbox", {
      name: "App-Benutzer nach Name oder E-Mail suchen",
    });
    fireEvent.change(searchInput, { target: { value: "phase" } });

    expect(await screen.findByRole("option", { name: /Phase Member/ })).not.toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: /Editing/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Mitglied hinzufügen" }));

    await waitFor(() => {
      expect(createFansubAppMember).toHaveBeenCalledWith(
        88,
        { app_user_id: 12, roles: ["fansub_lead", "editor"] },
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
          invited_role_codes: ["fansub_lead", "editor"],
        },
      );
    });

    expect(await screen.findByText(/\/invitations\/accept\?token=abc123/)).not.toBeNull();
  });
});
