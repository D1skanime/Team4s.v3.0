import type { StorybookConfig } from '@storybook/nextjs'

/**
 * Storybook-Grundkonfiguration fuer den Komponenten-Katalog des Team4s-Frontends.
 *
 * Ersetzt die fruehere In-App-Showcase-Route vollstaendig: Jede globale Primitive aus
 * `@/components/ui` (Kategorie `UI/*`) und jede migrierte domaenenspezifische
 * Komposition (Kategorie `Showcases/*`) bekommt eine eigene `*.stories.tsx`-Datei unter
 * den jeweiligen Komponenten-Verzeichnissen. Der `@storybook/nextjs`-Adapter nutzt den
 * Webpack-Builder (nicht Vite), damit die Build-Pipeline zu den bestehenden
 * Next.js-Konventionen des Projekts passt.
 */
const config: StorybookConfig = {
  stories: [
    '../src/components/ui/**/*.stories.@(ts|tsx)',
    '../src/components/showcases/**/*.stories.@(ts|tsx)',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  addons: ['@storybook/addon-themes', '@storybook/addon-a11y', '@storybook/addon-docs'],
  // Die 113 Erfolgsbadge-Grafiken unter public/member-achievement-badges muessen
  // auch im Storybook-eigenen Dev-/Build-Server unter / erreichbar sein, genauso
  // wie im Next.js-Dev-Server.
  staticDirs: ['../public'],
  webpackFinal: async (webpackConfig) => {
    // `ResponsiveImage.tsx` importiert `@/lib/images/publicImagePatterns` ohne
    // Dateiendung; dieses Hilfsmodul existiert ausschliesslich als `.mjs`-Datei (von
    // `next.config.mjs` mitgenutzt, siehe dessen eigenen Kommentar). Next.js' eigene
    // Webpack-Pipeline loest den `@/*`-Alias dafuer problemlos auf. Der von
    // `@storybook/nextjs` automatisch eingehaengte `TsconfigPathsPlugin` (einzig
    // zustaendig fuer die `@/*`-Aufloesung, siehe tsconfig.json `paths`) bringt jedoch
    // eine eigene, von `resolve.extensions` UNABHAENGIGE Default-Extensions-Liste
    // (`.js/.jsx/.ts/.tsx`) mit, die `.mjs` nicht enthaelt -- ohne die folgende
    // Ergaenzung bricht der Storybook-Build mit "Module not found" ab, sobald eine
    // Story (hier: ThumbnailStrip/ArtworkHero) transitiv `ResponsiveImage` einbindet.
    const tsconfigPathsPlugin = (webpackConfig.resolve?.plugins ?? []).find(
      (plugin): plugin is { extensions: string[] } =>
        Boolean(plugin) && plugin.constructor?.name === 'TsconfigPathsPlugin',
    )
    if (tsconfigPathsPlugin && !tsconfigPathsPlugin.extensions.includes('.mjs')) {
      tsconfigPathsPlugin.extensions.push('.mjs', '.mts')
    }
    return webpackConfig
  },
}

export default config
