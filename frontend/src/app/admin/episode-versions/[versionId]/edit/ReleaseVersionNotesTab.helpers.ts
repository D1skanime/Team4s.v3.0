import type { RoleDefinitionOption } from '@/types/admin-capability'
import type {
  MemberRoleForVersion,
  ReleaseVersionNote,
} from '@/types/releaseVersionNotes'

export type NoteFormState = {
  id: number
  bodyJson: unknown | null
  bodyHtml: string | null
  title: string
  visibility: 'public' | 'internal'
  status: 'draft' | 'published' | 'archived' | 'deleted'
  sortOrder: number
  sourceRevision: number | null
  reviewState: ReleaseVersionNote['reviewState']
  lastActivityAt: string | null
  rejectionCategory: ReleaseVersionNote['rejectionCategory']
  rejectionReason: string | null
  isDirty: boolean
}

export function createEmptyRichTextDoc() {
  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }
}

export function buildKey(memberId: number, roleId: number): string {
  return `${memberId}-${roleId}`
}

export function ensureRichTextValue(value: unknown | null): unknown {
  if (value == null) return createEmptyRichTextDoc()
  return JSON.parse(JSON.stringify(value))
}

export function collectPlainText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(collectPlainText).join('')
  if (typeof value !== 'object') return ''

  const node = value as { text?: unknown; content?: unknown; type?: unknown }
  const ownText = typeof node.text === 'string' ? node.text : ''
  const childText = collectPlainText(node.content)
  const separator = node.type === 'paragraph' && childText ? '\n' : ''
  return `${ownText}${childText}${separator}`
}

export function getPlainTextLength(value: unknown | null): number {
  return collectPlainText(value).trim().length
}

export function isRichTextEmpty(value: unknown | null): boolean {
  return getPlainTextLength(value) === 0
}

export function canEditMemberRole(memberRole: MemberRoleForVersion): boolean {
  return memberRole.canEdit !== false
}

export function buildInitialState(
  memberRoles: MemberRoleForVersion[],
  notes: ReleaseVersionNote[],
): Record<string, NoteFormState> {
  const state: Record<string, NoteFormState> = {}

  for (const mr of memberRoles) {
    const key = buildKey(mr.memberId, mr.roleId)
    const existing = notes.find((note) => (
      note.memberId === mr.memberId &&
      note.roleId === mr.roleId &&
      (canEditMemberRole(mr) || note.reviewState !== 'pending')
    ))
    state[key] = {
      id: existing?.id ?? 0,
      bodyJson: existing?.bodyJson ?? null,
      bodyHtml: existing?.bodyHtml ?? null,
      title: existing?.title ?? '',
      visibility: existing?.visibility ?? 'internal',
      status: existing?.status ?? 'draft',
      sortOrder: existing?.sortOrder ?? 0,
      sourceRevision: existing?.sourceRevision ?? null,
      reviewState: existing?.reviewState ?? null,
      lastActivityAt: existing?.lastActivityAt ?? null,
      rejectionCategory: existing?.rejectionCategory ?? null,
      rejectionReason: existing?.rejectionReason ?? null,
      isDirty: false,
    }
  }

  return state
}

export function groupRolesByMember(memberRoles: MemberRoleForVersion[], catalog: readonly RoleDefinitionOption[]) {
  const memberMap = new Map<number, { name: string; roles: MemberRoleForVersion[] }>()
  for (const memberRole of memberRoles) {
    if (!memberMap.has(memberRole.memberId)) {
      memberMap.set(memberRole.memberId, { name: memberRole.memberName, roles: [] })
    }
    memberMap.get(memberRole.memberId)!.roles.push(memberRole)
  }

  const catalogOrder = new Map(catalog.map((role, index) => [role.code, index]))
  for (const member of memberMap.values()) {
    member.roles.sort((a, b) => (
      (catalogOrder.get(a.roleCode) ?? Number.MAX_SAFE_INTEGER) -
      (catalogOrder.get(b.roleCode) ?? Number.MAX_SAFE_INTEGER)
    ))
  }
  return Array.from(memberMap.entries())
}

export function formatCharacterStatus(length: number): string {
  return length === 0 ? 'Leer' : `${length} Zeichen`
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

export function formatLastActivity(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
