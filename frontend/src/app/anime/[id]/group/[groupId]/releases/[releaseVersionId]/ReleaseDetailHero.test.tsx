// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReleaseDetailHero } from './ReleaseDetailHero'

afterEach(cleanup)
const base = { episode_number:'7', episode_title:'Schnee', title:'Winter-Release', version:'2', groups:[{id:2,slug:'c',name:'C-Subs',logo_url:null},{id:3,slug:'d',name:'D-Subs',logo_url:null}], release_date:'2026-01-02', duration_seconds:1440, resolution:'1080p', container:'MKV', video_codec:'AV1', audio_codec:'AAC', audio_language:'Japanisch', subtitle_tracks:[{language:'Deutsch',label:'Vollständig',format:'ASS',forced:false,default:true},{language:'Deutsch',label:'Signs & Songs',format:'ASS',forced:true,default:false}], preview_image:null, images_count:0, notes_count:2, contributors_count:3, animeLogoFallbackUrl:null }

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

  it('starts collapsed and opens technical facts plus grouped contributors', () => {
    render(<ReleaseDetailHero {...base} subtitle_type="softsub" contributors={[{ fansub_group_id: 2, member_id: 9, name: 'Mia', role_label: 'Timing', avatar_url: null }]} />)
    const details = screen.getByRole('button', { name: /Details/ })
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Video-Codec')).toBeNull()
    fireEvent.click(details)
    expect(screen.getByText('Video-Codec')).toBeTruthy()
    expect(screen.getByText('Mia')).toBeTruthy()
  })
})
