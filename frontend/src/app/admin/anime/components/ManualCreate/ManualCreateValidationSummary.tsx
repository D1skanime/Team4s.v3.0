'use client'

import styles from '../../../admin.module.css'

interface ManualCreateValidationSummaryProps {
  missingFields: string[]
}

export function ManualCreateValidationSummary({ missingFields }: ManualCreateValidationSummaryProps) {
  if (missingFields.length === 0) {
    return null
  }

  return (
    <div className={styles.errorBox}>
      <strong>Entwurf unvollstaendig</strong>
      <p>Vor dem Anlegen fehlen noch:</p>
      <ul>
        {missingFields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </div>
  )
}
