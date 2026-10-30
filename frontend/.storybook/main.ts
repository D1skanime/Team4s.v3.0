import type { StorybookConfig } from '@storybook/nextjs'

/**
 * Storybook-Grundkonfiguration für den Komponenten-Katalog des Team4s-Frontends.
 *
 * Ersetzt die frühere In-App-Showcase-Route vollständig: Jede globale Primitive aus
 * `@/components/ui` (Kategorie `UI/*`) und jede migrierte domänenspezifische
 * Komposition (Kategorie `Showcases/*`) bekommt eine eigene `*.stories.tsx`-Datei unter
 * den jeweiligen Komponenten-Verzeichnissen. Der `@storybook/nextjs`-Adapter nutzt den
 * Webpack-Builder (nicht Vite), damit die Build-Pipeline zu den bestehenden
 * Next.js-Konventionen des Projekts passt.
 */
const config: StorybookConfig = {
  stories: [
    '../src/components/ui/**/*.stories.@(ts|tsx)',
    '../src/components/showcases/**/*.stories.@(ts|tsx)',
    // Einzelne "Im Einsatz/*"-Stories für bereits produktive Domänen-Komponenten leben direkt
    // neben ihrer Komponente statt unter components/showcases/ (z. B. FansubHeroSection.stories.tsx
    // unter components/fansubs/) -- ohne dieses Glob würde Storybook solche Dateien gar nicht
    // erst einlesen, obwohl typecheck/vitest sie bereits prüfen (UAT-Runde 2, Befund 1).
    '../src/components/fansubs/**/*.stories.@(ts|tsx)',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  addons: ['@storybook/addon-themes', '@storybook/addon-a11y', '@storybook/addon-docs'],
  // Die 113 Erfolgsbadge-Grafiken unter public/member-achievement-badges müssen
  // auch im Storybook-eigenen Dev-/Build-Server unter / erreichbar sein, genauso
  // wie im Next.js-Dev-Server.
  staticDirs: ['../public'],
  webpackFinal: async (webpackConfig) => {
    // `ResponsiveImage.tsx` importiert `@/lib/images/publicImagePatterns` ohne
    // Dateiendung; dieses Hilfsmodul existiert ausschließlich als `.mjs`-Datei (von
    // `next.config.mjs` mitgenutzt, siehe dessen eigenen Kommentar). Next.js' eigene
    // Webpack-Pipeline löst den `@/*`-Alias dafür problemlos auf. Der von
    // `@storybook/nextjs` automatisch eingehängte `TsconfigPathsPlugin` (einzig
    // zuständig für die `@/*`-Auflösung, siehe tsconfig.json `paths`) bringt jedoch
    // eine eigene, von `resolve.extensions` UNABHÄNGIGE Default-Extensions-Liste
    // (`.js/.jsx/.ts/.tsx`) mit, die `.mjs` nicht enthält — ohne die folgende
    // Ergänzung bricht der Storybook-Build mit "Module not found" ab, sobald eine
    // Story (hier: ThumbnailStrip/ArtworkHero) transitiv `ResponsiveImage` einbindet.
    // Findet eine künftige Storybook-/Plugin-Version das Plugin nicht mehr unter
    // diesem Konstruktornamen, soll das NICHT lautlos übergangen werden, sondern
    // als klare Build-Warnung auf exakt diese Stelle verweisen.
    const tsconfigPathsPlugin = (webpackConfig.resolve?.plugins ?? []).find(
      (plugin): plugin is { extensions: string[] } =>
        Boolean(plugin) && plugin.constructor?.name === 'TsconfigPathsPlugin',
    )
    if (!tsconfigPathsPlugin || !Array.isArray(tsconfigPathsPlugin.extensions)) {
      console.warn(
        '[storybook] TsconfigPathsPlugin nicht gefunden oder ohne extensions-Array — ' +
          'der .mjs/.mts-Alias-Patch in .storybook/main.ts wurde NICHT angewendet. ' +
          'Stories, die transitiv ResponsiveImage.tsx einbinden, könnten mit ' +
          '"Module not found" brechen.',
      )
    } else if (!tsconfigPathsPlugin.extensions.includes('.mjs')) {
      tsconfigPathsPlugin.extensions.push('.mjs', '.mts')
    }
    return webpackConfig
  },
}

export default config
