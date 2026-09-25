# Quick Context

## Scope

Phase 168 UI polish for the release-version Media / Assets tab. The editor header already exposes the episode, fansub group, and release version, so the media gallery should use that context without repeating a separate context card.

## Decisions

- Untitled media uses the editor context title, for example `Episode 001 · New-Subs v1`.
- A media item's own title or caption remains authoritative when present.
- Filenames and generic `Asset #...` labels are not shown as gallery titles.
- The existing upload category button names stay stable; clarity is added through tooltips and active styling.
