// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReleaseDetailHero } from './ReleaseDetailHero'

afterEach(cleanup)
const base = { animeID:9, groupID:2, episode_number:'7', episode_title:'Schnee', title:'Winter-Release', version:'2', groups:[{id:2,slug:'c',name:'C-Subs',logo_url:null},{id:3,slug:'d',name:'Honto',logo_url:null}], release_date:'2026-01-02', duration_seconds:1440, resolution:'1080p', container:'MKV', video_codec:'AV1', audio_codec:'AAC', audio_language:'Japanisch', subtitle_tracks:[{language:'Deutsch',label:'Vollständig',format:'ASS',forced:false,default:true},{language:'Deutsch',label:'Signs & Songs',format:'ASS',forced:true,default:false}], preview_image:null, next:{release_version_id:88,episode_number:'8',episode_title:null,version:'2',group_id:2}, images_count:0, notes_count:2, contributors_count:3, animeLogoFallbackUrl:null }

describe('ReleaseDetailHero', () => {
  it('renders an independent text-only identity without preview or logo', () => {
    render(<ReleaseDetailHero {...base} />)
    expect(screen.getByText('Winter-Release').closest('[data-release-hero="independent"]')).toBeTruthy()
    expect(document.querySelector('img')).toBeNull()
  })

  it('uses the Anime logo only as the presentation fallback', () => {
    render(<ReleaseDetailHero {...base} animeLogoFallbackUrl="/anime-logo.png" />)
    expect(screen.getByAltText('Anime-Logo zu Winter-Release').getAttribute('src')).toBe('/anime-logo.png')
  })

  it('always prefers the selected public release preview over the Anime logo', () => {
    render(<ReleaseDetailHero {...base} animeLogoFallbackUrl="/anime-logo.png" preview_image={{id:1,category:'screenshot',thumbnail_url:'/preview.jpg',original_url:null,caption:'Preview',author_name:'Mia',is_preview_candidate:true}} />)
    expect(screen.getByAltText('Preview').getAttribute('src')).toBe('/preview.jpg')
    expect(screen.queryByAltText('Anime-Logo zu Winter-Release')).toBeNull()
  })

  it('shows primary release facts before opening technical details and never renders contributors', () => {
    render(<ReleaseDetailHero {...base} subtitle_type="softsub" />)
    const details = screen.getByRole('button', { name: /Details/ })
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('Version')).toBeTruthy()
    expect(screen.getByText('Veröffentlicht')).toBeTruthy()
    expect(screen.getByText('Dauer')).toBeTruthy()
    expect(screen.getByText('Auflösung')).toBeTruthy()
    expect(screen.getByText('2. Januar 2026')).toBeTruthy()
    expect(screen.getByText('24:00 Min.')).toBeTruthy()
    expect(screen.queryByText('Video-Codec')).toBeNull()
    expect(screen.queryByText('0 Bilder')).toBeNull()
    expect(screen.queryByText('2 Texte')).toBeNull()
    expect(screen.queryByText('3 Fansubber')).toBeNull()
    expect(document.querySelector('#beteiligte')).toBeNull()
    fireEvent.click(details)
    expect(screen.getByText('Container')).toBeTruthy()
    expect(screen.getByText('MKV')).toBeTruthy()
    expect(screen.getByText('Video-Codec')).toBeTruthy()
    expect(screen.getByText('AV1')).toBeTruthy()
    expect(screen.getByText('Audio-Codec')).toBeTruthy()
    expect(screen.getByText('AAC')).toBeTruthy()
    expect(screen.getByText('Audio-Sprache')).toBeTruthy()
    expect(screen.getByText('Japanisch')).toBeTruthy()
    expect(screen.getByText(/Softsub/)).toBeTruthy()
    expect(screen.getByText(/Spur 1: Vollständig · Deutsch · ASS/)).toBeTruthy()
    expect(screen.getByText(/Spur 2: Signs & Songs · Deutsch · ASS/)).toBeTruthy()
    expect(document.querySelector('#beteiligte')).toBeNull()
  })

  it('labels a collaboration semantically and keeps unknown technical values honest', () => {
    render(<ReleaseDetailHero {...base} container={null} video_codec={null} audio_codec="" audio_language={null} subtitle_tracks={[]} subtitle_type={null} />)

    expect(screen.getByText('Fansub-Coop: C-Subs × Honto')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getAllByText('Nicht hinterlegt')).toHaveLength(6)
  })

  it('labels a single owner as Fansubgruppe and reuses canonical next-release navigation below details', () => {
    render(<ReleaseDetailHero {...base} groups={[base.groups[0]]} canonicalProjectPath="/fansubs/c-subs/fansubprojekt/winter" />)

    expect(screen.getByText('Fansubgruppe: C-Subs')).toBeTruthy()
    const details = screen.getByRole('button', { name: /Details/ })
    const nextRelease = screen.getByRole('link', { name: /Nächster Release/ })
    expect(details.compareDocumentPosition(nextRelease) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(nextRelease.getAttribute('href')).toBe('/fansubs/c-subs/fansubprojekt/winter/releases/88')
  })
})
