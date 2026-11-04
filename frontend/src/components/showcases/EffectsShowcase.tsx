'use client'

import type { ReactNode } from 'react'

import { Badge, BannerSection, Button, Card, Heading, LinkChip, SectionHeader, Text } from '@/components/ui'

import styles from './EffectsShowcase.module.css'

/** Platzhalter-Bild, das bereits an mehreren Stellen (u. a. BannerSection.stories.tsx) als
 *  Fixture für Bildhintergrund-Vorschauen dient -- kein neues Bild erfunden. */
const FIXTURE_IMAGE = '/covers/placeholder.jpg'
const FIXTURE_ALT = 'Beispielbild für die Effekt-Vorschau'

interface EffectRecipe {
  name: string
  purpose: string
  usedBy: string
  preview: ReactNode
}

/**
 * Hand-kuratierter Katalog der fünf Effekt-Rezepturen aus `styles/tokens/effects.css` (Befund
 * 26): anders als die automatisch aus `globals.css` ausgelesene Design-Tokens-Seite ist eine
 * Rezeptur eine Komposition MEHRERER Eigenschaften mit genau EINEM visuellen Zweck (z. B.
 * "Unschärfe + Helligkeit + Sättigung + Skalierung" für den Bannerbild-Hintergrund) -- nicht
 * einzeln als flaches Token aufzählbar wie Abstand/Radius. Jede Vorschau rendert den TATSÄCHLICH
 * konsumierenden Grundbaustein (BannerSection/LinkChip/Button/Badge) über dem echten
 * Platzhalterbild, statt die CSS-Rezeptur hier ein zweites Mal nachzubauen -- die Vorschau kann
 * dadurch nie visuell vom echten Baustein abweichen.
 */
const EFFECT_RECIPES: EffectRecipe[] = [
  {
    name: 'Bannerbild-Hintergrund (unscharf)',
    purpose:
      'Unscharfer, abgedunkelter Hintergrund für großflächige Bannerbilder hinter dem eigentlichen Seiteninhalt -- Blur-, Helligkeits-, Sättigungs- und Skalierungs-Rezeptur in einem Token-Satz.',
    usedBy: 'BannerSection',
    preview: (
      <div className={styles.previewFrame}>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT} />
      </div>
    ),
  },
  {
    name: 'Glas-Fläche auf hellem Bildhintergrund',
    purpose:
      'Heller, durchscheinender Chip-Hintergrund für Verlinkungen auf einer bereits hellen Glasfläche (z. B. die Poster-Spalte einer Detailseite).',
    usedBy: 'LinkChip (tone="glass")',
    preview: (
      <div className={styles.previewFrame}>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <LinkChip tone="glass" href="#">Drama</LinkChip>
          </div>
        </BannerSection>
      </div>
    ),
  },
  {
    name: 'Abdunklung unter Chip-Text auf Bild',
    purpose:
      'Dunkler, blickdichterer Chip-Hintergrund für Verlinkungen auf einer fast transparenten Fläche, bei der der Chip selbst für Lesbarkeit sorgen muss.',
    usedBy: 'LinkChip (tone="scrim")',
    preview: (
      <div className={styles.previewFrame}>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <LinkChip tone="scrim" href="#">Coming-of-Age</LinkChip>
          </div>
        </BannerSection>
      </div>
    ),
  },
  {
    name: 'Glas-Knopf auf Bildfläche',
    purpose:
      'Durchscheinender Umschalt-Knopf für Aktionen direkt auf einem Bildhintergrund (z. B. ein Fansub-Gruppen-Filter über der Episodenliste), mit eigener Unschärfe/Sättigung statt einer deckenden Standardfläche.',
    usedBy: 'Button (variant="chipGlass")',
    preview: (
      <div className={styles.previewFrame}>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <Button variant="chipGlass" size="sm">LazySubs</Button>
          </div>
        </BannerSection>
      </div>
    ),
  },
  {
    name: 'Abzeichen auf Bildfläche',
    purpose:
      'Dunkel abgesetzter, halbtransparenter Hintergrund für ein Status-Abzeichen, das direkt auf einem Bild liegt und dort trotzdem lesbar bleiben muss.',
    usedBy: 'Badge (variant="onMedia")',
    preview: (
      <div className={styles.previewFrame}>
        <BannerSection imageUrl={FIXTURE_IMAGE} imageAlt={FIXTURE_ALT}>
          <div className={styles.previewSlot}>
            <Badge variant="onMedia">Ongoing</Badge>
          </div>
        </BannerSection>
      </div>
    ),
  },
]

export function EffectsShowcase() {
  return (
    <div className={styles.stack}>
      <SectionHeader
        eyebrow="Grundlagen"
        title="Effekte"
        description="Die fünf Blur-/Glas-/Scrim-Rezepturen aus styles/tokens/effects.css, jeweils über dem tatsächlich konsumierenden Grundbaustein gezeigt -- keine domänenfreie CSS-Nachbildung."
      />
      {EFFECT_RECIPES.map((recipe) => (
        <Card key={recipe.name} variant="section" title={recipe.name}>
          {recipe.preview}
          <div className={styles.meta}>
            <Heading level={3} size={4}>{recipe.name}</Heading>
            <Text variant="soft">{recipe.purpose}</Text>
            <Text variant="meta">Eingesetzt in: {recipe.usedBy}</Text>
          </div>
        </Card>
      ))}
    </div>
  )
}
