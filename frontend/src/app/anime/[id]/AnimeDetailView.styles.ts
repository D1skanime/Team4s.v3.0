import { mergeCssModules } from '@/lib/mergeCssModules'

import shellStyles from './page.module.css'
import posterStyles from './page.poster.module.css'
import infoCardStyles from './page.infoCard.module.css'
import episodesStyles from './page.episodes.module.css'

/**
 * Gemergtes `styles`-Objekt für die gesamte Anime-Detailseite. `page.module.css` wuchs über das
 * 450-Zeilen-Limit und wurde fachlich in vier Teil-Stylesheets aufgeteilt (Seiten-Gerüst/Hero-
 * Rahmen, Poster-Spalte, Info-Karte, Episoden-Bereich) -- da `AnimeDetailView.tsx` Klassen aus
 * allen vier Bereichen gleichzeitig nutzt, bündelt dieses Modul sie zu EINEM Lookup, damit die
 * Komponente weiterhin nur einen einzigen `styles`-Import braucht (gleiches Muster wie
 * `EpisodeVersionEditor.styles.ts`).
 */
const styles = mergeCssModules(
  shellStyles,
  mergeCssModules(posterStyles, mergeCssModules(infoCardStyles, episodesStyles)),
)

export default styles
