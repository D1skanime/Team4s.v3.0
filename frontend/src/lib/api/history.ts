// D-24 cohesion exception: this file is ~1000 lines, well above the project's
// 450-line guideline. The plan (174-05-PLAN.md) locks "history/notes/story/archive"
// as a single artifact (frontend/src/lib/api/history.ts, 21 re-verified functions)
// without offering a sub-split escape hatch, mirroring 174-03's fansub-members.ts
// D-24 exception (which cites the 174-02 client.ts precedent). The size comes from
// five near-identical raw-DTO-to-domain-type mapper pairs (fansub group notes, member
// group stories, anime-fansub project notes, release-version notes, member-story
// context) that must travel with their sole callers to satisfy D-09 (no duplication);
// splitting them into separate files would scatter each note/story CRUD group across
// multiple files for no cohesion benefit.
import { ReleaseVersionMediaCategory } from "@/types/releaseVersionMedia";
import { FansubGroupNote, MemberGroupStory, MemberStoryContext, MemberStoryContextMember, MemberStoryContextRole, AnimeFansubProjectNote, CreateFansubGroupNoteRequest, UpdateFansubGroupNoteRequest, CreateMemberGroupStoryRequest, UpdateMemberGroupStoryRequest, UpsertAnimeFansubProjectNoteRequest } from "@/types/fansubNotes";
import { ReleaseVersionNote, BulkUpsertReleaseVersionNotesRequest } from "@/types/releaseVersionNotes";
import { type GroupProjectNoteResponse } from "@/types/groupContributors";
import { type CursorPage, type PublicReleaseNote } from "@/types/releaseDetail";
import { ApiError, apiClientFetch, authorizedFetch, getApiBaseUrl, parseApiError, parseApiErrorPayload, withAuthHeader } from "./client";

// --- Cursor-Pagination (AO4-03/AO4-24) — ausschliesslich fuer die drei
// nachladenden Listen (vollstaendige Release-Liste, Bildergalerie, Textliste).
// Die Offset-Funktionen getGroupReleases/getGroupReleaseDetail bleiben unveraendert. ---

export interface CursorQueryOpts {
  cursor?: string;
  limit?: number;
  sort?: "activity" | "release_date";
  exclude_release_version_id?: number;
  category?: ReleaseVersionMediaCategory;
}

export function buildCursorQuery(opts: CursorQueryOpts): string {
  const query = new URLSearchParams();
  if (opts.cursor) query.set("cursor", opts.cursor);
  if (opts.limit) query.set("limit", String(opts.limit));
  if (opts.sort) query.set("sort", opts.sort);
  if (opts.exclude_release_version_id) query.set("exclude_release_version_id", String(opts.exclude_release_version_id));
  if (opts.category) query.set("category", opts.category);
  return query.toString();
}

export async function getGroupReleaseNotes(
  animeID: number,
  groupID: number,
  releaseVersionID: number,
  opts: CursorQueryOpts = {},
): Promise<CursorPage<PublicReleaseNote>> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildCursorQuery(opts);
  const url = `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/releases/${releaseVersionID}/notes${query ? `?${query}` : ""}`;
  const response = await authorizedFetch(url, { cache: "no-store" });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<CursorPage<PublicReleaseNote>>;
}

export async function getGroupProjectNote(
  animeID: number,
  groupID: number,
): Promise<GroupProjectNoteResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/project-note`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<GroupProjectNoteResponse>;
}

 // ---- Fansub Group Notes ----

type RawFansubGroupNote = {
  ID: number;
  FansubGroupID: number;
  Title: string;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

export type RawMemberGroupStory = {
  ID: number;
  FansubGroupID: number;
  MemberID: number;
  RoleID: number | null;
  Title: string;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

type RawAnimeFansubProjectNote = {
  ID: number;
  AnimeID: number;
  FansubGroupID: number;
  Title: string;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

type RawMemberStoryContextMember = {
  ID: number;
  Nickname: string;
};

type RawMemberStoryContextRole = {
  ID: number;
  Name: string;
  Label: string;
};

function mapFansubGroupNote(raw: RawFansubGroupNote): FansubGroupNote {
  return {
    id: raw.ID,
    fansubGroupId: raw.FansubGroupID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

export function mapMemberGroupStory(raw: RawMemberGroupStory): MemberGroupStory {
  return {
    id: raw.ID,
    fansubGroupId: raw.FansubGroupID,
    memberId: raw.MemberID,
    roleId: raw.RoleID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

function mapAnimeFansubProjectNote(
  raw: RawAnimeFansubProjectNote,
): AnimeFansubProjectNote {
  return {
    id: raw.ID,
    animeId: raw.AnimeID,
    fansubGroupId: raw.FansubGroupID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

function mapMemberStoryContextMember(
  raw: RawMemberStoryContextMember,
): MemberStoryContextMember {
  return {
    id: raw.ID,
    nickname: raw.Nickname,
  };
}

function mapMemberStoryContextRole(
  raw: RawMemberStoryContextRole,
): MemberStoryContextRole {
  return {
    id: raw.ID,
    name: raw.Name,
    label: raw.Label,
  };
}

export async function listFansubGroupNotes(
  fansubId: number,
  authToken?: string,
): Promise<FansubGroupNote[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes`,
    {
      headers: withAuthHeader({}, authToken),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as { data: RawFansubGroupNote[] };
  return json.data.map(mapFansubGroupNote);
}

