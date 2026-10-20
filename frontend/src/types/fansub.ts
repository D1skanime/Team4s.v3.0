import { PaginationMeta } from "@/types/anime";

// Barrel re-exports: fansub.ts was split into thematic files (189-06, CLAUDE.md
// 450-line limit) so no import site elsewhere in the repo needs to change.
export * from "./fansub-capabilities";
export * from "./fansub-public-profile";
export * from "./fansub-invitations";
export * from "./fansub-contributions";

export type FansubStatus = "active" | "inactive" | "dissolved";
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
  kuerzel?: string | null;
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
  projects_count: number;
  release_versions_count: number;
  members_count: number;
  aliases_count: number;
  aliases?: string[];
  created_at: string;
  updated_at: string;
  links?: FansubGroupLink[];
}

export interface FansubGroupSummary {
  id: number;
  slug: string;
  name: string;
  logo_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  country?: string | null;
  status?: FansubStatus;
  story_preview?: string | null;
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
  media_permissions: FansubGroupMediaPermissions;
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

export interface FansubGroupMediaPermissions {
  can_upload: boolean;
  can_delete_own: boolean;
  can_delete_all: boolean;
  can_reorder: boolean;
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

export type FansubAppMemberMediaPermissionsUpdateRequest = FansubGroupMediaPermissions;

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
  kuerzel?: string | null;
  logo_id?: number | null;
  banner_id?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  status: FansubStatus;
  website_url?: string | null;
  discord_url?: string | null;
  irc_url?: string | null;
  country?: string | null;
}

export interface FansubGroupPatchRequest {
  slug?: string | null;
  name?: string | null;
  kuerzel?: string | null;
  logo_id?: number | null;
  banner_id?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  founded_year?: number | null;
  dissolved_year?: number | null;
  status?: FansubStatus | null;
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
  historical_member_id?: number | null;
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

export type FansubGroupRoleCode = string;

/** API-Response-Typ für GET /api/v1/admin/fansub-group-roles */
export interface FansubGroupRoleItem {
  code: FansubGroupRoleCode;
  label_de: string;
  sort_order: number;
}

export interface FansubAliasCreateRequest {
  alias: string;
}

export interface FansubAliasReassignRequest {
  target_fansub_group_id: number;
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
export type FansubGroupMediaUploadKind = "image";

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
  fansub_names?: string[];
  episode_id: number;
  episode_number: string;
  episode_title?: string | null;
  source?: string | null;
  version_count: number;
  has_theme_assets: boolean;
  has_theme_segments?: boolean;
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

