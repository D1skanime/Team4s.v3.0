// --- Gruppen-Mitglieder (hist_fansub_group_members) ---

export type HistoricalContributionStatus =
  | "draft"
  | "historical"
  | "confirmed"
  | "disputed";

export type HistoricalContributionVisibility = "internal" | "public";

export interface HistFansubGroupMember {
  id: number;
  fansub_group_id: number;
  member_id: number;
  display_name: string;
  joined_date: string | null;
  left_date: string | null;
  app_user_id: number | null;
  app_username: string | null;
  active_app_member_id?: number | null;
  status: HistoricalContributionStatus;
  visibility?: HistoricalContributionVisibility;
  confirmed_by_app_user_id?: number | null;
  confirmed_by_display_name?: string | null;
  confirmed_at?: string | null;
  created_at: string;
}

export interface HistFansubGroupMemberListResponse {
  data: HistFansubGroupMember[];
}

export interface HistFansubGroupMemberResponse {
  data: HistFansubGroupMember;
}

export interface CreateGroupMemberRequest {
  member_id?: number;
  display_name: string;
  joined_date: string | null;
  left_date: string | null;
  status: HistoricalContributionStatus;
  visibility: HistoricalContributionVisibility;
}

export interface UpdateGroupMemberRequest {
  display_name?: string;
  joined_date?: string | null;
  left_date?: string | null;
  status?: HistoricalContributionStatus;
  visibility?: HistoricalContributionVisibility;
}

// --- Mitglieder-Rollen (hist_group_member_roles) ---

export interface HistGroupMemberRole {
  id: number;
  fansub_group_member_id: number;
  member_display_name: string;
  role_code: string;
  role_label: string | null;
  started_date: string | null;
  ended_date: string | null;
  note: string | null;
  status: "historical" | "confirmed";
  created_at: string;
}

export interface HistGroupMemberRoleListResponse {
  data: HistGroupMemberRole[];
}

export interface HistGroupMemberRoleResponse {
  data: HistGroupMemberRole;
}

export interface CreateMemberRoleRequest {
  hist_fansub_group_member_id: number;
  role_code: string;
  started_date: string | null;
  ended_date: string | null;
  source_note: string | null;
  status: "historical" | "confirmed";
  visibility: HistoricalContributionVisibility;
}

export interface UpdateMemberRoleRequest {
  role_code?: string;
  started_date?: string | null;
  ended_date?: string | null;
  source_note?: string | null;
  status?: "historical" | "confirmed";
  visibility?: HistoricalContributionVisibility;
}

// --- Anime-Contributions (anime_contributions) ---

export interface AnimeContribution {
  id: number;
  member_id: number;
  member_display_name: string;
  member_avatar_url?: string | null;
  anime_id: number;
  role_codes: string[];
  started_year: number | null;
  ended_year: number | null;
  note: string | null;
  is_public_on_anime_page: boolean;
  is_public_on_member_profile: boolean;
  status: "draft" | "confirmed" | "hidden";
  // Phase 67-04: optionale Release-Version-Zuordnung (null = anime-weit).
  release_version_id: number | null;
  created_at: string;
}

export interface AnimeContributionListResponse {
  data: AnimeContribution[];
}

export interface AnimeContributionResponse {
  data: AnimeContribution;
}

export interface UpsertAnimeContributionRequest {
  member_id: number;
  role_codes: string[];
  started_year: number | null;
  ended_year: number | null;
  note: string | null;
  is_public_on_anime_page?: boolean;
  is_public_on_member_profile?: boolean;
  status: "draft" | "confirmed" | "hidden";
  // Phase 67-04: optionale Release-Version-Zuordnung (null = anime-weit lassen).
  release_version_id: number | null;
}

// --- Vereinheitlichte Personenliste (hist + App) für Mitwirkenden-Zuordnung (D-02) ---

export interface UnifiedGroupMember {
  member_id: number;
  display_name: string;
  source: "hist" | "app";
  has_app_account: boolean;
  group_roles: string[];
}

// --- Standard-Team (fansub_group_default_crew) (D-04) ---

export interface DefaultCrewEntry {
  id: number;
  fansub_group_id: number;
  member_id: number;
  role_code: string;
  created_by: number | null;
  created_at: string;
}

// --- Effektive Mitwirkende für Release-Version (D-02, Phase 83) ---

export interface EffectiveContributionRow {
  contribution_id: number;
  member_id: number;
  member_display_name: string;
  member_avatar_url?: string | null;
  role_codes: string[];
}

export interface EffectiveContributionsResponse {
  data: EffectiveContributionRow[];
  meta: {
    snapshot_mode: ReleaseCrewSnapshotMode;
  };
}

export type ReleaseCrewSnapshotMode = 'inherited' | 'independent' | 'uninitialized';

export interface ReplaceReleaseCrewRow {
  member_id: number;
  role_codes: string[];
}

export interface ReplaceReleaseCrewRequest {
  rows: ReplaceReleaseCrewRow[];
}

export type ReplaceReleaseCrewResponse = EffectiveContributionsResponse;