export async function createFansubGroupNote(
  fansubId: number,
  data: CreateFansubGroupNoteRequest,
  authToken?: string,
): Promise<FansubGroupNote> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder ?? 0,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as { data: RawFansubGroupNote };
  return mapFansubGroupNote(json.data);
}

export async function updateFansubGroupNote(
  fansubId: number,
  noteId: number,
  data: UpdateFansubGroupNoteRequest,
  authToken?: string,
): Promise<FansubGroupNote> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes/${noteId}`,
    {
      method: "PATCH",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as { data: RawFansubGroupNote };
  return mapFansubGroupNote(json.data);
}

export async function deleteFansubGroupNote(
  fansubId: number,
  noteId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes/${noteId}`,
    {
      method: "DELETE",
      headers: withAuthHeader({}, authToken),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }
}

export async function getMemberGroupStoryContext(
  fansubId: number,
  authToken?: string,
): Promise<MemberStoryContext> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories/context`,
    {
      headers: withAuthHeader({}, authToken),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as {
    data: {
      members: RawMemberStoryContextMember[];
      roles: RawMemberStoryContextRole[];
    };
  };

  return {
    members: json.data.members.map(mapMemberStoryContextMember),
    roles: json.data.roles.map(mapMemberStoryContextRole),
  };
}

export async function createMemberGroupStory(
  fansubId: number,
  data: CreateMemberGroupStoryRequest,
  authToken?: string,
): Promise<MemberGroupStory> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    member_id: data.memberId,
    role_id: data.roleId ?? null,
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder ?? 0,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as { data: RawMemberGroupStory };
  return mapMemberGroupStory(json.data);
}

export async function updateMemberGroupStory(
  fansubId: number,
  storyId: number,
  data: UpdateMemberGroupStoryRequest,
  authToken?: string,
): Promise<MemberGroupStory> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories/${storyId}`,
    {
      method: "PATCH",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as { data: RawMemberGroupStory };
  return mapMemberGroupStory(json.data);
}

export async function deleteMemberGroupStory(
  fansubId: number,
  storyId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories/${storyId}`,
    {
      method: "DELETE",
      headers: withAuthHeader({}, authToken),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }
}

// ---- Anime Fansub Project Notes ----

export async function getAnimeFansubProjectNote(
  fansubId: number,
  animeId: number,
  authToken?: string,
): Promise<AnimeFansubProjectNote | null> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/notes`,
    {
      headers: withAuthHeader({}, authToken),
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as { data: RawAnimeFansubProjectNote | null };
  if (!json.data) {
    return null;
  }
  return mapAnimeFansubProjectNote(json.data);
}

export async function upsertAnimeFansubProjectNote(
  fansubId: number,
  animeId: number,
  data: UpsertAnimeFansubProjectNoteRequest,
): Promise<AnimeFansubProjectNote> {
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder ?? 0,
  };
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/notes`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as { data: RawAnimeFansubProjectNote };
  return mapAnimeFansubProjectNote(json.data);
}

export async function deleteAnimeFansubProjectNote(
  fansubId: number,
  animeId: number,
  noteId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/notes/${noteId}`,
    {
      method: "DELETE",
      authToken,
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }
}

// ---- Release Version Notes ----

type RawReleaseVersionNote = {
  ID: number;
  ReleaseVersionID: number;
  FansubGroupID: number | null;
  MemberID: number;
  RoleID: number;
  Title: string | null;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
  SourceRevision?: number | null;
  ReviewState?: "pending" | "confirmed" | "rejected" | "tombstoned" | null;
  LastActivityAt?: string | null;
  RejectionCategory?: ReleaseVersionNote["rejectionCategory"];
  RejectionReason?: string | null;
};

function decodeReleaseVersionBodyJson(value: unknown): unknown | null {
  if (value == null) return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Some backend responses currently serialize []byte JSONB as base64 text.
  }

  try {
    const decoded =
      typeof atob === "function"
        ? new TextDecoder().decode(
            Uint8Array.from(atob(trimmed), (char) => char.charCodeAt(0)),
          )
        : Buffer.from(trimmed, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return value;
  }
}

function mapReleaseVersionNote(raw: RawReleaseVersionNote): ReleaseVersionNote {
  return {
    id: raw.ID,
    releaseVersionId: raw.ReleaseVersionID,
    fansubGroupId: raw.FansubGroupID,
    memberId: raw.MemberID,
    roleId: raw.RoleID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
    sourceRevision: raw.SourceRevision ?? null,
    reviewState: raw.ReviewState ?? null,
    lastActivityAt: raw.LastActivityAt ?? null,
    rejectionCategory: raw.RejectionCategory ?? null,
    rejectionReason: raw.RejectionReason ?? null,
  };
}

