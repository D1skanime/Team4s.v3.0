export interface ReleaseVersionNote {
  id: number;
  releaseVersionId: number;
  memberId: number;
  roleId: number;
  title: string | null;
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

export interface MemberRoleForVersion {
  memberId: number;
  memberName: string;
  roleId: number;
  roleCode: string;
  roleName: string;
  roleLabel: string;
}

export interface BulkNoteInput {
  id: number;
  memberId: number;
  roleId: number;
  roleCode: string;
  title?: string | null;
  bodyJson: unknown | null;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder?: number;
}

export interface BulkUpsertReleaseVersionNotesRequest {
  notes: BulkNoteInput[];
}
