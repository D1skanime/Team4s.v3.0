import { createServer } from 'node:http'
export const FIXTURE_ORIGIN = 'http://127.0.0.1:3159'
export const NEXT_ORIGIN = 'http://127.0.0.1:3158'
export const groups = [
  { id: 7, slug: 'stored-primary', name: 'Erste Gruppe', status: 'active', country: 'DE' },
  { id: 9, slug: 'stored-secondary', name: 'Zweite Gruppe', status: 'active', country: 'DE' },
]
export const title = 'Ein anderer Anzeigename'
export const prettyPath = '/fansubs/stored-primary/fansubprojekt/stored-anime'
const meta = { page: 1, per_page: 10, total: 0, total_pages: 0 }
const anime = id => ({ id, slug: 'stored-anime', title, type: 'tv', status: 'ongoing', content_type: 'anime', year: 2024, genres: ['Science Fiction'], description: 'Isolierte Prüfdaten für die öffentliche Anime-Seite.', cover_image: null, max_episodes: id === 2 ? 0 : 1, episodes: [] })
const projects = [{ id: 1, anime_slug: 'stored-anime', title, status: 'ongoing', type: 'tv', year: 2024 }]
export function fixtureResponse(path) {
  const id = Number(path.match(/^\/api\/v1\/anime\/(\d+)/)?.[1] || 1)
  if (/^\/api\/v1\/anime\/\d+$/.test(path)) {
    if (id === 500) return { status: 500, body: { error: { message: 'Fixture technical error' } } }
    if (id === 501) return { network: true }
    if (![1, 2, 3].includes(id)) return { status: 404, body: { error: { message: 'anime nicht gefunden' } } }
    return { body: { data: anime(id) } }
  }
  if (path.endsWith('/fansubs')) return { body: { data: groups.map((group, index) => ({ anime_id: id, fansub_group_id: group.id, is_primary: index === 0, created_at: '', fansub_group: group })) } }
  if (path.endsWith('/episodes')) return { body: { data: { anime_id: id, episodes: id === 2 ? [] : [{ episode_number: 1, episode_title: 'Ein gespeicherter Episodentitel', version_count: 1, versions: [{ id: 71, anime_id: id, episode_number: 1, title: 'Veröffentlichte Fassung', fansub_groups: [groups[0]], video_quality: '1080p', subtitle_type: 'softsub', release_date: '2024-01-01', media_provider: 'fixture', media_item_id: 'fixture-71', created_at: '', updated_at: '' }] }] } } }
  if (path.endsWith('/comments')) return { body: { data: [], meta } }
  if (path.endsWith('/relations')) return { body: { data: id === 2 ? [] : Array.from({ length: 8 }, (_, n) => ({ anime_id: 100 + n, title: 'Verwandte Serie ' + n, relation_type: 'sequel', cover_image: null, year: 2024, type: 'tv' })) } }
  if (path.endsWith('/contributions')) return { body: { anime_id: id, groups: [] } }
  if (path.endsWith('/backdrops')) return { body: { data: { anime_id: id, backdrops: [], theme_videos: [], logo_url: null, banner_url: null } } }
  if (path.endsWith('/resolve')) return { body: { data: { anime_id: 1, anime_slug: 'stored-anime', group_id: path.includes('secondary') ? 9 : 7, projects } } }
  if (path.endsWith('/public-profile')) return { body: { data: { id: 7, name: groups[0].name, slug: groups[0].slug, projects, members: [], links: [] } } }
  if (/\/group\/\d+$/.test(path)) return { body: { data: { id: 17, anime_id: 1, fansub_id: 7, fansub: groups[path.endsWith('/9') ? 1 : 0], story: 'Diese Projektgeschichte stammt aus isolierten Fixtures.', stats: { member_count: 0, project_contributor_count: 0, episode_count: 1 }, created_at: '', updated_at: '' } } }
  if (path.endsWith('/assets')) return { body: { data: { hero: {}, episodes: [] } } }
  if (path.endsWith('/contributors')) return { body: { team_members: [], external_contributors: [] } }
  if (path.endsWith('/release-count')) return { body: { data: { count: 0 } } }
  if (path.endsWith('/release-list')) return { body: { items: [], next_cursor: null, has_more: false } }
  if (path.endsWith('/project-note')) return { body: { data: null } }
  if (path.includes('/roles') || path === '/api/v1/role-definitions') return { body: { data: [] } }
  return { status: 404, body: { error: { message: 'Unknown fixture route' } } }
}
export async function startFixtureServer() {
  if (process.env.PHASE158_FIXTURES !== '1' || process.env.API_INTERNAL_URL !== FIXTURE_ORIGIN) throw new Error('Fixture opt-in and exact isolated origin required')
  const requests = []
  const server = createServer((req, res) => {
    const url = new URL(req.url, FIXTURE_ORIGIN)
    requests.push({ method: req.method, path: url.pathname, query: url.search })
    if (req.headers.host !== '127.0.0.1:3159' || req.method !== 'GET') {
      res.writeHead(405); res.end('Fixture permits GET only'); return
    }
    const result = fixtureResponse(url.pathname)
    if (result.network) { req.socket.destroy(); return }
    res.writeHead(result.status || 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(result.body))
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3159, '127.0.0.1', resolve) })
  return { requests, close: () => new Promise(resolve => server.close(resolve)) }
}
