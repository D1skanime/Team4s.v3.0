'use client'

import type { ReactNode } from 'react'

import {
  Badge,
  BannerSection,
  Button,
  Card,
  Cluster,
  Heading,
  LinkChip,
  ResponsiveImage,
  SectionHeader,
  Stack,
  Text,
} from '@/components/ui'

import styles from './EffectsShowcase.module.css'

/** Echtes, farbiges Anime-Cover -- dasselbe Fixture-Bild, das `PublicReleaseSurfacesShowcase.tsx`
 *  bereits für seine Release-Screenshot-Vorschau nutzt (kein neues Bild erfunden, ein bestehendes
 *  wiederverwendet). Ersetzt das vorherige, fast leere Platzhalterbild, auf dem Unschärfe-, Glas-
 *  und Abdunklungs-Wirkungen kaum zu erkennen waren. */
const FIXTURE_IMAGE = '/covers/cover_1775167905284_2cd26cdc-2530-4914-8dd7-2a90a55b3fcd.jpg'
const FIXTURE_ALT = 'Beispielbild für die Effekt-Vorschau'

interface EffectEntry {
  name: string
  purpose: string
  usedBy: string
  /** Vorschau ohne die Wirkung -- derselbe Bildausschnitt, als direkter Vergleichspunkt. */
  before: ReactNode
  /** Vorschau mit der Wirkung, über dem tatsächlich genutzten Grundbaustein gerendert. */
  after: ReactNode
}

/** Fester Vorschau-Rahmen, identisch für Vorher/Nachher, damit beide Zustände direkt
 *  vergleichbar bleiben. */
function PreviewFrame({ children }: { children: ReactNode }) {
  return <div className={styles.previewFrame}>{children}</div>
}

/** Reiner Text ohne jede Fläche, Unschärfe oder Abdunklung -- die "Ohne Effekt"-Seite für die
 *  vier Chip-/Knopf-/Abzeichen-Beispiele unten. `tone="onScrim"` sorgt nur für Grundlesbarkeit
 *  auf dem Foto, nicht für die zu zeigende Wirkung selbst -- die fehlt hier bewusst. */
function FlatLabel({ children }: { children: ReactNode }) {
  return (
    <Text as="span" variant="body" tone="onScrim">
      {children}
    </Text>
  )
}

/**
 * Hand-kuratierter Katalog der fünf Effekt-Beispiele aus `styles/tokens/effects.css` (Befund
 * 26): jedes Beispiel ist eine Kombination mehrerer CSS-Eigenschaften mit genau EINEM visuellen
 * Zweck (z. B. "Unschärfe + Helligkeit + Sättigung + Skalierung" für den Bannerbild-Hintergrund)
 * -- anders als die automatisch aus `globals.css` ausgelesene Design-Tokens-Seite lässt sich das
 * nicht als einzelnes flaches Token aufzählen. Jede Vorschau rendert den tatsächlich genutzten
 * Grundbaustein (BannerSection/LinkChip/Button/Badge) über dem echten Beispielbild, statt die
 * Wirkung hier ein zweites Mal selbst mit eigenem CSS nachzubauen -- die Vorschau kann dadurch
 * nie vom echten Baustein abweichen. Jedes Beispiel zeigt zusätzlich ein Vorher/Nachher-Paar:
 * links derselbe Bildausschnitt ohne die Wirkung, rechts mit ihr.
 */
