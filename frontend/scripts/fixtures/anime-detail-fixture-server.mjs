import { createServer, request as httpRequest } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import sharp from 'sharp'
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
export function fixtureResponse(path, query = new URLSearchParams()) {
  if (process.env.PHASE159_FIXTURES === '1') { const result = phase159Response(path, query); if (result) return result }
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
  if ((process.env.PHASE158_FIXTURES !== '1' && process.env.PHASE159_FIXTURES !== '1') || process.env.API_INTERNAL_URL !== FIXTURE_ORIGIN) throw new Error('Fixture opt-in and exact isolated origin required')
  if (process.env.PHASE159_FIXTURES === '1') await prepareMediaFixtures()
  const requests = []
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, FIXTURE_ORIGIN)
    requests.push({ method: req.method, path: url.pathname, query: url.search })
    if (req.headers.host !== '127.0.0.1:3159' || req.method !== 'GET') {
      res.writeHead(405); res.end('Fixture permits GET only'); return
    }
    const media = await mediaResponse(url)
    const result = media || fixtureResponse(url.pathname, url.searchParams)
    if (result.network) { req.socket.destroy(); return }
    res.writeHead(result.status || 200, { 'Content-Type': result.mime || 'application/json', 'Cache-Control': result.cache || 'no-store' })
    res.end(result.bytes || JSON.stringify(result.body))
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3159, '127.0.0.1', resolve) })
  return { requests, close: () => new Promise(resolve => server.close(resolve)) }
}

