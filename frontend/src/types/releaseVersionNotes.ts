export interface ReleaseVersionNote {
  id: number;
  releaseVersionId: number;
  memberId: number;
  roleId: number;
  title: string | null;
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

export interface MemberRoleForVersion {
  memberId: number;
  memberName: string;
  roleId: number;
  roleName: string;
  roleLabel: string;
}

export interface BulkNoteInput {
  id: number;          // 0 = neu erstellen
  memberId: number;
  roleId: number;
  title?: string | null;
  bodyMarkdown: string;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface BulkUpsertReleaseVersionNotesRequest {
  notes: BulkNoteInput[];
}