const EFFECT_ENTRIES: EffectEntry[] = [
  {
    name: 'Bannerbild-Hintergrund (unscharf)',
    purpose:
      'Unscharfer, abgedunkelter Hintergrund für großflächige Bannerbilder hinter dem eigentlichen Seiteninhalt -- Unschärfe, Abdunklung, Sättigung und leichte Vergrößerung wirken dabei gemeinsam.',
    usedBy: 'BannerSection',
    before: (
      <PreviewFrame>
        <ResponsiveImage
          src={FIXTURE_IMAGE}
          alt={FIXTURE_ALT}
          fill
          sizes="220px"
          unoptimized
          className={styles.plainImage}
        />
      </PreviewFrame>
    ),
    after: (
      <PreviewFrame>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT} />
      </PreviewFrame>
    ),
  },
  {
    name: 'Glas-Fläche auf hellem Bildhintergrund',
    purpose:
      'Heller, durchscheinender Chip-Hintergrund für Verlinkungen auf einer bereits hellen Glasfläche (z. B. die Poster-Spalte einer Detailseite).',
    usedBy: 'LinkChip (tone="glass")',
    before: (
      <PreviewFrame>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <FlatLabel>Drama</FlatLabel>
          </div>
        </BannerSection>
      </PreviewFrame>
    ),
    after: (
      <PreviewFrame>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <LinkChip tone="glass" href="#">Drama</LinkChip>
          </div>
        </BannerSection>
      </PreviewFrame>
    ),
  },
  {
    name: 'Abdunklung unter Chip-Text auf Bild',
    purpose:
      'Dunkler, blickdichterer Chip-Hintergrund für Verlinkungen auf einer fast transparenten Fläche, bei der der Chip selbst für Lesbarkeit sorgen muss.',
    usedBy: 'LinkChip (tone="scrim")',
    before: (
      <PreviewFrame>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <FlatLabel>Coming-of-Age</FlatLabel>
          </div>
        </BannerSection>
      </PreviewFrame>
    ),
    after: (
      <PreviewFrame>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <LinkChip tone="scrim" href="#">Coming-of-Age</LinkChip>
          </div>
        </BannerSection>
      </PreviewFrame>
    ),
  },
  {
    name: 'Glas-Knopf auf Bildfläche',
    purpose:
      'Durchscheinender Umschalt-Knopf für Aktionen direkt auf einem Bildhintergrund (z. B. ein Fansub-Gruppen-Filter über der Episodenliste), mit eigener Unschärfe/Sättigung statt einer deckenden Standardfläche.',
    usedBy: 'Button (variant="chipGlass")',
    before: (
      <PreviewFrame>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <FlatLabel>LazySubs</FlatLabel>
          </div>
        </BannerSection>
      </PreviewFrame>
    ),
    after: (
      <PreviewFrame>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <Button variant="chipGlass" size="sm">LazySubs</Button>
          </div>
        </BannerSection>
      </PreviewFrame>
    ),
  },
  {
    name: 'Abzeichen auf Bildfläche',
    purpose:
      'Dunkel abgesetzter, halbtransparenter Hintergrund für ein Status-Abzeichen, das direkt auf einem Bild liegt und dort trotzdem lesbar bleiben muss.',
    usedBy: 'Badge (variant="onMedia")',
    before: (
      <PreviewFrame>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <FlatLabel>Ongoing</FlatLabel>
          </div>
        </BannerSection>
      </PreviewFrame>
    ),
    after: (
      <PreviewFrame>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <Badge variant="onMedia">Ongoing</Badge>
          </div>
        </BannerSection>
      </PreviewFrame>
    ),
  },
]

export function EffectsShowcase() {
  return (
    <div className={styles.stack}>
      <SectionHeader
        eyebrow="Grundlagen"
        title="Effekte"
        description="Fünf Beispiele, wie Unschärfe-, Glas- und Abdunklungs-Effekte ein Bild lesbar und wirksam machen. Jede Zeile zeigt denselben Bildausschnitt einmal ohne und einmal mit dem jeweiligen Effekt, direkt über dem tatsächlich genutzten Baustein -- keine eigene CSS-Nachbildung ohne Bezug zur echten Anwendung."
      />
      {EFFECT_ENTRIES.map((entry) => (
        <Card key={entry.name} variant="section" title={entry.name}>
          <Cluster gap="contentPair" align="stretch" className={styles.compare}>
            <Stack gap="tight" className={styles.comparePane}>
              {entry.before}
              <Text variant="meta">Ohne Effekt</Text>
            </Stack>
            <Stack gap="tight" className={styles.comparePane}>
              {entry.after}
              <Text variant="meta">Mit Effekt</Text>
            </Stack>
          </Cluster>
          <div className={styles.meta}>
            <Heading level={3} size={4}>{entry.name}</Heading>
            <Text variant="soft">{entry.purpose}</Text>
            <Text variant="meta">Eingesetzt in: {entry.usedBy}</Text>
          </div>
        </Card>
      ))}
    </div>
  )
}
