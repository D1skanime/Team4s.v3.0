'use client'

import { FilePlus, UserX } from 'lucide-react'

import {
  Button,
  Input,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import type { MemberRequestRow } from '@/types/profile'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE')
}

export type GroupMemberRequestsTableProps = {
  memberRequests: MemberRequestRow[]
  approveNicknames: Record<number, string>
  canManageClaims: boolean
  onNicknameChange: (requestId: number, value: string) => void
  onApprove: (requestId: number) => void
  onReject: (requestId: number) => void
}

export function GroupMemberRequestsTable({
  memberRequests,
  approveNicknames,
  canManageClaims,
  onNicknameChange,
  onApprove,
  onReject,
}: GroupMemberRequestsTableProps) {
  if (memberRequests.length === 0) return null

  return (
    <>
      <SectionHeader
        eyebrow="Claims"
        title={`Neuanlage-Anträge (${memberRequests.length})`}
        description="Diese Anträge haben noch keinen passenden historischen Eintrag und bleiben deshalb unterhalb der Mitglieder-Tabelle."
      />
      <Table
        variant="withActions"
        caption="Neuanlage-Anträge ohne historischen Mitglieder-Anker"
        containerClassName={styles.fansubEditTableWrapWine}
      >
        <TableHead>
          <TableRow>
            <TableHeaderCell>App-User-ID</TableHeaderCell>
            <TableHeaderCell>Notiz</TableHeaderCell>
            <TableHeaderCell>Eingereicht</TableHeaderCell>
            <TableHeaderCell>Nickname</TableHeaderCell>
            <TableHeaderCell>Aktionen</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {memberRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.app_user_id}</TableCell>
              <TableCell>{request.note || '-'}</TableCell>
              <TableCell>{formatDate(request.created_at)}</TableCell>
              <TableCell>
                <Input
                  type="text"
                  placeholder="Nickname eingeben..."
                  value={approveNicknames[request.id] || ''}
                  onChange={(event) => onNicknameChange(request.id, event.target.value)}
                />
              </TableCell>
              <TableCell>
                <div className={styles.fansubEditTableRowActions}>
                  <Button
                    size="sm"
                    variant="success"
                    leftIcon={<FilePlus size={14} aria-hidden="true" />}
                    disabled={!canManageClaims}
                    onClick={() => onApprove(request.id)}
                  >
                    Anlegen
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    leftIcon={<UserX size={14} aria-hidden="true" />}
                    disabled={!canManageClaims}
                    onClick={() => onReject(request.id)}
                  >
                    Ablehnen
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
