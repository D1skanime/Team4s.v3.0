import { mergeCssModules } from '@/lib/mergeCssModules'

import shellStyles from './JellyfinSyncPanel.module.css'
import modalStyles from './JellyfinSyncPanel.modal.module.css'
import resultsStyles from './JellyfinSyncPanel.results.module.css'
import wizardStyles from './JellyfinSyncPanel.wizard.module.css'

/**
 * Gemergtes `styles`-Objekt für den gesamten Jellyfin-Sync-Assistenten. JellyfinSyncPanel.module.css
 * wuchs über das 450-Zeilen-Limit und wurde fachlich in vier Teil-Stylesheets aufgeteilt (Gerüst/
 * Fortschrittsanzeige, Wizard-Schritt-Panel, Ergebnisanzeige, Bestätigungs-Dialog) -- da die
 * einzelnen Schritt-Komponenten Klassen aus mehreren dieser Bereiche gleichzeitig nutzen, bündelt
 * dieses Modul alle vier zu EINEM Lookup, damit jede Komponente weiterhin nur einen einzigen
 * `styles`-Import braucht (UAT-Runde 5, 2026-10-30).
 */
const styles = mergeCssModules(shellStyles, mergeCssModules(wizardStyles, mergeCssModules(resultsStyles, modalStyles)))

export default styles
