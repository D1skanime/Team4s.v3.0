# Phase 102: fansubprojekte-ui-schrittweise-verbessern - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 102-fansubprojekte-ui-schrittweise-verbessern
**Areas discussed:** TODO cross-reference, pretty URL, further-project navigation and cooperations, project members, release section, OP/ED/Middle and Medien

---

## TODO Cross-Reference

| Option | Description | Selected |
|--------|-------------|----------|
| Contribution UI primitives | Broad UI primitive consistency TODO. | |
| Credits UI consolidation | Credits/contribution display and permission bridge TODO. | |
| Member profile polish | Member-profile UI and route-parameter TODO. | |
| Kollaboration public handling neu loesen | Public cooperation/group handling; closest fit for Phase 102 navigation semantics. | yes |

**User's choice:** Only TODO 4 should be folded.
**Notes:** TODO 4 was folded only as context for public cooperation/navigation handling. TODOs 1-3 were reviewed but left out of Phase 102.

---

## Pretty URL

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect technical route | `/anime/[id]/group/[groupId]` redirects to the pretty route. | |
| Render both equally | Both URLs render the same page as public peers. | |
| Keep technical route, use pretty route for new public links | Compatibility route stays; new public navigation uses `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]`. | yes |

**User's choice:** Keep the technical route, but use the pretty route for new public links.
**Notes:** The pretty route uses Fansub slug plus Anime slug. Slug history is deferred. The technical route should expose a canonical reference to the pretty route.

---

## Further Projects And Cooperations

| Option | Description | Selected |
|--------|-------------|----------|
| Further projects of same Fansub group | `Weitere Projekte` means other projects by the current Fansub group. | yes |
| Other groups for same Anime | Show other Fansubs for the same Anime under a different concept. | |
| Both separately | Show same-Fansub projects and other Anime group variants as separate surfaces. | |

**User's choice:** `Weitere Projekte` is same-Fansub only.
**Notes:** If there are no further projects for the current Fansub group, hide the navigation. Cooperation context can appear in the hero as `Coop mit Gruppe X, Gruppe C, Gruppe D`; each group name is clickable. On a Coop page, list only the other participating groups.

---

## Project Members

| Option | Description | Selected |
|--------|-------------|----------|
| One shared project-member area | Replace separate technical blocks with one public-facing member section. | yes |
| Keep Team/external split | Preserve the current two-block structure. | |
| Team first, external collapsed | Hybrid structure for long lists. | |

**User's choice:** One shared area, visually matching the public Fansub page member UI.
**Notes:** The section title is `Mitwirkende am Fansub-Projekt`. Show only roles the member has in this project. Members are clickable; the future target is a project-scoped member contribution/media page, but that target is not part of Phase 102.

---

## Release Section

| Option | Description | Selected |
|--------|-------------|----------|
| Redesign release display now | Discuss cards, episode/version structure, and cooperation visibility in Phase 102. | |
| Keep structure conservative | Only clean title/surrounding structure now; deeper release display comes later. | yes |
| Move all release work to later phase | Avoid touching the section now. | |

**User's choice:** Discuss release display later as its own phase.
**Notes:** For Phase 102, keep the existing release presentation as much as possible, but use `Releases zum Fansub`, remove `Weitere Releases` wording, and remove the standalone `Neuestes Release` block as already decided.

---

## OP/ED/Middle And Medien

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as standalone sections | Preserve OP/ED/Middle and Medien in the project page flow. | |
| Polish them now | Improve standalone presentation in Phase 102. | |
| Remove for now and integrate later into releases | Take them out of the project page and design them later inside release presentation. | yes |

**User's choice:** Remove OP/ED/Middle and Medien from the project page for now.
**Notes:** These areas should later be integrated more deliberately into the release experience.

---

## The Agent's Discretion

- Exact component split and implementation mechanics stay with the executor, as long as the public Fansub page member UI pattern is reused and the route/navigation semantics above are preserved.

## Deferred Ideas

- Slug history and old-slug redirect support.
- Project-scoped member contribution/media page.
- Full release-card/version/cooperation display redesign.
- OP/ED/Middle and Medien integration into release presentation.
