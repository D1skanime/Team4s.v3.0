import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from './Card'
import { StatusIcon } from './StatusIcon'
import styles from './ui.module.css'

export interface ErrorStateProps {
  title: string
  description: string
  action?: ReactNode
}

type ErrorStateCopyOptions = {
  defaultTitle?: string
  defaultDescription?: string
  permissionDescription?: string
}

function getErrorStatus(error: unknown): number | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status
  }

  return null
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}

export function getErrorStateCopy(
  error: unknown,
  options: ErrorStateCopyOptions = {},
): Pick<ErrorStateProps, 'title' | 'description'> {
  if (getErrorStatus(error) === 403) {
    return {
      title: 'Keine Berechtigung',
      description:
        options.permissionDescription ??
        'Du hast keine Berechtigung für diese Aktion. Bitte wende dich an einen Fansub-Admin.',
    }
  }

  return {
    title: options.defaultTitle ?? 'Fehler beim Laden',
    description: getErrorMessage(
      error,
      options.defaultDescription ?? 'Die Daten konnten nicht geladen werden.',
    ),
  }
}

export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <Card variant="flat">
      <StatusIcon tone="danger" icon={<TriangleAlert size={20} strokeWidth={2} />} />
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
      {action}
    </Card>
  )
}
