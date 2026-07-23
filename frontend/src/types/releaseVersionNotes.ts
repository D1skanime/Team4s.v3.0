export interface ReleaseVersionNote {
  id: number;
  releaseVersionId: number;
  fansubGroupId?: number | null;
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
  sourceRevision?: number | null;
  reviewState?: 'pending' | 'confirmed' | 'rejected' | 'tombstoned' | null;
  lastActivityAt?: string | null;
  rejectionCategory?: ReleaseReviewRejectionCategory | null;
  rejectionReason?: string | null;
}

export type ReleaseReviewRejectionCategory =
  | 'content.incorrect'
  | 'release_context.wrong'
  | 'quality.insufficient'
  | 'rights.unclear'
  | 'other';

export interface MemberRoleForVersion {
  memberId: number;
  memberName: string;
  roleId: number;
  roleCode: string;
  roleName: string;
  roleLabel: string;
  canEdit?: boolean;
}

export interface BulkNoteInput {
  id: number;
  sourceRevision?: number;
  roleCode: string;
  title?: string | null;
  bodyJson: unknown | null;
  sortOrder?: number;
}

export interface BulkUpsertReleaseVersionNotesRequest {
  notes: BulkNoteInput[];
}
