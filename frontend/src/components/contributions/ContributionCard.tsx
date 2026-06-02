'use client'

import type { MeAnimeContribution } from '@/types/contributions'

import { VisibilityDropdown } from './VisibilityDropdown'

interface ContributionCardProps {
  contribution: MeAnimeContribution
  mode: 'confirmed' | 'pending'
  onConfirm?: (id: number) => void
  onReject?: (id: number) => void
  onVisibilityChange?: (id: number, isPublic: boolean) => void
}

// Lesbare Bezeichner für bekannte role_codes
const ROLE_LABELS: Record<string, string> = {
  translation: 'Übersetzung',
  editing: 'Editing',
  timing: 'Timing',
  typesetting: 'Typesetting',
  encoding: 'Encoding',
  quality_check: 'Qualitätsprüfung',
  project_lead: 'Projektleitung',
  leader: 'Gruppenleitung',
  founder: 'Gründer/in',
}

function roleLabel(code: string): string {
  return ROLE_LABELS[code] ?? code
}

export function ContributionCard({
  contribution,
  mode,
  onConfirm,
  onReject,
  onVisibilityChange,
}: ContributionCardProps) {
  const { id, anime_id, fansub_group_id, role_codes, started_year, ended_year, is_public_on_member_profile } = contribution

  const yearRange = started_year
    ? ended_year
      ? `${started_year}–${ended_year}`
      : `ab ${started_year}`
    : null

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 6,
        padding: '12px 16px',
        background: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <div>
          <span style={{ fontWeight: 600, marginRight: 8 }}>Anime #{anime_id}</span>
          <span style={{ color: '#666', fontSize: '0.875rem' }}>Gruppe #{fansub_group_id}</span>
          {yearRange && (
            <span style={{ marginLeft: 8, color: '#888', fontSize: '0.8rem' }}>{yearRange}</span>
          )}
        </div>
        {mode === 'confirmed' && onVisibilityChange && (
          <VisibilityDropdown
            contributionId={id}
            isPublic={is_public_on_member_profile}
            onChanged={(isPublic) => onVisibilityChange(id, isPublic)}
          />
        )}
      </div>

      {role_codes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {role_codes.map((code) => (
            <span
              key={code}
              style={{
                background: '#e8f0fe',
                color: '#1a56db',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: '0.78rem',
                fontWeight: 500,
              }}
            >
              {roleLabel(code)}
            </span>
          ))}
        </div>
      )}

      {mode === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {onConfirm && (
            <button
              onClick={() => onConfirm(id)}
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 14px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Bestätigen
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(id)}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 14px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Ablehnen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
