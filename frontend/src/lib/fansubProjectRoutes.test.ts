import { describe, expect, it } from "vitest"

import {
  buildPublicFansubProjectMemberPath,
  buildPublicFansubProjectPath,
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