export async function listReleaseVersionNotes(
  versionId: number,
  authToken?: string,
): Promise<ReleaseVersionNote[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/notes`,
    {
      headers: withAuthHeader({}, authToken),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as { data: RawReleaseVersionNote[] };
  return json.data.map(mapReleaseVersionNote);
}

export async function bulkUpsertReleaseVersionNotes(
  versionId: number,
  data: BulkUpsertReleaseVersionNotesRequest,
  authToken?: string,
): Promise<ReleaseVersionNote[]> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    notes: data.notes.map((note) => ({
      id: note.id,
      ...(note.sourceRevision != null
        ? { source_revision: note.sourceRevision }
        : {}),
      role_code: note.roleCode,
      title: note.title ?? null,
      body_json: note.bodyJson,
      sort_order: note.sortOrder ?? 0,
    })),
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/notes`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const json = (await response.json()) as { data: RawReleaseVersionNote[] };
  return json.data.map(mapReleaseVersionNote);
}

export async function deleteReleaseVersionNote(
  versionId: number,
  noteId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/notes/${noteId}`,
    {
      method: "DELETE",
      authToken,
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }
}

// ---------------------------------------------------------------------------
// Phase 68 — Gruppen-Meilenstein-CRUD (fansub_group_history)
// ---------------------------------------------------------------------------

export interface GroupHistoryRow {
  id: number
  fansub_group_id: number
  year: number | null
  event_type: string
  title: string | null
  note: string | null
  status: string
  created_by: number | null
  created_at: string
}

export interface GroupHistoryCreateRequest {
  event_type: string
  title: string
  year: number
  note?: string | null
  status?: string
}

export interface GroupHistoryUpdateRequest {
  event_type?: string
  title?: string | null
  year?: number
  note?: string | null
  status?: string
}

export async function listGroupHistory(
  fansubGroupId: number,
  authToken?: string,
): Promise<GroupHistoryRow[]> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history`,
    {
      headers: withAuthHeader({}, authToken),
      cache: 'no-store',
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const body = (await response.json()) as { data: GroupHistoryRow[] }
  return body.data
}

export async function createGroupHistory(
  fansubGroupId: number,
  payload: GroupHistoryCreateRequest,
  authToken?: string,
): Promise<GroupHistoryRow> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history`,
    {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Meilenstein konnte nicht gespeichert werden. Bitte versuche es erneut.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const body = (await response.json()) as { data: GroupHistoryRow }
  return body.data
}

export async function updateGroupHistory(
  fansubGroupId: number,
  historyId: number,
  payload: GroupHistoryUpdateRequest,
  authToken?: string,
): Promise<GroupHistoryRow> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history/${historyId}`,
    {
      method: 'PATCH',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Meilenstein konnte nicht gespeichert werden. Bitte versuche es erneut.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const body = (await response.json()) as { data: GroupHistoryRow }
  return body.data
}

export async function deleteGroupHistory(
  fansubGroupId: number,
  historyId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history/${historyId}`,
    {
      method: 'DELETE',
      headers: withAuthHeader({}, authToken),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Meilenstein konnte nicht gelöscht werden. Bitte versuche es erneut.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

// ---------------------------------------------------------------------------
// Phase 68 — Öffentliche Archiv-Suche (/archiv)
// ---------------------------------------------------------------------------

export interface ArchiveMemberRow {
  id: number
  nickname: string
  display_name: string
  slug: string | null
  avatar_path: string | null
  is_verified: boolean
  top_roles: string[]
  groups: string[]
}

export interface ArchiveSearchResponse {
  data: ArchiveMemberRow[]
  total: number
  page: number
}

/**
 * Sucht öffentliche Member im Archiv nach optionalen Filtern.
 * Keine Auth erforderlich — öffentlicher Endpunkt (D-15, D-13).
 * KEIN { next: { revalidate } } — die Seite nutzt export const dynamic = 'force-dynamic'
 * was revalidate wirkungslos macht; live fetch ohne Cache-Hint.
 */
export async function searchArchive(params: {
  rolle?: string
  gruppe?: string
  von?: string | number
  bis?: string | number
  page?: number
}): Promise<ArchiveSearchResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  if (params.rolle) query.set('rolle', params.rolle)
  if (params.gruppe) query.set('gruppe', String(params.gruppe))
  if (params.von) query.set('von', String(params.von))
  if (params.bis) query.set('bis', String(params.bis))
  if (params.page && params.page > 1) query.set('page', String(params.page))

  const response = await fetch(
    `${API_BASE_URL}/api/v1/archiv${query.toString() ? `?${query.toString()}` : ''}`,
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<ArchiveSearchResponse>
}
