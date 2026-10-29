import type { Preview } from '@storybook/nextjs'
import { withThemeByClassName } from '@storybook/addon-themes'
import { MINIMAL_VIEWPORTS } from 'storybook/viewport'

// Dieselbe Design-Token-Quelle wie die eigentliche App — keine zweite,
// Storybook-eigene Token-Definition. preview.css kommt zuerst, damit die
// Bühnenhintergrund-Klasse unten die App-Tokens nicht überschreibt.
import './preview.css'
import '../src/styles/globals.css'

const TEAM4S_VIEWPORTS = {
  ...MINIMAL_VIEWPORTS,
  mobile390: {
    name: 'Mobile 390x844',
    styles: { width: '390px', height: '844px' },
    type: 'mobile' as const,
  },
  tablet768: {
    name: 'Tablet 768x1024',
    styles: { width: '768px', height: '1024px' },
    type: 'tablet' as const,
  },
  desktop1440: {
    name: 'Desktop 1440x900',
    styles: { width: '1440px', height: '900px' },
    type: 'desktop' as const,
  },
}

const preview: Preview = {
  parameters: {
    viewport: {
      options: TEAM4S_VIEWPORTS,
    },
  },
  initialGlobals: {
    viewport: { value: 'mobile390' },
  },
  decorators: [
    // Team4s hat aktuell KEIN eigenes dunkles Produkt-Farbthema — dieser Decorator
    // schaltet ausschließlich den Storybook-Bühnenhintergrund zwischen hell und
    // dunkel um (siehe preview.css), damit Komponenten auf beiden Hintergründen auf
    // Kontrast/Lesbarkeit geprüft werden können, ohne ein nicht existierendes
    // Produkt-Dark-Theme zu simulieren.
    withThemeByClassName({
      themes: {
        Hell: '',
        Dunkel: 'sb-stage-dark',
      },
      defaultTheme: 'Hell',
    }),
  ],
}

export default preview
