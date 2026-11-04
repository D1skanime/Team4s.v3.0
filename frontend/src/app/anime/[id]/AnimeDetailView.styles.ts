import { mergeCssModules } from '@/lib/mergeCssModules'

import shellStyles from './page.module.css'
import episodesStyles from './page.episodes.module.css'

/**
 * Gemergtes `styles`-Objekt für die reine Seiten-Orchestrierung der Anime-Detailseite.
 * `page.module.css` wuchs über das 450-Zeilen-Limit und wurde fachlich in zwei Teil-Stylesheets
 * aufgeteilt (Seiten-Gerüst, Episoden-Bereich) -- da `AnimeDetailView.tsx` Klassen aus beiden
 * Bereichen gleichzeitig nutzt, bündelt dieses Modul sie zu EINEM Lookup, damit die Komponente
 * weiterhin nur einen einzigen `styles`-Import braucht (gleiches Muster wie
 * `EpisodeVersionEditor.styles.ts`). Poster-Spalte und Info-Karte besitzen seit Befund 21/22 ihr
 * eigenes, dediziertes `AnimeDetailHero.module.css` -- `AnimeDetailView` ordnet nur noch
 * Bausteine untereinander an, kein inneres Baustein-CSS mehr über diesen Merge.
 */
const styles = mergeCssModules(shellStyles, episodesStyles)

export default styles
