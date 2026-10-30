import { mergeCssModules } from '@/lib/mergeCssModules'

import shellStyles from './EpisodeVersionEditor.module.css'
import actionsStyles from './EpisodeVersionEditor.actions.module.css'
import fieldsStyles from './EpisodeVersionEditor.fields.module.css'
import tabsStyles from './EpisodeVersionEditor.tabs.module.css'

/**
 * Gemergtes `styles`-Objekt für den gesamten Episoden-Versions-Editor. EpisodeVersionEditor.module.css
 * wuchs über das 450-Zeilen-Limit und wurde fachlich in vier Teil-Stylesheets aufgeteilt (Seiten-
 * Gerüst/Kopfzeile, Formular-Karten/-Felder, Aktionsleiste/Navigation/Buttons, Tab-Navigation/
 * Medien-Bereiche) -- da mehrere Tab-/Sektions-Komponenten Klassen aus mehreren dieser Bereiche
 * gleichzeitig nutzen, bündelt dieses Modul alle vier zu EINEM Lookup, damit jede Komponente
 * weiterhin nur einen einzigen `styles`-Import braucht (UAT-Runde 5, 2026-10-30).
 */
const styles = mergeCssModules(shellStyles, mergeCssModules(fieldsStyles, mergeCssModules(actionsStyles, tabsStyles)))

export default styles