export const phase159State = { manifestVersion: 1, manifestFailure: false, removedGroup: false }
const mediaBytes = new Map()
export const mediaCases = [
  { id: 100, name: 'provider', source: '/api/v1/media/image?path=static.png' },
  { id: 101, name: 'cover', source: '/covers/phase159-static.png' },
  { id: 102, name: 'local', source: '/media/anime/phase159/static.png' },
  { id: 103, name: 'private-api-file', source: '/api/v1/media/files/static.png' },
  { id: 104, name: 'gif', source: '/api/v1/media/files/animated.gif' },
  { id: 105, name: 'apng', source: '/media/anime/phase159/animated.png' },
  { id: 106, name: 'webp', source: '/covers/phase159-animated.webp' },
  { id: 107, name: 'avif', source: '/api/v1/media/files/static.avif' },
  { id: 108, name: 'missing-cover', source: null },
  { id: 109, name: 'provider-404', source: '/api/v1/media/image?path=missing.png' },
  { id: 110, name: 'provider-500', source: '/api/v1/media/image?path=error.png' },
  { id: 111, name: 'local-404', source: '/media/anime/phase159/absent.png' },
]
const cursorFor = (id, offset) => Buffer.from(JSON.stringify([159, id, offset])).toString('base64url')
function publicRows(id) {
  if (id === 2) return []
  if (id === 11) return [{ episode_id: 1101, episode_number: 1, episode_title: 'Neutrale Folge', version_count: 0, versions: [] }]
  const count = id === 10 ? 125 : 2
  const variants = Array.from({ length: count }, (_, i) => ({
    id: 100 + i, variant_id: 100 + i, release_version_id: i === 0 ? 10 : 20 + i,
    anime_id: id, episode_number: 1, title: i === 0 ? 'Primäre Fassung' : i === count - 1 ? 'Zweite Fassung' : 'Variante ' + i,
    fansub_groups: [groups[i === count - 1 ? 1 : 0]], video_quality: '1080p', subtitle_type: 'softsub', release_date: '2024-01-01',
  }))
  const rows = variants.map(version => ({ episode_id: id * 100 + 1, episode_number: 1, episode_title: 'Ein gespeicherter Episodentitel', default_version_id: 100, version_count: count, versions: [version] }))
  if (id === 10) rows.push({ episode_id: 1002, episode_number: 1, episode_title: 'Andere neutrale Episode mit gleicher Nummer', version_count: 0, versions: [] })
  return rows
}
function publicPage(id, query) {
  const limit = Number(query.get('limit') || 24)
  let offset = 0
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return { status: 400, body: { error: { message: 'Ungültiges Limit' } } }
  if (query.get('cursor')) {
    try {
      const cursor = JSON.parse(Buffer.from(query.get('cursor'), 'base64url').toString())
      if (cursor.length !== 3 || cursor[0] !== 159 || cursor[1] !== id || !Number.isSafeInteger(cursor[2]) || cursor[2] < 0) throw new Error()
      offset = cursor[2]
    } catch { return { status: 400, body: { error: { message: 'Ungültiger Cursor' } } } }
  }
  const rows = publicRows(id), page = rows.slice(offset, offset + limit), episodes = new Map()
  for (const row of page) {
    const previous = episodes.get(row.episode_id)
    episodes.set(row.episode_id, previous ? { ...row, versions: [...previous.versions, ...row.versions] } : row)
  }
  const hasMore = offset + limit < rows.length
  return { body: { data: { anime_id: id, episodes: [...episodes.values()], pagination: { has_more: hasMore, next_cursor: hasMore ? cursorFor(id, offset + limit) : null, row_limit: limit } } } }
}
function phase159Response(path, query) {
  if (path === '/api/v1/anime') {
    const page = Number(query.get('page') || 1), perPage = Number(query.get('per_page') || 2)
    const ids = query.get('q') === 'retention' ? Array.from({ length: 25 }, (_, n) => 20 + n) : [20,21,22,23,24,25]
    return { body: { data: ids.slice((page-1)*perPage, page*perPage).map(id => ({ ...anime(id), title: 'Serie ' + id })), meta: { page, per_page: perPage, total: ids.length, total_pages: Math.ceil(ids.length/perPage) } } }
  }
  const id = Number(path.match(/^\/api\/v1\/anime\/(\d+)/)?.[1])
  const valid = [1,2,3,10,11,80].includes(id) || (id >= 20 && id <= 44) || mediaCases.some(item => item.id === id)
  if (/^\/api\/v1\/anime\/\d+$/.test(path) && valid) {
    const source = mediaCases.find(item => item.id === id)
    const neutral = publicRows(id).filter((row, index, rows) => rows.findIndex(other => other.episode_id === row.episode_id) === index)
    return { body: { data: { ...anime(id), title: id >= 20 && id <= 44 ? 'Serie ' + id : title,
      cover_image: source?.source ?? null,
      episodes: neutral.map(row => ({ id: row.episode_id, episode_number: String(row.episode_number), title: row.episode_title, status: 'public', view_count: 0, download_count: 0 })),
    } } }
  }
  if (valid && path.endsWith('/episodes')) return publicPage(id, query)
  if (valid && path.endsWith('/fansubs')) return { body: { data: groups.filter(group => !phase159State.removedGroup || group.id !== 9).map((group,index) => ({ anime_id: id, fansub_group_id: group.id, is_primary: index === 0, created_at: '', fansub_group: group })) } }
  if (valid && path.endsWith('/relations') && id >= 10) return { body: { data: [] } }
  if (valid && path.endsWith('/backdrops')) {
    if (id === 80 && phase159State.manifestFailure) return { status: 500, body: { error: { message: 'Manifest fixture error' } } }
    return { body: { data: { anime_id: id, backdrops: [], theme_videos: [],
      logo_url: id === 80 ? '/covers/phase159-logo-' + phase159State.manifestVersion + '.png' : null,
      banner_url: id === 80 ? '/covers/phase159-static.png' : null } } }
  }
  return null
}
export async function mediaResponse(url) {
  if (process.env.PHASE159_FIXTURES !== '1') return null
  if (url.pathname === '/api/v1/media/image') {
    const name = url.searchParams.get('path')
    if (name === 'error.png') return { status: 500, body: { error: 'isolated media error' } }
    if (!mediaBytes.has(name)) return { status: 404, body: { error: 'missing image' } }
    const width = Number(url.searchParams.get('width') || 1000)
    const bytes = await sharp(mediaBytes.get(name)).resize({ width, withoutEnlargement: true }).jpeg({ quality: Number(url.searchParams.get('quality') || 90) }).toBuffer()
    return { bytes, mime: 'image/jpeg', cache: 'public, max-age=3600' }
  }
  if (url.pathname.startsWith('/api/v1/media/files/')) {
    const name = url.pathname.split('/').at(-1)
    if (name === 'error.png') return { status: 500, body: { error: 'isolated media error' } }
    const bytes = mediaBytes.get(name)
    return bytes ? { bytes, mime: name.endsWith('.gif') ? 'image/gif' : name.endsWith('.webp') ? 'image/webp' : name.endsWith('.avif') ? 'image/avif' : 'image/png', cache: 'private, no-store' } : { status: 404, body: { error: 'missing image' } }
  }
  return null
}
async function prepareMediaFixtures() {
  if (process.cwd() !== '/tmp/team4s-phase159-production') throw new Error('Media fixtures require the owned isolated copy')
  const raw = Buffer.alloc(1000 * 1426 * 3)
  let seed = 158
  for (let i = 0; i < raw.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; raw[i] = seed >>> 24 }
  const png = await sharp(raw, { raw: { width: 1000, height: 1426, channels: 3 } }).png().toBuffer()
  mediaBytes.set('static.png', png)
  mediaBytes.set('static.avif', await sharp(png).avif({ quality: 50 }).toBuffer())
  // Reuse the exact frame/pageHeight construction from imageDisplay.test.ts.
  const frames = Buffer.alloc(1200 * 800 * 2 * 4)
  for (let i = 0; i < frames.length; i += 4) { frames[i + (i < frames.length / 2 ? 0 : 2)] = 255; frames[i + 3] = i % 16 === 0 ? 0 : 255 }
  for (const format of ['gif', 'webp']) {
    const image = sharp(frames, { raw: { width: 1200, height: 1600, channels: 4, pageHeight: 800 } })
    mediaBytes.set('animated.' + format, await (format === 'gif' ? image.gif() : image.webp({ lossless: true })).toBuffer())
  }
  mediaBytes.set('animated.png', animatedPng())
  await mkdir('public/covers', { recursive: true })
  await mkdir('fixture-media/anime/phase159', { recursive: true })
  for (const [name, bytes] of mediaBytes) {
    await writeFile('public/covers/phase159-' + name, bytes)
    await writeFile('fixture-media/anime/phase159/' + name, bytes)
  }
  await writeFile('public/covers/phase159-logo-1.png', png)
  await writeFile('public/covers/phase159-logo-2.png', png)
}
export async function startReadOnlyBrowserProxy() {
  const requests = []
  const server = createServer((req, res) => {
    let url
    try { url = new URL(req.url) } catch { res.writeHead(400); res.end(); return }
    if (req.method !== 'GET' || ![NEXT_ORIGIN, FIXTURE_ORIGIN].includes(url.origin) || url.username || url.password) {
      requests.push({ blocked: true, method: req.method, url: url.href }); res.writeHead(403); res.end(); return
    }
    requests.push({ method: req.method, url: url.href })
    const upstream = httpRequest(url, { method: 'GET', headers: { ...req.headers, host: url.host } }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res)
    })
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end() })
    res.on('close', () => upstream.destroy())
    upstream.end()
  })
  server.on('connect', (_req, socket) => socket.destroy())
  await new Promise((resolve,reject) => { server.once('error', reject); server.listen(3160, '127.0.0.1', resolve) })
  return { requests, close: () => new Promise(resolve => server.close(resolve)) }
}

