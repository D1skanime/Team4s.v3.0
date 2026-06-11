'use client'

import { CheckCircle2 } from 'lucide-react'

import {
  Button,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'

// Katalog-getriebene Rollen (D-07): aus role_definitions mit contexts @> 'anime_contribution'
// Kein Hardcode von Rollen-Codes hier — Spalten kommen als Prop von der aufrufenden Seite
export type RoleDefinition = {
  code: string
  label: string
  sort_order: number
}

export type ProjectCoverageRow = {
  animeId: number
  animeTitle: string
  coveredRoleCodes: string[] // welche role_codes mindestens 1 Contribution haben
}

type Props = {
  roles: RoleDefinition[]
  rows: ProjectCoverageRow[]
  onCellClick?: (animeId: number, roleCode: string) => void // optionale Inline-Zuweisung (D-07)
}

export function CoverageMatrix({ roles, rows, onCellClick }: Props) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Keine Projekte"
        description="Keine Projekte gefunden."
      />
    )
  }

  return (
    <Table variant="compact">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Projekt</TableHeaderCell>
          {roles.map((role) => (
            <TableHeaderCell key={role.code}>{role.label}</TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.animeId}>
            <TableCell>{row.animeTitle}</TableCell>
            {roles.map((role) => {
              const covered = row.coveredRoleCodes.includes(role.code)
              return (
                <TableCell key={role.code}>
                  {onCellClick ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => onCellClick(row.animeId, role.code)}
                      aria-label={`${role.label} für ${row.animeTitle} ${covered ? 'besetzt' : 'zuweisen'}`}
                    >
                      {covered ? <CheckCircle2 size={16} /> : null}
                    </Button>
                  ) : (
                    covered ? <CheckCircle2 size={16} aria-label="besetzt" /> : null
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default CoverageMatrix
