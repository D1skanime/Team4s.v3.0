import type { StorybookConfig } from '@storybook/nextjs'

/**
 * Storybook-Grundkonfiguration fuer den Komponenten-Katalog des Team4s-Frontends.
 *
 * Ersetzt die fruehere In-App-Showcase-Route `/dev/ui-system` vollstaendig: Jede
 * globale Primitive aus `@/components/ui` (Kategorie `UI/*`) und jede migrierte
 * domaenenspezifische Komposition (Kategorie `Showcases/*`) bekommt eine eigene
 * `*.stories.tsx`-Datei unter den jeweiligen Komponenten-Verzeichnissen. Der
 * `@storybook/nextjs`-Adapter nutzt den Webpack-Builder (nicht Vite), damit die
 * Build-Pipeline zu den bestehenden Next.js-Konventionen des Projekts passt.
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
}

export default config
