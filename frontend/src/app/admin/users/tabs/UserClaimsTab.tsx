'use client'

interface Props {
  userId: number
}

// Stub — wird in Plan 80-05 implementiert.
// UserClaimsTab.test.tsx (Gedenkprofil-Badge) bleibt bewusst RED bis Welle 5.
export function UserClaimsTab({ userId: _userId }: Props) {
  return <div>Wird geladen …</div>
}
