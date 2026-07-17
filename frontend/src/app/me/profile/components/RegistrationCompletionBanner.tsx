import { X } from 'lucide-react'

import { Button } from '@/components/ui'

import styles from '../page.module.css'

// D-03/D-04: exact, neutral one-shot confirmation after a validated registration
// callback. Set only via the consume-once marker in registrationCompletion.ts —
// never derived from a query parameter or other spoofable input.
export const REGISTRATION_COMPLETION_MESSAGE = 'Dein Team4s-Konto wurde erstellt. Du bist jetzt angemeldet.'

export function RegistrationCompletionBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className={styles.registrationBanner} role="status" data-testid="registration-completion-banner">
      <p>{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        iconOnly
        aria-label="Meldung schließen"
        leftIcon={<X size={16} aria-hidden="true" />}
        onClick={onDismiss}
      />
    </div>
  )
}
