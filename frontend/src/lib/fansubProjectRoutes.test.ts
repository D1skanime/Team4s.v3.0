import { describe, expect, it } from "vitest"

import {
  buildFansubProjectPath,
  buildPublicFansubProjectMemberPath,
  buildPublicFansubProjectPath,
  buildTechnicalFansubProjectPath,
} from "@/lib/fansubProjectRoutes"

describe("buildPublicFansubProjectMemberPath", () => {
  it("baut die Projekt-Member-Route unter dem oeffentlichen Projektpfad", () => {
    expect(buildPublicFansubProjectMemberPath("c-subs", "vipers-creed", "csubs-leader")).toBe(
      "/fansubs/c-subs/fansubprojekt/vipers-creed/mitwirkende/csubs-leader",
    )
  })

  it("haengt an den bestehenden Projektpfad an", () => {
    const base = buildPublicFansubProjectPath("c-subs", "vipers-creed")
    expect(buildPublicFansubProjectMemberPath("c-subs", "vipers-creed", "leader")).toBe(
      `${base}/mitwirkende/leader`,
    )
  })

  it("encodiert Sonderzeichen im Member-Slug und trimmt", () => {
    expect(buildPublicFansubProjectMemberPath("c-subs", "vipers-creed", "  a b ")).toBe(
      "/fansubs/c-subs/fansubprojekt/vipers-creed/mitwirkende/a%20b",
    )
  })
})

describe("buildTechnicalFansubProjectPath", () => {
  it("baut den technischen Projektpfad aus Anime- und Gruppen-ID", () => {
    expect(buildTechnicalFansubProjectPath(3, 26)).toBe("/anime/3/group/26")
  })
})

// Live-UAT-Nachbesserung Phase 189: "Mehr entdecken" und die Coop-Partner-Links
// verlinkten auf die technische Route (/anime/<id>/group/<id>), obwohl die
// kanonische oeffentliche Projekt-URL verfuegbar war. Deckt beide Faelle ab:
// kanonisch wenn beide Slugs vorhanden, technischer Rueckfall sonst.
describe("buildFansubProjectPath", () => {
  it("baut die kanonische oeffentliche Projekt-URL, wenn Gruppen- und Anime-Slug vorhanden sind", () => {
    expect(
      buildFansubProjectPath({ groupSlug: "bloody-shadow", animeSlug: "11eyes", animeID: 2, groupID: 24 }),
    ).toBe("/fansubs/bloody-shadow/fansubprojekt/11eyes")
  })

  it("faellt auf den technischen Pfad zurueck, wenn der Anime-Slug fehlt", () => {
    expect(
      buildFansubProjectPath({ groupSlug: "bloody-shadow", animeSlug: null, animeID: 2, groupID: 24 }),
    ).toBe("/anime/2/group/24")
  })

  it("faellt auf den technischen Pfad zurueck, wenn der Gruppen-Slug fehlt", () => {
    expect(
      buildFansubProjectPath({ groupSlug: undefined, animeSlug: "11eyes", animeID: 2, groupID: 24 }),
    ).toBe("/anime/2/group/24")
  })

  it("trimmt beide Slugs vor dem Vergleich", () => {
    expect(
      buildFansubProjectPath({ groupSlug: "  bloody-shadow  ", animeSlug: "  11eyes  ", animeID: 2, groupID: 24 }),
    ).toBe("/fansubs/bloody-shadow/fansubprojekt/11eyes")
  })
})
