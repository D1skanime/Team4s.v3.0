'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
} from '@/components/ui'
import { ApiError, getAdminUserMedia } from '@/lib/api'
import type { AdminMediaItemSummary, AdminUserMediaResponse } from '@/types/admin-users'

interface Props {
  userId: number
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Leitet release_version_id aus owner_context ab (Format: "release_version:<id>")
function parseReleaseVersionId(ownerContext: string): number | null {
  const match = /release_version:(\d+)/.exec(ownerContext)
  if (match) return parseInt(match[1], 10)
  return null
}

// Prüft ob Berechtigung aktiv ist (owner_context enthält release_version mit Scope)
function hasScopePermission(ownerContext: string): boolean {
  return ownerContext.startsWith('release_version:') && ownerContext.trim().length > 'release_version:'.length
}

// Gruppiert Medienelemente nach release_version_id
function groupByReleaseVersion(
  items: AdminMediaItemSummary[],
): Map<string, AdminMediaItemSummary[]> {
  const groups = new Map<string, AdminMediaItemSummary[]>()
  for (const item of items) {
    const key = item.owner_context || 'ohne-scope'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return groups
}

function MediaCard({ item }: { item: AdminMediaItemSummary }) {
  const versionId = parseReleaseVersionId(item.owner_context)
  const scopeActive = hasScopePermission(item.owner_context)

  return (
    <Card variant="nested" style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ padding: 'var(--space-3)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
            {item.original_filename || item.media_type}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Typ: {item.media_type} &middot; Größe: {formatFileSize(item.file_size_bytes)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
            Hochgeladen: {formatDate(item.uploaded_at)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
          {scopeActive ? (
            <Badge variant="success">Berechtigung aktiv</Badge>
          ) : (
            <Badge variant="warning">Berechtigung fehlt</Badge>
          )}
          {versionId != null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(`/me/releases/${versionId}/workspace`, '_blank')
              }
            >
              Arbeitsfläche öffnen
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function MediaGroups({ items }: { items: AdminMediaItemSummary[] }) {
  const groups = groupByReleaseVersion(items)

  return (
    <>
      {Array.from(groups.entries()).map(([contextKey, groupItems]) => {
        const versionId = parseReleaseVersionId(contextKey)
        const groupTitle =
          versionId != null
            ? `Release-Version ${versionId}`
            : 'Ohne Release-Kontext'

        return (
          <div key={contextKey} style={{ marginBottom: 'var(--space-5)' }}>
            <SectionHeader
              title={groupTitle}
              actions={<Badge variant="neutral">{groupItems.length}</Badge>}
            />
            {groupItems.map((item) => (
              <MediaCard key={item.media_asset_id} item={item} />
            ))}
          </div>
        )
      })}
    </>
  )
}

export function UserMediaTab({ userId }: Props) {
  const [data, setData] = useState<AdminUserMediaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await getAdminUserMedia(userId)
      setData(resp)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Daten konnten nicht geladen werden. Erneut versuchen.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (isLoading) return <LoadingState title="Wird geladen …" description="" />
  if (error) {
    return (
      <ErrorState
        title="Fehler beim Laden"
        description={error}
      />
    )
  }
  if (!data) return <EmptyState title="Keine Mediauploads vorhanden." description="" />

  if (data.media_items.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <EmptyState title="Keine Mediauploads vorhanden." description="" />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <SectionHeader
        title="Mediauploads nach Release-Version"
        description="Medien dieses Benutzers gruppiert nach Release-Version (read-only, D-15)."
      />
      <MediaGroups items={data.media_items} />
    </div>
  )
}
