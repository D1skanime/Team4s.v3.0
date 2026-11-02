import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Button } from './Button'
import { Drawer } from './Drawer'
import { Table, TableBody, TableCell, TableRow } from './Table'
import { Tabs } from './Tabs'

const meta = {
  title: 'Zusammengesetzte Bausteine/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  args: {
    open: true,
    onClose: () => {},
    title: 'Release-Details',
    description: 'Der Drawer bleibt global, soll sich aber wie eine konzentrierte seitliche Arbeitsfläche anfühlen.',
    children: <p>Mock-Detailinhalt ohne API-Seam.</p>,
    footer: <Button variant="secondary">Schließen</Button>,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Seitlicher Drawer für fokussierte Detail-Ansichten. Besteht aus: ' +
          `${storybookDocsLink('Grundbausteine/IconButton', 'IconButton')}, ${storybookDocsLink('Grundbausteine/Button', 'Button')} (DialogHeader liefert die Kopfzeile, aber als internes Implementierungsdetail ohne eigene Story).`,
      },
    },
  },
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

/** Echter `useState`-Zustand statt eines eingefrorenen `open: true`/`onClose: () => {}`-
 *  Platzhalters -- ein Klick auf den Auslöser-Button öffnet den Drawer in der jeweiligen Größe,
 *  Escape/Backdrop-Klick/der Schließen-Button im Footer schließen ihn wieder über den echten
 *  `onClose`-Callback. */
function ControlledDrawer({ size }: { size: 'md' | 'lg' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Drawer öffnen</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        size={size}
        title="Release-Details"
        description="Der Drawer bleibt global, soll sich aber wie eine konzentrierte seitliche Arbeitsfläche anfühlen."
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>Schließen</Button>}
      >
        <p>Mock-Detailinhalt ohne API-Seam.</p>
      </Drawer>
    </>
  )
}

export const Standard: Story = {
  name: 'Standard',
  render: () => <ControlledDrawer size="md" />,
}

export const Gross: Story = {
  name: 'Groß',
  render: () => <ControlledDrawer size="lg" />,
}

/** Lässt `footer` bewusst weg -- zeigt den in `Drawer.tsx` eingebauten Standard-Footer-Button
 *  "Fertig", der in den übrigen Stories durch einen eigenen "Schließen"-Button überschrieben wird. */
function DrawerWithDefaultFooter() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Drawer öffnen</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Release-Details"
        description="Ohne eigenen Footer -- der Drawer-Baustein zeigt seinen Standard-Button."
      >
        <p>Mock-Detailinhalt ohne API-Seam.</p>
      </Drawer>
    </>
  )
}

export const StandardFusszeile: Story = {
  name: 'Standard-Fußzeile',
  render: () => <DrawerWithDefaultFooter />,
}

/** Demonstriert `variant="responsiveSheet"`: auf schmalen Bildschirmen wandert der Drawer als
 *  Bottom-Sheet ein, auf breiten Bildschirmen bleibt er als zentriertes, abgerundetes Panel sichtbar. */
function ResponsiveSheetDrawer() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Drawer öffnen</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        variant="responsiveSheet"
        title="Release-Details"
        description="Responsives Sheet -- zentriertes Panel auf breiten, Bottom-Sheet auf schmalen Bildschirmen."
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>Schließen</Button>}
      >
        <p>Mock-Detailinhalt ohne API-Seam.</p>
      </Drawer>
    </>
  )
}

export const ResponsivesSheet: Story = {
  name: 'Responsives Sheet',
  render: () => <ResponsiveSheetDrawer />,
}

/**
 * Identisch zu NormalGross/Gross, zusätzlich mit den vollständigen `args` aus `meta` (inklusive
 * des eingefrorenen `open: true`-Platzhalters) als Storybook-Controls bedienbar -- demonstriert,
 * dass ein Aufrufer beliebige Props über `args` überschreiben kann, ohne die lokale
 * Öffnen-/Schließen-Logik zu verlieren.
 */
export const OeffnenUndSchliessen: Story = {
  name: 'Öffnen und Schließen',
  render: (args) => {
    function Demo() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Button onClick={() => setOpen(true)}>Drawer öffnen</Button>
          <Drawer {...args} open={open} onClose={() => setOpen(false)} />
        </>
      )
    }
    return <Demo />
  },
}

/** Ein Detail-Feld (Bezeichner + Wert) der Detail-Tab-Übersicht -- Inline-Styles statt eines
 *  eigenen CSS-Moduls, da dieser Auftrag bewusst keine neuen, rohen Design-Literale in
 *  `components/ui/*.module.css` einführt (siehe `foreignVariableOverrides.regression.test.ts`,
 *  das genau das für echte Baustein-Styles verbietet); reine Demo-Werte für eine Story
 *  rechtfertigen keine neuen, erfundenen Token-Zuordnungen. */
function DrawerDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 10, borderBottom: '1px solid rgba(100, 116, 139, 0.16)' }}>
      <span style={{ color: 'var(--text-soft, #625c56)', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <strong style={{ color: 'var(--text-strong, #171513)', lineHeight: 1.3 }}>{value}</strong>
    </div>
  )
}

/** Release-Details-Drawer mit Größen-Umschalter (Normal/Groß) und zwei Tabs (Detail-Grid,
 *  Medien-Tabelle) -- zeigt das Zusammenspiel von Drawer, Tabs und Table bei einem realistischen
 *  Detail-Ansicht-Inhalt statt eines Mock-Absatzes. */
function DrawerMitTabsUndGroessenUmschalterDemo() {
  const [open, setOpen] = useState(false)
  const [size, setSize] = useState<'md' | 'lg'>('md')

  return (
    <>
      <Button onClick={() => setOpen(true)}>Drawer öffnen</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Release-Details"
        description="Der Drawer bleibt global, soll sich aber wie eine konzentrierte seitliche Arbeitsfläche statt wie ein nacktes Standardsheet anfühlen."
        size={size}
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>Schließen</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button type="button" variant={size === 'md' ? 'secondary' : 'ghost'} onClick={() => setSize('md')}>
            Normal (620px)
          </Button>
          <Button type="button" variant={size === 'lg' ? 'secondary' : 'ghost'} onClick={() => setSize('lg')}>
            Groß (760px)
          </Button>
        </div>
        <Tabs
          items={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  <DrawerDetailField label="Release-ID" value="4821" />
                  <DrawerDetailField label="Anime-ID" value="13" />
                  <DrawerDetailField label="Fansub-Gruppe" value="88" />
                  <DrawerDetailField label="Kontext-Key" value="88:13" />
                  <DrawerDetailField label="Anime" value="Naruto" />
                  <DrawerDetailField label="Episode" value="1" />
                  <DrawerDetailField label="Titel" value="Entscheidungsschlacht auf dem Delmo-Stützpunkt" />
                  <DrawerDetailField label="Versionen" value="1" />
                  <DrawerDetailField label="Datum" value="23.04.2026" />
                  <DrawerDetailField label="Status" value="Verknüpft" />
                  <DrawerDetailField label="Theme-Übersicht" value="2 Uploads · 1 Global · 1 offen" />
                  <DrawerDetailField label="Theme-Definitionen" value="4 geladen" />
                </div>
              ),
            },
            {
              id: 'media',
              label: 'Medien',
              content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <h3 style={{ margin: 0, color: 'var(--text-strong, #171513)', fontSize: '1.02rem' }}>Release-Medien im Überblick</h3>
                    <p style={{ margin: 0, color: 'var(--text-soft, #625c56)', lineHeight: 1.5 }}>
                      Screenshots, Typesetting-Beispiele und weitere Assets auf einen Blick, bevor du in die volle Medienverwaltung springst.
                    </p>
                  </div>
                  <Table variant="compact">
                    <TableBody>
                      <TableRow>
                        <TableCell style={{ color: 'var(--text-soft, #625c56)', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase' }}>Screenshots</TableCell>
                        <TableCell style={{ textAlign: 'right', fontWeight: 700 }}>12</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ color: 'var(--text-soft, #625c56)', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase' }}>Typesetting</TableCell>
                        <TableCell style={{ textAlign: 'right', fontWeight: 700 }}>3</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ color: 'var(--text-soft, #625c56)', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase' }}>Fun / Outtakes</TableCell>
                        <TableCell style={{ textAlign: 'right', fontWeight: 700 }}>–</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ color: 'var(--text-soft, #625c56)', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase' }}>Sonstige</TableCell>
                        <TableCell style={{ textAlign: 'right', fontWeight: 700 }}>2</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ color: 'var(--text-soft, #625c56)', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', paddingTop: 14 }}>Gesamt</TableCell>
                        <TableCell style={{ textAlign: 'right', fontWeight: 700, paddingTop: 14 }}>17</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    {['Vorschau', 'Vorschau', 'Vorschau', 'Vorschau'].map((label, index) => (
                      <div
                        key={index}
                        style={{
                          aspectRatio: '1 / 1', borderRadius: 14, border: '1px solid rgba(56, 70, 96, 0.12)',
                          display: 'grid', placeItems: 'center', color: 'var(--text-soft, #625c56)', fontWeight: 700,
                        }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <Button>Medienverwaltung öffnen</Button>
                </div>
              ),
            },
          ]}
        />
      </Drawer>
    </>
  )
}

export const MitTabsUndGroessenUmschalter: Story = {
  name: 'Mit Tabs und Größen-Umschalter',
  render: () => <DrawerMitTabsUndGroessenUmschalterDemo />,
}