// APNG generator mirrored from imageDisplay.test.ts.
function chunk(type, data) {
  const name = Buffer.from(type)
  let crc = 0xffffffff
  for (const byte of Buffer.concat([name, data])) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  const output = Buffer.alloc(data.length + 12)
  output.writeUInt32BE(data.length); name.copy(output, 4); data.copy(output, 8)
  output.writeUInt32BE((crc ^ 0xffffffff) >>> 0, output.length - 4)
  return output
}

function animatedPng() {
  const width = 1200, height = 800
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6
  const animation = Buffer.alloc(8); animation.writeUInt32BE(2)
  const control = (sequence) => {
    const frame = Buffer.alloc(26)
    frame.writeUInt32BE(sequence); frame.writeUInt32BE(width, 4); frame.writeUInt32BE(height, 8)
    frame.writeUInt16BE(1, 20); frame.writeUInt16BE(10, 22)
    return chunk('fcTL', frame)
  }
  const pixels = (red) => {
    const raw = Buffer.alloc((width * 4 + 1) * height)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4
      raw[offset + (red ? 0 : 2)] = 255; raw[offset + 3] = 128
    }
    return deflateSync(raw)
  }
  const sequence = Buffer.alloc(4); sequence.writeUInt32BE(2)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('acTL', animation), control(0), chunk('IDAT', pixels(true)), control(1),
    chunk('fdAT', Buffer.concat([sequence, pixels(false)])), chunk('IEND', Buffer.alloc(0)),
  ])
}
