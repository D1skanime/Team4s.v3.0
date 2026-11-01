import { X } from 'lucide-react'

import { IconButton } from '@/components/ui'

import styles from '../page.module.css'

// Exakte, neutrale Einmal-Bestätigung direkt nach einem erfolgreich validierten Registrierungs-
// Callback. Wird ausschließlich über die Einmal-Verbrauchs-Markierung in registrationCompletion.ts
// gesetzt -- niemals aus einem Query-Parameter oder einer anderen fälschbaren Eingabe abgeleitet.
export const REGISTRATION_COMPLETION_MESSAGE = 'Dein Team4s-Konto wurde erstellt. Du bist jetzt angemeldet.'

export function RegistrationCompletionBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className={styles.registrationBanner} role="status" data-testid="registration-completion-banner">
      <p>{message}</p>
      <IconButton
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Meldung schließen"
        icon={<X size={16} aria-hidden="true" />}
        onClick={onDismiss}
      />
    </div>
  )
}
