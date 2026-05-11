export interface FansubGroupNote {
  id: number;
  fansubGroupId: number;
  title: string;
  bodyMarkdown: string;
  bodyHtml: string;
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
  bodyMarkdown: string;
  bodyHtml: string;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder: number;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface AnimeFansubProjectNote {
  id: number;
  animeId: number;
  fansubGroupId: number;
  title: string;
  bodyMarkdown: string;
  bodyHtml: string;
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
  bodyMarkdown: string;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface UpdateFansubGroupNoteRequest {
  title?: string;
  bodyMarkdown?: string;
  visibility?: 'public' | 'internal';
  status?: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface CreateMemberGroupStoryRequest {
  memberId: number;
  roleId?: number | null;
  title: string;
  bodyMarkdown: string;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface UpdateMemberGroupStoryRequest {
  memberId?: number;
  roleId?: number | null;
  title?: string;
  bodyMarkdown?: string;
  visibility?: 'public' | 'internal';
  status?: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface UpsertAnimeFansubProjectNoteRequest {
  title?: string;
  bodyMarkdown: string;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}
