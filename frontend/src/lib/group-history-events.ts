export type GroupHistoryEventCategory = 'history' | 'project_count' | 'release_count'

export interface GroupHistoryEventPresentation {
  value: string
  label: string
  category: GroupHistoryEventCategory
  imageSrc: string
  tone: 'gold' | 'accent' | 'green' | 'pink' | 'muted' | 'blue' | 'violet' | 'red' | 'legendary'
  emphasis: 'none' | 'legendary'
  publicLabel: string
}

const BADGE_BASE_PATH = '/history-event-badges-transparent'

export const GROUP_HISTORY_EVENT_OPTIONS: GroupHistoryEventPresentation[] = [
  { value: 'founding', label: 'Gründung', category: 'history', imageSrc: `${BADGE_BASE_PATH}/founding.png`, tone: 'pink', emphasis: 'none', publicLabel: 'Gründung' },
  { value: 'disbanding', label: 'Auflösung', category: 'history', imageSrc: `${BADGE_BASE_PATH}/disbanding.png`, tone: 'muted', emphasis: 'none', publicLabel: 'Auflösung' },
  { value: 'hiatus', label: 'Pause', category: 'history', imageSrc: `${BADGE_BASE_PATH}/hiatus.png`, tone: 'violet', emphasis: 'none', publicLabel: 'Pause' },
  { value: 'rebranding', label: 'Umbenennung', category: 'history', imageSrc: `${BADGE_BASE_PATH}/rebranding.png`, tone: 'accent', emphasis: 'none', publicLabel: 'Umbenennung' },
  { value: 'milestone', label: 'Meilenstein', category: 'history', imageSrc: `${BADGE_BASE_PATH}/milestone.png`, tone: 'gold', emphasis: 'none', publicLabel: 'Meilenstein' },
  { value: 'first_project', label: 'Erstes Projekt', category: 'history', imageSrc: `${BADGE_BASE_PATH}/first_project.png`, tone: 'gold', emphasis: 'none', publicLabel: 'Erstes Fansub-Projekt' },
  { value: 'first_release', label: 'Erstes Release', category: 'history', imageSrc: `${BADGE_BASE_PATH}/first_release.png`, tone: 'blue', emphasis: 'none', publicLabel: 'Erstes Fansub-Release' },
  { value: 'anniversary', label: 'Jubiläum', category: 'history', imageSrc: `${BADGE_BASE_PATH}/anniversary.png`, tone: 'pink', emphasis: 'none', publicLabel: 'Jubiläum' },
  { value: 'collaboration', label: 'Kooperation', category: 'history', imageSrc: `${BADGE_BASE_PATH}/collaboration.png`, tone: 'green', emphasis: 'none', publicLabel: 'Kooperation' },
  { value: 'revival', label: 'Wiederaufnahme', category: 'history', imageSrc: `${BADGE_BASE_PATH}/revival.png`, tone: 'gold', emphasis: 'none', publicLabel: 'Wiederaufnahme' },
  { value: 'project_completed', label: 'Projekt abgeschlossen', category: 'history', imageSrc: `${BADGE_BASE_PATH}/project_completed.png`, tone: 'green', emphasis: 'none', publicLabel: 'Fansub-Projekt abgeschlossen' },
  { value: 'team_change', label: 'Teamwechsel', category: 'history', imageSrc: `${BADGE_BASE_PATH}/team_change.png`, tone: 'accent', emphasis: 'none', publicLabel: 'Teamwechsel' },
  { value: 'website_launch', label: 'Website/Forum gestartet', category: 'history', imageSrc: `${BADGE_BASE_PATH}/website_launch.png`, tone: 'blue', emphasis: 'none', publicLabel: 'Website/Forum gestartet' },
  { value: 'award', label: 'Auszeichnung', category: 'history', imageSrc: `${BADGE_BASE_PATH}/award.png`, tone: 'red', emphasis: 'none', publicLabel: 'Auszeichnung' },
  { value: 'projects_10', label: '10 Projekte', category: 'project_count', imageSrc: `${BADGE_BASE_PATH}/projects_10.png`, tone: 'violet', emphasis: 'none', publicLabel: '10 Fansub-Projekte' },
  { value: 'projects_50', label: '50 Projekte', category: 'project_count', imageSrc: `${BADGE_BASE_PATH}/projects_50.png`, tone: 'gold', emphasis: 'none', publicLabel: '50 Fansub-Projekte' },
  { value: 'projects_100', label: '100 Projekte', category: 'project_count', imageSrc: `${BADGE_BASE_PATH}/projects_100.png`, tone: 'gold', emphasis: 'none', publicLabel: '100 Fansub-Projekte' },
  { value: 'projects_500', label: '500 Projekte', category: 'project_count', imageSrc: `${BADGE_BASE_PATH}/projects_500.png`, tone: 'legendary', emphasis: 'legendary', publicLabel: '500 Fansub-Projekte' },
  { value: 'releases_100', label: '100 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_100.png`, tone: 'blue', emphasis: 'none', publicLabel: '100 Fansub-Releases' },
  { value: 'releases_500', label: '500 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_500.png`, tone: 'green', emphasis: 'none', publicLabel: '500 Fansub-Releases' },
  { value: 'releases_1000', label: '1000 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_1000.png`, tone: 'violet', emphasis: 'none', publicLabel: '1000 Fansub-Releases' },
  { value: 'releases_5000', label: '5000 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_5000.png`, tone: 'red', emphasis: 'none', publicLabel: '5000 Fansub-Releases' },
  { value: 'releases_10000', label: '10000 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_10000.png`, tone: 'legendary', emphasis: 'legendary', publicLabel: '10000 Fansub-Releases' },
]

export const GROUP_HISTORY_EVENT_VALUES = GROUP_HISTORY_EVENT_OPTIONS.map((option) => option.value)

export const GROUP_HISTORY_EVENT_BY_VALUE = GROUP_HISTORY_EVENT_OPTIONS.reduce<Record<string, GroupHistoryEventPresentation>>(
  (acc, option) => {
    acc[option.value] = option
    return acc
  },
  {},
)

export function getGroupHistoryEventPresentation(eventType: string): GroupHistoryEventPresentation {
  return GROUP_HISTORY_EVENT_BY_VALUE[eventType] ?? GROUP_HISTORY_EVENT_BY_VALUE.milestone
}
