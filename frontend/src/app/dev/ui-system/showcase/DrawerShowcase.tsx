'use client'

import { Button, Drawer, Table, TableBody, TableCell, TableRow, Tabs } from '@/components/ui'

import styles from '../page.module.css'

interface DrawerShowcaseProps {
  open: boolean
  onClose: () => void
}

export function DrawerShowcase({ open, onClose }: DrawerShowcaseProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Release-Details"
      description="Der Drawer bleibt global, soll sich aber wie eine konzentrierte seitliche Arbeitsfläche statt wie ein nacktes Standardsheet anfühlen."
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Schließen</Button>
        </>
      )}
    >
      <Tabs
        items={[
          {
            id: 'details',
            label: 'Details',
            content: (
              <div className={styles.stack}>
                <div className={styles.drawerDetailGrid}>
                  <div className={styles.drawerDetailItem}><span>Release-ID</span><strong>4821</strong></div>
                  <div className={styles.drawerDetailItem}><span>Anime-ID</span><strong>13</strong></div>
                  <div className={styles.drawerDetailItem}><span>Fansub-Gruppe</span><strong>88</strong></div>
                  <div className={styles.drawerDetailItem}><span>Kontext-Key</span><strong>88:13</strong></div>
                  <div className={styles.drawerDetailItem}><span>Anime</span><strong>Naruto</strong></div>
                  <div className={styles.drawerDetailItem}><span>Episode</span><strong>1</strong></div>
                  <div className={styles.drawerDetailItem}><span>Titel</span><strong>Entscheidungsschlacht auf dem Delmo-Stützpunkt</strong></div>
                  <div className={styles.drawerDetailItem}><span>Versionen</span><strong>1</strong></div>
                  <div className={styles.drawerDetailItem}><span>Datum</span><strong>23.04.2026</strong></div>
                  <div className={styles.drawerDetailItem}><span>Status</span><strong>Verknüpft</strong></div>
                  <div className={styles.drawerDetailItem}><span>Theme-Übersicht</span><strong>2 Uploads · 1 Global · 1 offen</strong></div>
                  <div className={styles.drawerDetailItem}><span>Theme-Definitionen</span><strong>4 geladen</strong></div>
                </div>
              </div>
            ),
          },
          {
            id: 'media',
            label: 'Medien',
            content: (
              <div className={styles.stack}>
                <div className={styles.drawerMediaIntro}>
                  <h3>Release-Medien im Überblick</h3>
                  <p>Screenshots, Typesetting-Beispiele und weitere Assets auf einen Blick, bevor du in die volle Medienverwaltung springst.</p>
                </div>
                <Table variant="compact" containerClassName={styles.drawerMediaTable}>
                  <TableBody>
                    <TableRow>
                      <TableCell className={styles.drawerMediaLabelCell}>Screenshots</TableCell>
                      <TableCell className={styles.drawerMediaValueCell}>12</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className={styles.drawerMediaLabelCell}>Typesetting</TableCell>
                      <TableCell className={styles.drawerMediaValueCell}>3</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className={styles.drawerMediaLabelCell}>Fun / Outtakes</TableCell>
                      <TableCell className={styles.drawerMediaValueCell}>–</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className={styles.drawerMediaLabelCell}>Sonstige</TableCell>
                      <TableCell className={styles.drawerMediaValueCell}>2</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className={styles.drawerMediaTotalLabelCell}>Gesamt</TableCell>
                      <TableCell className={styles.drawerMediaTotalValueCell}>17</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className={styles.drawerMediaPreviewGrid}>
                  <div className={styles.drawerMediaPreview}>Preview</div>
                  <div className={styles.drawerMediaPreview}>Preview</div>
                  <div className={styles.drawerMediaPreview}>Preview</div>
                  <div className={styles.drawerMediaPreview}>Preview</div>
                </div>
                <Button>Medienverwaltung öffnen</Button>
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  )
}
