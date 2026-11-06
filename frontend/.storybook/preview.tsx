import type { Preview } from '@storybook/nextjs'
import { withThemeByClassName } from '@storybook/addon-themes'
// `msw-storybook-addon` v3 nutzt für klassisches CSF 3.0 (Meta/StoryObj-Exporte, wie in diesem
// Projekt) den `mswLoader`-Unterpfad statt eines Root-Imports -- der Root-Export `addonMsw()`
// ist nur für die neue CSF-Next-Syntax (`definePreview`) gedacht, die dieses Projekt nicht nutzt
// (siehe node_modules/msw-storybook-addon/README.md "CSF 3.0" vs. "CSF Next").
import { mswLoader } from 'msw-storybook-addon/csf3'
import { MINIMAL_VIEWPORTS } from 'storybook/viewport'

// Dieselbe Design-Token-Quelle wie die eigentliche App — keine zweite,
// Storybook-eigene Token-Definition. preview.css kommt zuerst, damit die
// Bühnenhintergrund-Klasse unten die App-Tokens nicht überschreibt.
import './preview.css'
import '../src/styles/globals.css'
import { installAuthCookieSandbox } from './mocks/cookieSandbox'
import { defaultHandlers } from './mocks/handlers'
import { setupMswWithUnhandledRequestError } from './mocks/mswUnhandledRequestSetup'
import { TEAM4S_ROLE_GLOBAL_TYPE, withRoleSimulation } from './mocks/roleSimulation'

// Muss vor dem ersten Story-Render installiert sein: isoliert die drei Auth-Cookies, die
// `withRoleSimulation` unten bei JEDEM Render schreibt/löscht, vollständig vom echten
// Browser-Cookie-Speicher -- sonst würde das bloße Öffnen von Storybook eine im selben
// Browserprofil laufende, echte Team4s-Sitzung auf demselben Host zerstören (Cookies sind nach
// RFC 6265 nicht portgebunden). Siehe cookieSandbox.ts für die vollständige Begründung.
installAuthCookieSandbox()

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
    // Aktiviert next/navigation-Mocking im App-Router-Modus (useRouter/usePathname/
    // useSearchParams) -- global, da mehrere Pilot-Komponenten diese Hooks nutzen
    // (AppShell.tsx, AppShellClientWrapper.tsx, AnimeEdgeNavigation.tsx). Ohne dies stürzt jede
    // Story ab, die eine solche Komponente rendert (z. B. "AppShell mit Slide-over-Drawer").
    nextjs: {
      appDirectory: true,
    },
    // Default-MSW-Handler für alle Stories; einzelne Stories überschreiben sie bei Bedarf über
    // ihr eigenes `parameters.msw.handlers` (z. B. Watchlist-Zustandsvarianten).
    msw: {
      handlers: defaultHandlers,
    },
  },
  initialGlobals: {
    viewport: { value: 'mobile390' },
  },
  globalTypes: {
    team4sRole: TEAM4S_ROLE_GLOBAL_TYPE,
  },
  // `mswLoader()` startet beim ersten Aufruf automatisch den Service-Worker. Eigener Setup
  // (`setupMswWithUnhandledRequestError`, mocks/mswUnhandledRequestSetup.ts) statt des
  // Default-Setups der Addon-Version 3.0.3: dieses protokolliert nicht gemockte Requests nur als
  // Warnung statt die Render-Prüfung (test-storybook) fehlschlagen zu lassen -- eine Seite könnte
  // dadurch unbemerkt wieder von einem erreichbaren Backend abhängen. Storybook-/Asset-Rauschen
  // bleibt weiterhin ausgenommen, nur echte ungemockte Client-Aufrufe werfen jetzt einen Fehler.
  loaders: [mswLoader(setupMswWithUnhandledRequestError)],
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
    // Muss NACH dem Theme-Decorator stehen (Reihenfolge laut CONTEXT.md) -- seedet vor jedem
    // Render den echten Session-Store + die passende MSW-Profil-Fixture für die in der Toolbar
    // gewählte Rolle (anonym/Mitglied/Fansub-Leitung/Plattform-Admin).
    withRoleSimulation,
  ],
}

export default preview
