import { describe, it } from 'vitest'

describe('FansubTeamSection', () => {
  it.todo('enthält KEINE Einträge aus contributors[] — Team-Block bleibt frei von Contributions')
  it.todo('historische Einträge mit claimed=false tragen Badge mit Text "unbestätigt"')
  it.todo('historische Einträge mit claimed=true und member_slug gesetzt rendern Link auf /members/[slug]')
  it.todo('historische Einträge mit member_slug=null rendern nur Text, keinen Link')
  it.todo('Mitglieder mit profile_status="memorial" erscheinen im Gedenken-Block, nicht in Aktiv oder Ehemalig')
})
