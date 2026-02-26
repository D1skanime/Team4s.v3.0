import { ReactNode } from 'react'

interface AnimeBrowserPanelProps {
  children: ReactNode
}

export function AnimeBrowserPanel({ children }: AnimeBrowserPanelProps) {
  return <>{children}</>
}

