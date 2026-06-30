// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const listFansubGroupRoles = vi.fn();
const listGroupHistoryRoleDefinitions = vi.fn();
const listFansubAppMembers = vi.fn();
const getFansubGroupCapabilities = vi.fn();
const searchFansubAppMemberCandidates = vi.fn();
const createFansubAppMember = vi.fn();
const updateFansubAppMemberRole = vi.fn();
const updateFansubAppMemberMediaPermissions = vi.fn();
const updateFansubAppMemberStatus = vi.fn();
const listFansubGroupInvitations = vi.fn();
const createFansubGroupInvitation = vi.fn();
const cancelFansubGroupInvitation = vi.fn();
const listGroupMembers = vi.fn();
const listMemberRoles = vi.fn();
const createGroupMember = vi.fn();
const createMemberRole = vi.fn();
const updateGroupMember = vi.fn();
const updateMemberRole = vi.fn();
const deleteGroupMember = vi.fn();
const deleteMemberRole = vi.fn();
const approveMemberRequest = vi.fn();
const cancelClaimInvitation = vi.fn();
const generateClaimInvitation = vi.fn();
const listClaimInvitations = vi.fn();
const listMemberRequests = vi.fn();
const listPendingMemberClaims = vi.fn();
const rejectMemberClaim = vi.fn();
const rejectMemberRequest = vi.fn();
const verifyMemberClaim = vi.fn();

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  listFansubGroupRoles: (...args: unknown[]) => listFansubGroupRoles(...args),
  listGroupHistoryRoleDefinitions: (...args: unknown[]) => listGroupHistoryRoleDefinitions(...args),
  listFansubAppMembers: (...args: unknown[]) => listFansubAppMembers(...args),
  getFansubGroupCapabilities: (...args: unknown[]) => getFansubGroupCapabilities(...args),
  searchFansubAppMemberCandidates: (...args: unknown[]) => searchFansubAppMemberCandidates(...args),
  createFansubAppMember: (...args: unknown[]) => createFansubAppMember(...args),
  updateFansubAppMemberRole: (...args: unknown[]) => updateFansubAppMemberRole(...args),
  updateFansubAppMemberMediaPermissions: (...args: unknown[]) => updateFansubAppMemberMediaPermissions(...args),
  updateFansubAppMemberStatus: (...args: unknown[]) => updateFansubAppMemberStatus(...args),
  listFansubGroupInvitations: (...args: unknown[]) => listFansubGroupInvitations(...args),
  createFansubGroupInvitation: (...args: unknown[]) => createFansubGroupInvitation(...args),
  cancelFansubGroupInvitation: (...args: unknown[]) => cancelFansubGroupInvitation(...args),
  listGroupMembers: (...args: unknown[]) => listGroupMembers(...args),
  listMemberRoles: (...args: unknown[]) => listMemberRoles(...args),
  createGroupMember: (...args: unknown[]) => createGroupMember(...args),
  createMemberRole: (...args: unknown[]) => createMemberRole(...args),
  updateGroupMember: (...args: unknown[]) => updateGroupMember(...args),
  updateMemberRole: (...args: unknown[]) => updateMemberRole(...args),
  deleteGroupMember: (...args: unknown[]) => deleteGroupMember(...args),
  deleteMemberRole: (...args: unknown[]) => deleteMemberRole(...args),
  approveMemberRequest: (...args: unknown[]) => approveMemberRequest(...args),
  cancelClaimInvitation: (...args: unknown[]) => cancelClaimInvitation(...args),
  generateClaimInvitation: (...args: unknown[]) => generateClaimInvitation(...args),
  listClaimInvitations: (...args: unknown[]) => listClaimInvitations(...args),
  listMemberRequests: (...args: unknown[]) => listMemberRequests(...args),
  listPendingMemberClaims: (...args: unknown[]) => listPendingMemberClaims(...args),
  rejectMemberClaim: (...args: unknown[]) => rejectMemberClaim(...args),
  rejectMemberRequest: (...args: unknown[]) => rejectMemberRequest(...args),
  verifyMemberClaim: (...args: unknown[]) => verifyMemberClaim(...args),
}));

import { FansubAppMembersSection } from "./FansubAppMembersSection";

