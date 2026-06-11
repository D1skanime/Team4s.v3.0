import { PaginationMeta } from "@/types/anime";

export type FansubStatus = "active" | "inactive" | "dissolved";
export type FansubGroupType = "group";
export type FansubGroupLinkType =
  | "website"
  | "discord"
  | "twitter"
  | "github"
  | "irc";

export interface FansubGroupLink {
  id: number;
  group_id: number;
  link_type: FansubGroupLinkType;
  name?: string | null;
  url: string;
  created_at: string;
}

export interface FansubGroup {
  id: number;
  slug: string;
  name: string;
  logo_id?: number | null;
  banner_id?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  logo_source_original_url?: string | null;
  banner_source_original_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  closed_year?: number | null;
  status: FansubStatus;
  website_url?: string | null;
  discord_url?: string | null;
  irc_url?: string | null;
  country?: string | null;
  anime_relations_count: number;
  release_versions_count: number;
  members_count: number;
  aliases_count: number;
  created_at: string;
  updated_at: string;
  links?: FansubGroupLink[];
}

export interface FansubGroupSummary {
  id: number;
  slug: string;
  name: string;
  logo_url?: string | null;
}

export interface FansubMember {
  id: number;
  fansub_group_id: number;
  handle: string;
  role: string;
  since_year?: number | null;
  until_year?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppUserListItem {
  id: number;
  legacy_user_id?: number | null;
  keycloak_subject: string;
  email: string;
  display_name: string;
  preferred_username?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  status: 'pending' | 'active' | 'disabled';
  last_login_at?: string | null;
  last_logout_at?: string | null;
  created_at: string;
  updated_at: string;
  global_roles: string[];
}

export interface FansubAppMember {
  id: number;
  fansub_group_id: number;
  app_user_id: number;
  status: 'active' | 'disabled';
  roles: string[];
  created_by_app_user_id?: number | null;
  updated_by_app_user_id?: number | null;
  created_at: string;
  updated_at: string;
  app_user?: AppUserListItem | null;
  member?: FansubGroupMemberIdentity | null;
}

export interface FansubGroupMemberIdentity {
  member_id: number;
  fansub_name: string;
  avatar_url?: string | null;
}

export interface FansubGroupMemberCandidate {
  app_user_id: number;
  member_id: number;
  fansub_name: string;
}

export interface FansubAlias {
  id: number;
  fansub_group_id: number;
  alias: string;
  created_at: string;
  updated_at: string;
}

export interface AnimeFansubRelation {
  anime_id: number;
  fansub_group_id: number;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
  fansub_group?: FansubGroupSummary | null;
}

export interface FansubGroupListResponse {
  data: FansubGroup[];
  meta: PaginationMeta;
}

export interface FansubGroupResponse {
  data: FansubGroup;
}

export interface PublicFansubStory {
  id: number;
  title: string;
  body_html: string;
  body_text: string;
  updated_at?: string;
}

export interface PublicFansubProject {
  id: number;
  title: string;
  type: string;
  status: string;
  year?: number | null;
  cover_image?: string | null;
  max_episodes?: number | null;
}

export interface PublicFansubHistory {
  id: number;
  year?: number | null;
  event_type: string;
  title?: string | null;
  note?: string | null;
  status: string;
}

export interface PublicFansubMediaItem {
  id: number;
  media_type: string;
  caption?: string | null;
  mime_type: string;
  thumbnail_url?: string | null;
  original_url?: string | null;
}

export interface PublicFansubProfile {
  group: FansubGroup;
  story: PublicFansubStory | null;
  projects: PublicFansubProject[];
  history: PublicFansubHistory[];
  media: PublicFansubMediaItem[];
}

export interface PublicFansubProfileResponse {
  data: PublicFansubProfile;
}

export interface FansubGroupLinkListResponse {
  data: FansubGroupLink[];
}

export interface FansubGroupLinkResponse {
  data: FansubGroupLink;
}

export interface FansubMemberListResponse {
  data: FansubMember[];
}

export interface FansubMemberResponse {
  data: FansubMember;
}

export interface AppUserListResponse {
  data: AppUserListItem[];
}

export interface FansubAppMemberListResponse {
  data: FansubAppMember[];
}

export interface FansubAppMemberResponse {
  data: FansubAppMember;
}

export interface FansubGroupCapabilities {
  can_edit_group: boolean;
  can_manage_links: boolean;
  can_view_members: boolean;
  can_manage_members: boolean;
  can_edit_notes: boolean;
  can_view_invitations: boolean;
  can_create_invitation: boolean;
  can_cancel_invitation: boolean;
  can_view_releases: boolean;
  can_view_release_media: boolean;
  can_upload_release_media: boolean;
  can_edit_release_notes: boolean;
}

export interface FansubGroupCapabilitiesResponse {
  data: FansubGroupCapabilities;
}

export interface FansubAliasListResponse {
  data: FansubAlias[];
}

export interface FansubAliasResponse {
  data: FansubAlias;
}

export interface AnimeFansubListResponse {
  data: AnimeFansubRelation[];
}

export interface FansubGroupCreateRequest {
  slug: string;
  name: string;
  logo_id?: number | null;
  banner_id?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  status: FansubStatus;
  group_type?: FansubGroupType;
  website_url?: string | null;
  discord_url?: string | null;
  irc_url?: string | null;
  country?: string | null;
}

export interface FansubGroupPatchRequest {
  slug?: string | null;
  name?: string | null;
  logo_id?: number | null;
  banner_id?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  status?: FansubStatus | null;
  group_type?: FansubGroupType;
  website_url?: string | null;
  discord_url?: string | null;
  irc_url?: string | null;
  country?: string | null;
}

export interface FansubGroupLinkCreateRequest {
  link_type: FansubGroupLinkType;
  name?: string | null;
  url: string;
}

export interface FansubGroupLinkPatchRequest {
  link_type?: FansubGroupLinkType | null;
  name?: string | null;
  url?: string | null;
}

export interface FansubMemberCreateRequest {
  handle: string;
  role: string;
  since_year?: number | null;
  until_year?: number | null;
  notes?: string | null;
}

export interface FansubMemberPatchRequest {
  handle?: string | null;
  role?: string | null;
  since_year?: number | null;
  until_year?: number | null;
  notes?: string | null;
}

export interface FansubAppMemberCreateRequest {
  app_user_id: number;
  roles: string[];
}

export interface FansubLeadUpdateRequest {
  enabled: boolean;
}

export interface FansubAppMemberRoleUpdateRequest {
  role: string;
  enabled: boolean;
}

export interface FansubAppMemberStatusUpdateRequest {
  status: 'active' | 'disabled';
}

export interface FansubAppMemberCandidateSearchResponse {
  data: FansubGroupMemberCandidate[];
}

export interface FansubGroupInvitation {
  id: number;
  fansub_group_id: number;
  email: string;
  invited_role_codes: FansubGroupRoleCode[];
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  expires_at: string;
  created_by_app_user_id?: number | null;
  accepted_by_app_user_id?: number | null;
  cancelled_by_app_user_id?: number | null;
  accepted_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  member?: FansubGroupMemberIdentity | null;
}

export interface FansubGroupInvitationListResponse {
  data: FansubGroupInvitation[];
}

export interface FansubGroupInvitationCreateRequest {
  email: string;
  invited_role_codes: FansubGroupRoleCode[];
}

export interface FansubGroupInvitationCreateResponse {
  data: {
    id: number;
    email: string;
    invited_role_codes: FansubGroupRoleCode[];
    status: 'pending' | 'accepted' | 'cancelled' | 'expired';
    expires_at: string;
    invite_link: string;
  };
}

export interface FansubGroupInvitationResponse {
  data: FansubGroupInvitation;
}

export interface AcceptFansubInvitationRequest {
  token: string;
}

export interface AcceptFansubInvitationResponse {
  data: {
    accepted: boolean;
    fansub_group_id: number;
  };
}

export type FansubGroupRoleCode =
  | 'fansub_lead'
  | 'project_lead'
  | 'translator'
  | 'timer'
  | 'typesetter'
  | 'editor'
  | 'encoder'
  | 'raw_provider'
  | 'quality_checker'
  | 'designer';

export interface FansubGroupRoleOption {
  code: FansubGroupRoleCode;
  label: string;
  description: string;
}

export const FANSUB_GROUP_ROLE_OPTIONS: FansubGroupRoleOption[] = [
  { code: 'fansub_lead', label: 'Fansub-Lead', description: 'Voller Gruppenkontext inklusive Mitgliederverwaltung.' },
  { code: 'project_lead', label: 'Projektleitung', description: 'Kann Projekte koordinieren, aber keine Mitglieder verwalten.' },
  { code: 'translator', label: 'Übersetzung', description: 'Arbeitet an Text und Release-Notizen.' },
  { code: 'timer', label: 'Timing', description: 'Pflegt Timing-bezogene Release-Arbeit.' },
  { code: 'typesetter', label: 'Typesetting', description: 'Bearbeitet Typesetting und Version-Notizen.' },
  { code: 'editor', label: 'Editing', description: 'Bearbeitet Inhalte und Gruppennotizen.' },
  { code: 'encoder', label: 'Encoding', description: 'Bearbeitet Release-Versionen ohne Mitgliederrechte.' },
  { code: 'raw_provider', label: 'Raw-Quelle', description: 'Liefert Quellmaterial ohne Verwaltungsrechte.' },
  { code: 'quality_checker', label: 'Qualitätscheck', description: 'Prüft Medien und Release-Notizen.' },
  { code: 'designer', label: 'Design', description: 'Arbeitet an Release-Medien und eigenen Uploads.' },
];

export interface FansubAliasCreateRequest {
  alias: string;
}

export interface MergeFansubsRequest {
  target_id: number;
  source_ids: number[];
}

export interface MergeFansubsResult {
  merged_count: number;
  versions_migrated: number;
  members_migrated: number;
  relations_migrated: number;
  aliases_added: string[];
}

export interface MergeFansubsResponse {
  data: MergeFansubsResult;
}

export interface MergeFansubsPreviewConflicts {
  version_conflicts: number;
  duplicate_aliases_count: number;
  duplicate_aliases: string[];
  duplicate_members_count: number;
  duplicate_members: string[];
  duplicate_relations_count: number;
  duplicate_relation_anime_ids: number[];
  duplicate_slugs_count: number;
  duplicate_slugs: string[];
  duplicate_names_count: number;
  duplicate_names: string[];
}

export interface MergeFansubsPreviewResult {
  merged_count: number;
  versions_migrated: number;
  members_migrated: number;
  relations_migrated: number;
  aliases_added: string[];
  aliases_skipped: string[];
  can_merge: boolean;
  conflicts: MergeFansubsPreviewConflicts;
}

export interface MergeFansubsPreviewResponse {
  data: MergeFansubsPreviewResult;
}

export type FansubMediaKind = "logo" | "banner";

export interface FansubMediaAsset {
  id: number;
  filename: string;
  public_url: string;
  source_original_url?: string | null;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  created_at: string;
}

export interface FansubMediaUploadResponse {
  data: {
    kind: FansubMediaKind;
    media: FansubMediaAsset;
    gif_large_warning: boolean;
  };
}

// --- Explicit release API types (Phase 30) ---
// These types model release context explicitly so consumers do not have to
// infer release_id from theme-asset helper responses.

/** AdminFansubRelease describes a fansub release as an explicit admin resource.
 * Surfaces release identity, anime context, fansub/group context, and episode anchor. */
export interface AdminFansubRelease {
  release_id: number;
  release_version_id: number;
  anime_id: number;
  anime_title: string;
  fansub_group_id: number;
  fansub_name: string;
  episode_id: number;
  episode_number: string;
  episode_title?: string | null;
  source?: string | null;
  version_count: number;
  has_theme_assets: boolean;
  has_override?: boolean;
  duration_seconds?: number | null;
  created_at: string;
}

/** Response envelope for listing releases scoped to a fansub + anime combination. */
export interface AdminFansubAnimeReleasesResponse {
  data: AdminFansubRelease[];
  meta: PaginationMeta;
}

/** canonical release response — release is null when no canonical release anchor exists
 * for the given fansub + anime combination. */
export interface AdminCanonicalFansubAnimeReleaseResponse {
  fansub_group_id: number;
  anime_id: number;
  release: AdminFansubRelease | null;
}

/** Direct release fetch by release_id. */
export interface AdminReleaseResponse {
  data: AdminFansubRelease;
}

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
  joined_year: number | null;
  left_year: number | null;
  app_user_id: number | null;
  app_username: string | null;
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
  display_name: string;
  joined_year: number | null;
  left_year: number | null;
  status: HistoricalContributionStatus;
  visibility: HistoricalContributionVisibility;
}

export interface UpdateGroupMemberRequest {
  display_name?: string;
  joined_year?: number | null;
  left_year?: number | null;
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
  started_year: number | null;
  ended_year: number | null;
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
  started_year: number | null;
  ended_year: number | null;
  source_note: string | null;
  status: "historical" | "confirmed";
  visibility: HistoricalContributionVisibility;
}

export interface UpdateMemberRoleRequest {
  role_code?: string;
  started_year?: number | null;
  ended_year?: number | null;
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
  is_public_on_anime_page: boolean;
  is_public_on_member_profile: boolean;
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
    is_override: boolean;
    source: 'release_version' | 'anime_default';
  };
}
