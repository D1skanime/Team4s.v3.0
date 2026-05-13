export interface FansubGroupNote {
  id: number;
  fansubGroupId: number;
  title: string;
  bodyMarkdown?: string | null;
  bodyHtml: string;
  bodyJson: unknown | null;
  bodyText: string;
  editorType: string;
  contentSchemaVersion: number;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder: number;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface MemberGroupStory {
  id: number;
  fansubGroupId: number;
  memberId: number;
  roleId: number | null;
  title: string;
  bodyMarkdown?: string | null;
  bodyHtml: string;
  bodyJson: unknown | null;
  bodyText: string;
  editorType: string;
  contentSchemaVersion: number;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder: number;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface MemberStoryContextMember {
  id: number;
  nickname: string;
}

export interface MemberStoryContextRole {
  id: number;
  name: string;
  label: string;
}

export interface MemberStoryContext {
  members: MemberStoryContextMember[];
  roles: MemberStoryContextRole[];
}

export interface AnimeFansubProjectNote {
  id: number;
  animeId: number;
  fansubGroupId: number;
  title: string;
  bodyMarkdown?: string | null;
  bodyHtml: string;
  bodyJson: unknown | null;
  bodyText: string;
  editorType: string;
  contentSchemaVersion: number;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder: number;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface CreateFansubGroupNoteRequest {
  title: string;
  bodyJson: unknown | null;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface UpdateFansubGroupNoteRequest {
  title?: string;
  bodyJson?: unknown | null;
  visibility?: 'public' | 'internal';
  status?: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface CreateMemberGroupStoryRequest {
  memberId: number;
  roleId?: number | null;
  title: string;
  bodyJson: unknown | null;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface UpdateMemberGroupStoryRequest {
  title?: string;
  bodyJson?: unknown | null;
  visibility?: 'public' | 'internal';
  status?: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface UpsertAnimeFansubProjectNoteRequest {
  title?: string;
  bodyJson: unknown | null;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}