beforeEach(() => {
  listFansubGroupRoles.mockResolvedValue([]);
  listGroupHistoryRoleDefinitions.mockResolvedValue([]);
  listGroupMembers.mockResolvedValue({ data: [] });
  listMemberRoles.mockResolvedValue({ data: [] });
  listClaimInvitations.mockResolvedValue([]);
  listMemberRequests.mockResolvedValue([]);
  listPendingMemberClaims.mockResolvedValue([]);
});

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
        can_view_releases: true,
        can_view_release_media: true,
        can_upload_release_media: true,
        can_edit_release_notes: true,
        can_view_group_media: true,
        can_upload_group_media: true,
        can_update_group_media: true,
        can_delete_own_group_media: true,
        can_delete_group_media: true,
        can_reorder_group_media: true,
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
          media_permissions: {
            can_upload: true,
            can_delete_own: true,
            can_delete_all: true,
            can_reorder: true,
          },
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
    listGroupMembers.mockResolvedValue({
      data: [
        {
          id: 301,
          fansub_group_id: 88,
          member_id: 44,
          display_name: "Archiv Admin",
          joined_year: 2005,
          left_year: null,
          app_user_id: 11,
          app_username: "phase-admin",
          status: "historical",
          visibility: "internal",
          created_at: "2026-05-16T08:10:00Z",
        },
        {
          id: 302,
          fansub_group_id: 88,
          member_id: 45,
          display_name: "Archiv Claim",
          joined_year: 2008,
          left_year: 2010,
          app_user_id: null,
          app_username: null,
          status: "historical",
          visibility: "internal",
          created_at: "2026-05-16T08:11:00Z",
        },
      ],
    });
    listMemberRoles
      .mockResolvedValueOnce({
        data: [
          {
            id: 401,
            fansub_group_member_id: 301,
            member_display_name: "Archiv Admin",
            role_code: "editor",
            role_label: "Editing",
            started_year: 2005,
            ended_year: null,
            note: null,
            status: "historical",
            created_at: "2026-05-16T08:10:00Z",
          },
        ],
      })
      .mockResolvedValueOnce({ data: [] });
    listPendingMemberClaims.mockResolvedValue([
      {
        id: 701,
        app_user_id: 77,
        member_id: 45,
        member_nickname: "Archiv Claim",
        claim_status: "pending",
        note: "Das bin ich.",
        created_at: "2026-06-10T09:00:00Z",
      },
    ]);
    verifyMemberClaim.mockResolvedValue({});

    render(<FansubAppMembersSection fansubId={88} hasAccessToken />);

    expect((await screen.findAllByText("Phase Admin")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Archiv Admin")).not.toBeNull();
    expect(await screen.findByText("Archiv Claim")).not.toBeNull();
    expect(screen.getByText("Bestätigt/verknüpft")).not.toBeNull();
    expect(screen.getByText("Offener Claim")).not.toBeNull();
    expect(screen.getByText("Das bin ich.")).not.toBeNull();
    expect(screen.getAllByText("Gruppenleitung").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Editing").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Aktiv/).length).toBeGreaterThan(0);
    expect(screen.queryByText("phase-admin@example.local")).toBeNull();
    expect(screen.queryByText(/phase 45 mvp/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Bestätigen" }));

    await waitFor(() => {
      expect(verifyMemberClaim).toHaveBeenCalledWith(88, 701);
    });
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
        can_view_releases: false,
        can_view_release_media: false,
        can_upload_release_media: false,
        can_edit_release_notes: false,
        can_view_group_media: false,
        can_upload_group_media: false,
        can_update_group_media: false,
        can_delete_own_group_media: false,
        can_delete_group_media: false,
        can_reorder_group_media: false,
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
            media_permissions: {
              can_upload: false,
              can_delete_own: false,
              can_delete_all: false,
              can_reorder: false,
            },
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
    fireEvent.click(await screen.findByRole("button", { name: "App-Mitglied / Einladung" }));

    const searchInput = await screen.findByPlaceholderText("Fansub-Nick suchen");
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
        can_view_releases: true,
        can_view_release_media: true,
        can_upload_release_media: true,
        can_edit_release_notes: true,
        can_view_group_media: true,
        can_upload_group_media: true,
        can_update_group_media: true,
        can_delete_own_group_media: true,
        can_delete_group_media: true,
        can_reorder_group_media: true,
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
    fireEvent.click(await screen.findByRole("button", { name: "App-Mitglied / Einladung" }));

    fireEvent.change(
      await screen.findByPlaceholderText("E-Mail-Adresse für die Einladung"),
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
        can_view_releases: true,
        can_view_release_media: true,
        can_upload_release_media: true,
        can_edit_release_notes: true,
        can_view_group_media: true,
        can_upload_group_media: true,
        can_update_group_media: true,
        can_delete_own_group_media: true,
        can_delete_group_media: true,
        can_reorder_group_media: true,
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
    fireEvent.click(await screen.findByRole("button", { name: "App-Mitglied / Einladung" }));

    fireEvent.change(
      await screen.findByPlaceholderText("E-Mail-Adresse für die Einladung"),
      { target: { value: "smtp-fail@example.local" } },
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Editing/ }).at(-1) as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Einladung erstellen" }));

    expect(
      await screen.findByText("Einladungsmail konnte nicht zugestellt werden. Bitte SMTP-Konfiguration prüfen."),
    ).not.toBeNull();
  });

  it("saves roles and media rights together from the unified member editor", async () => {
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
        can_view_releases: true,
        can_view_release_media: true,
        can_upload_release_media: true,
        can_edit_release_notes: true,
        can_view_group_media: true,
        can_upload_group_media: true,
        can_update_group_media: true,
        can_delete_own_group_media: true,
        can_delete_group_media: true,
        can_reorder_group_media: true,
      },
    });
    listFansubAppMembers.mockResolvedValue({
      data: [
        {
          id: 31,
          fansub_group_id: 88,
          app_user_id: 13,
          status: "active",
          roles: ["editor"],
          media_permissions: {
            can_upload: false,
            can_delete_own: false,
            can_delete_all: false,
            can_reorder: false,
          },
          created_at: "2026-05-16T08:15:00Z",
          updated_at: "2026-05-16T08:15:00Z",
          member: {
            member_id: 46,
            fansub_name: "Phase Editor",
          },
        },
      ],
    });
    updateFansubAppMemberRole.mockResolvedValue({
      data: {
        id: 31,
        fansub_group_id: 88,
        app_user_id: 13,
        status: "active",
        roles: ["editor", "timer"],
        media_permissions: {
          can_upload: false,
          can_delete_own: false,
          can_delete_all: false,
          can_reorder: false,
        },
        created_at: "2026-05-16T08:15:00Z",
        updated_at: "2026-05-16T08:15:00Z",
        member: {
          member_id: 46,
          fansub_name: "Phase Editor",
        },
      },
    });
    updateFansubAppMemberMediaPermissions.mockResolvedValue({
      data: {
        id: 31,
        fansub_group_id: 88,
        app_user_id: 13,
        status: "active",
        roles: ["editor", "timer"],
        media_permissions: {
          can_upload: true,
          can_delete_own: false,
          can_delete_all: false,
          can_reorder: false,
        },
        created_at: "2026-05-16T08:15:00Z",
        updated_at: "2026-05-16T08:15:00Z",
        member: {
          member_id: 46,
          fansub_name: "Phase Editor",
        },
      },
    });

    render(<FansubAppMembersSection fansubId={88} hasAccessToken />);

    fireEvent.click(await screen.findByRole("button", { name: "Phase Editor bearbeiten" }));
    fireEvent.click(screen.getByRole("button", { name: /Timing/ }));
    fireEvent.click(screen.getByRole("tab", { name: /Medienrechte/ }));
    fireEvent.click(screen.getByRole("switch", { name: /Hochladen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => {
      expect(updateFansubAppMemberRole).toHaveBeenCalledWith(88, 13, { role: "timer", enabled: true });
      expect(updateFansubAppMemberMediaPermissions).toHaveBeenCalledWith(
        88,
        13,
        {
          can_upload: true,
          can_delete_own: false,
          can_delete_all: false,
          can_reorder: false,
        },
      );
    });
    expect(await screen.findByText("Änderungen gespeichert.")).not.toBeNull();
    expect(screen.queryByRole("dialog", { name: "Mitglied bearbeiten" })).toBeNull();
  });
});
