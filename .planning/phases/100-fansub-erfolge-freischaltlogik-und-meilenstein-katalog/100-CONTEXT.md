# Phase 100: Fansub Erfolge Freischaltlogik und Meilenstein-Katalog - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning
**Source:** Live design/discussion thread around `/fansubs/c-subs#erfolge`, approved badge assets, and user workflow decision.

<domain>
## Phase Boundary

This phase defines and then implements the unlock/selection rules for the Fansub group "Historie & Erfolge" catalog.

The work must proceed one achievement at a time:

1. Discuss exactly one achievement rule with the user.
2. Implement only that achievement rule.
3. Test that rule in admin selection and public display.
4. Move to the next achievement only after the previous one is accepted.

This phase is not a broad gamification rebuild. It builds the rules around the existing `fansub_group_history` and the approved Anime-style badge catalog, while keeping future backend-confirmed count achievements distinct from ordinary manual history entries.

</domain>

<decisions>
## Locked Workflow Decisions

### D-01 One-achievement loop
- Do not implement all achievements in one pass.
- Each achievement needs a short product discussion, an implementation slice, and verification before the next achievement starts.

### D-02 Used achievements disappear from the admin selection
- If an achievement has already been used for a group, it is hidden from the add/select list.
- It remains visible in the public history/achievement display.

### D-03 Locked-but-interesting achievements stay visible
- If an achievement is not yet available, it stays visible in the admin selection as disabled/locked.
- The disabled state should explain why it is not available yet.
- This is intended to make admins curious about what can be unlocked later.

### D-04 Existing test data is not authoritative
- Existing groups and current local preview rows are disposable test data.
- The important behavior is correct for newly created or newly edited groups going forward.

### D-05 Founding is the first implementation slice
- First achievement to discuss and implement: `founding` / `Gründung`.
- Product intent: if the Fansub group has a start/founding year, `Gründung` becomes selectable.
- After `Gründung` is used once for that group, it disappears from the selection.
- If the start/founding year is missing, `Gründung` stays visible but disabled.

### D-06 Count achievements are backend-confirmed later
- Project-count and release-count achievements must not stay freely selectable long-term.
- They are shown as locked until backend-derived counts confirm eligibility.
- Exact count sources must be discussed per category before implementation.

### D-07 Visual asset decisions are retained
- Approved transparent badge assets in `frontend/public/history-event-badges-transparent/` are the current display source.
- Public profile uses transparent badge images with soft colored glow.
- `hiatus` / `Pause` uses violet tone.
- Desktop/tablet badge scaling remains: mobile 88px, tablet 104px, desktop 112px.
</decisions>

<achievement_queue>
## Achievement Discussion Queue

| Order | Code | Label | Category | Initial rule status |
| ---: | --- | --- | --- | --- |
| 1 | `founding` | Gründung | manual/history | Ready to discuss first |
| 2 | `first_release` | Erstes Release | manual/history | Needs rule discussion |
| 3 | `anniversary` | Jubiläum | manual/history | Needs rule discussion |
| 4 | `collaboration` | Kooperation | manual/history | Needs rule discussion |
| 5 | `project_completed` | Projekt abgeschlossen | manual/history | Needs rule discussion |
| 6 | `team_change` | Teamwechsel | manual/history | Needs rule discussion |
| 7 | `website_launch` | Website/Forum gestartet | manual/history | Needs rule discussion |
| 8 | `award` | Auszeichnung | manual/history | Needs rule discussion |
| 9 | `revival` | Wiederaufnahme | manual/history | Needs rule discussion |
| 10 | `hiatus` | Pause | manual/history | Needs rule discussion |
| 11 | `disbanding` | Auflösung | manual/history | Needs rule discussion |
| 12 | `rebranding` | Umbenennung | manual/history | Needs rule discussion |
| 13 | `milestone` | Meilenstein | manual/history | Needs rule discussion |
| 14 | `other` | Sonstiges | manual/history | Needs rule discussion |
| 15 | `projects_10` | 10 Projekte | project_count | Needs count-source discussion |
| 16 | `projects_50` | 50 Projekte | project_count | Needs count-source discussion |
| 17 | `projects_100` | 100 Projekte | project_count | Needs count-source discussion |
| 18 | `projects_500` | 500 Projekte | project_count | Needs count-source discussion |
| 19 | `releases_100` | 100 Releases | release_count | Needs count-source discussion |
| 20 | `releases_500` | 500 Releases | release_count | Needs count-source discussion |
| 21 | `releases_1000` | 1000 Releases | release_count | Needs count-source discussion |
| 22 | `releases_5000` | 5000 Releases | release_count | Needs count-source discussion |
| 23 | `releases_10000` | 10000 Releases | release_count | Needs count-source discussion |
</achievement_queue>

<canonical_refs>
## Canonical References

- `AGENTS.md` - Team4s working rules, domain rules, database/migration safety, UI rules.
- `docs/engineering/implementation-contract.md` - reuse-first and API/frontend/backend contract discipline.
- `docs/frontend/ui-system.md` - semantic controls and global UI primitives.
- `docs/agent-guidelines-ui.md` - persisted-data UI control mapping.
- `frontend/src/lib/group-history-events.ts` - current event catalog, labels, image paths, tones.
- `frontend/src/components/groups/GroupHistoryForm.tsx` - current admin add/edit selection surface.
- `frontend/src/components/groups/GroupHistorySection.tsx` - admin list rendering.
- `frontend/src/components/fansubs/FansubHistorySection.tsx` - public history/achievement rendering.
- `backend/internal/handlers/fansub_group_history_handler.go` - current backend event type whitelist.
- `shared/contracts/openapi.yaml` - public/admin contract surface for history event types.
- `.planning/todos/pending/2026-07-10-fansub-achievement-badge-catalog-implementieren.md` - earlier badge catalog todo and asset decisions.
- `tmp/history-event-icons/anime-badge-sheets/selected-badges.md` - selected normal history badge variants.
- `tmp/history-event-icons/legendary-badges/db-proposal.md` - count-achievement proposal and visual ordering.
</canonical_refs>

<deferred>
## Deferred

- A full earned/locked achievement service for every project/release count is deferred until each count source is discussed.
- Backfilling or cleaning current local test data is out of scope unless it blocks future behavior.
- Public "locked catalog" display is not decided; current assumption is earned/used achievements only on public pages.
</deferred>
