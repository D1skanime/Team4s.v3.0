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
import type { AdminMediaItem, AdminMediaReleaseBlock, AdminUserMediaPage } from '@/types/admin-users'

/**
 * Plan 139-07 compile-compatibility note: this is a MINIMAL adaptation to 139-04's real
 * server-side grouped/paginated contract (AdminUserMediaPage), required because 139-07's
 * api.ts change (paginated getAdminUserMedia) otherwise breaks the production build (the old
 * flat media_items response shape no longer exists on the wire). The full UI-SPEC-mandated
 * rewrite (filters, "Release-Medien öffnen" primary CTA copy correction D16, pagination
 * controls) is Plan 139-09's explicit scope -- see 139-CONTEXT.md/139-UI-SPEC.md.
 *
 * D19 (already honestly satisfied by this new shape): AdminMediaItem carries no owner_context/
 * scope field, so the old fake "Berechtigung aktiv/fehlt" badge derived only from owner_context
 * cannot be reconstructed here -- it is correctly gone, not just visually hidden.
 */

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

function MediaCard({ item }: { item: AdminMediaItem }) {
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
      </div>
    </Card>
  )
}

function ReleaseBlockSection({ block }: { block: AdminMediaReleaseBlock }) {
  const contextLabel = block.episode_number
    ? `Episode ${block.episode_number} · Version ${block.release_version_label}`
    : `Version ${block.release_version_label}`

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionHeader
        title={`${block.anime_title} · ${contextLabel}`}
        description={block.fansub_group_name}
        actions={<Badge variant="neutral">{block.items.length}</Badge>}
      />
      {block.items.map((item) => (
        <MediaCard key={item.media_asset_id} item={item} />
      ))}
      <Button
        variant="primary"
        size="sm"
        onClick={() => window.open(`/me/releases/${block.release_version_id}/workspace`, '_blank')}
      >
        Release-Medien öffnen
      </Button>
    </div>
  )
}

export function UserMediaTab({ userId }: Props) {
  const [data, setData] = useState<AdminUserMediaPage | null>(null)
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
  if (!data || data.data.length === 0) {
    return (
      <div style={{ padding: 'var(--space-4)' }}>
        <EmptyState title="Keine Mediauploads vorhanden." description="" />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <SectionHeader
        title="Mediauploads nach Release/Episode"
        description="Medien dieses Benutzers gruppiert nach Release-/Episodenkontext (read-only, D-15)."
      />
      {data.data.map((block) => (
        <ReleaseBlockSection
          key={`${block.release_version_id}-${block.anime_id}-${block.fansub_group_id}`}
          block={block}
        />
      ))}
    </div>
  )
}
