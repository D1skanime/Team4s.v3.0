import { Description, Primary, Subtitle, Title } from '@storybook/addon-docs/blocks'

/**
 * Eigene Docs-Seitenvorlage für die gesamte Storybook-Kategorie "Bilder/*" (Cover, Banner,
 * Logo): lässt Storybooks Standard-Baustein `Controls` bewusst weg. Jede Bilder-Story zeigt
 * nur ein einziges, fest verdrahtetes Rohbild ohne echte Stellschrauben -- Storybooks
 * generische Docs-Seite würde dafür sonst den englischen Leerzustand
 * "This story has no controls" samt "Read docs"-Link anzeigen, der für diese Kategorie
 * keinen Mehrwert bietet.
 */
export function BildKatalogDocsPage() {
  return (
    <>
      <Title />
      <Subtitle />
      <Description />
      <Primary />
    </>
  )
}
