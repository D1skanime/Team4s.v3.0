// profilePageHelpers.ts
// Reine Hilfsfunktionen fuer MyProfilePage — ausgelagert um die 450-Zeilen-Grenze einzuhalten.

import { ApiError } from '@/lib/api'
import type { MemberProfileData, TipTapDocument } from '@/types/profile'

import { getMaxActivityYear, MIN_ACTIVITY_YEAR } from './activityYears'
import type { MemberProfileFormState } from './profileFormTypes'

export const PROFILE_LOAD_TIMEOUT_MS = 10000
export const AUTH_REQUIRED_MESSAGE = 'Anmeldung erforderlich. Bitte melde dich erneut an.'

export function richTextFromPlainText(text: string): TipTapDocument {
  const trimmed = text.trim()
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: trimmed ? [{ type: 'text', text: trimmed }] : [] }],
  }
}

export function isTipTapDocument(value: unknown): value is TipTapDocument {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function toFormState(profile: MemberProfileData): MemberProfileFormState {
  return {
    fansubName: profile.fansub_name || '',
    bio: profile.bio || '',
    memberStory: isTipTapDocument(profile.member_story_json)
      ? profile.member_story_json
      : richTextFromPlainText(profile.member_story || ''),
    activeFromYear: yearFromProfileDate(profile.active_from_date, profile.active_from_year),
    activeUntilYear: yearFromProfileDate(profile.active_until_date, profile.active_until_year),
    isCurrentlyActive: Boolean(profile.is_currently_active),
    profileVisibility: profile.profile_visibility || 'members_only',
  }
}

export function emptyFormState(): MemberProfileFormState {
  return {
    fansubName: '',
    bio: '',
    memberStory: richTextFromPlainText(''),
    activeFromYear: '',
    activeUntilYear: '',
    isCurrentlyActive: false,
    profileVisibility: 'members_only',
  }
}

export function yearFromProfileDate(dateValue?: string | null, fallbackYear?: number | null): string {
  const trimmed = typeof dateValue === 'string' ? dateValue.trim() : ''
  const match = /^(\d{4})-01-01$/.exec(trimmed)
  if (match) return match[1]
  return fallbackYear ? String(fallbackYear) : ''
}

export function normalizedDateFromYear(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < MIN_ACTIVITY_YEAR || parsed > getMaxActivityYear()) return null
  return `${parsed}-01-01`
}

export function validateOptionalYear(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (!/^\d{4}$/.test(trimmed)) return 'Bitte ein vierstelliges Jahr eingeben.'
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < MIN_ACTIVITY_YEAR || parsed > getMaxActivityYear()) {
    return `Bitte ein Jahr zwischen ${MIN_ACTIVITY_YEAR} und ${getMaxActivityYear()} auswählen.`
  }
  return undefined
}

export function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

export function withProfileLoadTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Profil konnte nicht rechtzeitig geladen werden. Bitte melde dich erneut an.'))
    }, PROFILE_LOAD_TIMEOUT_MS)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

export function accountSnapshot(profile: MemberProfileData): string {
  return JSON.stringify({
    accountDisplayName: profile.account_display_name || '',
    email: profile.email || '',
    status: profile.account_status || '',
    roles: [...profile.account_global_roles].sort(),
  })
}
