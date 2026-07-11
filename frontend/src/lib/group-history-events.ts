export type GroupHistoryEventCategory = 'history' | 'project_count' | 'release_count'

export interface GroupHistoryEventPresentation {
  value: string
  label: string
  category: GroupHistoryEventCategory
  imageSrc: string
  tone: 'gold' | 'accent' | 'green' | 'pink' | 'muted' | 'blue' | 'violet' | 'red' | 'legendary'
}

const BADGE_BASE_PATH = '/history-event-badges-transparent'

export const GROUP_HISTORY_EVENT_OPTIONS: GroupHistoryEventPresentation[] = [
  { value: 'founding', label: 'Gründung', category: 'history', imageSrc: `${BADGE_BASE_PATH}/founding.png`, tone: 'pink' },
  { value: 'disbanding', label: 'Auflösung', category: 'history', imageSrc: `${BADGE_BASE_PATH}/disbanding.png`, tone: 'muted' },
  { value: 'hiatus', label: 'Pause', category: 'history', imageSrc: `${BADGE_BASE_PATH}/hiatus.png`, tone: 'violet' },
  { value: 'rebranding', label: 'Umbenennung', category: 'history', imageSrc: `${BADGE_BASE_PATH}/rebranding.png`, tone: 'accent' },
  { value: 'milestone', label: 'Meilenstein', category: 'history', imageSrc: `${BADGE_BASE_PATH}/milestone.png`, tone: 'gold' },
  { value: 'other', label: 'Sonstiges', category: 'history', imageSrc: `${BADGE_BASE_PATH}/other.png`, tone: 'accent' },
  { value: 'first_project', label: 'Erstes Projekt', category: 'history', imageSrc: `${BADGE_BASE_PATH}/first_project.png`, tone: 'gold' },
  { value: 'first_release', label: 'Erstes Release', category: 'history', imageSrc: `${BADGE_BASE_PATH}/first_release.png`, tone: 'blue' },
  { value: 'anniversary', label: 'Jubiläum', category: 'history', imageSrc: `${BADGE_BASE_PATH}/anniversary.png`, tone: 'pink' },
  { value: 'collaboration', label: 'Kooperation', category: 'history', imageSrc: `${BADGE_BASE_PATH}/collaboration.png`, tone: 'green' },
  { value: 'revival', label: 'Wiederaufnahme', category: 'history', imageSrc: `${BADGE_BASE_PATH}/revival.png`, tone: 'gold' },
  { value: 'project_completed', label: 'Projekt abgeschlossen', category: 'history', imageSrc: `${BADGE_BASE_PATH}/project_completed.png`, tone: 'green' },
  { value: 'team_change', label: 'Teamwechsel', category: 'history', imageSrc: `${BADGE_BASE_PATH}/team_change.png`, tone: 'accent' },
  { value: 'website_launch', label: 'Website/Forum gestartet', category: 'history', imageSrc: `${BADGE_BASE_PATH}/website_launch.png`, tone: 'blue' },
  { value: 'award', label: 'Auszeichnung', category: 'history', imageSrc: `${BADGE_BASE_PATH}/award.png`, tone: 'red' },
  { value: 'projects_10', label: '10 Projekte', category: 'project_count', imageSrc: `${BADGE_BASE_PATH}/projects_10.png`, tone: 'violet' },
  { value: 'projects_50', label: '50 Projekte', category: 'project_count', imageSrc: `${BADGE_BASE_PATH}/projects_50.png`, tone: 'gold' },
  { value: 'projects_100', label: '100 Projekte', category: 'project_count', imageSrc: `${BADGE_BASE_PATH}/projects_100.png`, tone: 'gold' },
  { value: 'projects_500', label: '500 Projekte', category: 'project_count', imageSrc: `${BADGE_BASE_PATH}/projects_500.png`, tone: 'legendary' },
  { value: 'releases_100', label: '100 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_100.png`, tone: 'blue' },
  { value: 'releases_500', label: '500 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_500.png`, tone: 'green' },
  { value: 'releases_1000', label: '1000 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_1000.png`, tone: 'violet' },
  { value: 'releases_5000', label: '5000 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_5000.png`, tone: 'red' },
  { value: 'releases_10000', label: '10000 Releases', category: 'release_count', imageSrc: `${BADGE_BASE_PATH}/releases_10000.png`, tone: 'legendary' },
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
  return GROUP_HISTORY_EVENT_BY_VALUE[eventType] ?? GROUP_HISTORY_EVENT_BY_VALUE.other
}
