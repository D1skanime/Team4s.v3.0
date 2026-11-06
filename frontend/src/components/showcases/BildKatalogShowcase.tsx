import { SectionHeader, Text } from '@/components/ui'
import type { StorybookBildEintrag } from '@/lib/storybookBildKatalog'

import styles from './BildKatalogShowcase.module.css'

/**
 * Generische Showcase-Komponente für die Storybook-Kategorie "Bilder/*": zeigt GENAU EIN
 * Bildkatalog-Element roh -- ohne `ResponsiveImage`/`MediaFrame`-Wrapper und ohne Rahmen,
 * Rundung, Schatten oder Verlauf -- weil diese Kategorie bewusst das unveränderte Rohbild
 * zeigen soll, nicht seine spätere, gestaltete Produktionsdarstellung. Die Komponente ist
 * absichtlich generisch über einen `StorybookBildEintrag` gehalten: ein künftiger weiterer
 * Bildtyp (z. B. Backdrop, Gruppen-Logo) bekommt dieselbe Komponente mit einem anderen
 * Katalog-Eintrag, statt eine zweite, fast identische Showcase-Komponente zu bauen.
 */
export function BildKatalogShowcase({ eintrag }: { eintrag: StorybookBildEintrag }) {
  return (
    <div className={styles.page}>
      <SectionHeader
        eyebrow="Bilder"
        title={eintrag.bezeichnung}
        description="Rohes Beispielbild ohne Rahmen, Rundung, Schatten oder Verlauf -- steht für einen Bildtyp aus Team4S."
      />
      <figure className={styles.figure}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={eintrag.pfad} alt={eintrag.altText} className={styles.image} />
        <figcaption>
          <Text variant="strong">{eintrag.bezeichnung}</Text>
        </figcaption>
      </figure>
    </div>
  )
}
