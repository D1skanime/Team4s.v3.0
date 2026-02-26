import { ReactNode } from 'react'

interface ActiveContextPanelProps {
  children: ReactNode
}

export function ActiveContextPanel({ children }: ActiveContextPanelProps) {
  return <>{children}</>
}

