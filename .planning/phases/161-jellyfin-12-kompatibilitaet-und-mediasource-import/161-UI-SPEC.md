# Phase 161 UI boundary

This phase preserves the existing ReleaseDetailHero hierarchy, grid, labels, controls, spacing and CSS. It supplies actual metadata to the existing Container, Audio-Sprache and Untertitelspuren fields. Unknown provider language remains unknown in the stored source snapshot. Per user clarification D-16, the existing audio-language field displays Japanisch when the language is unknown; a known audio language takes precedence. Subtitle language gets no Japanese fallback. Subtitle format and flags come from the selected source.

No new source selector, autoplay, media category or upload flow is introduced. Protected editors continue to use the central auth client, including refresh-only sessions and graceful Jellyfin-outage behavior. Align the existing import/public contracts and TypeScript types with the backend changes. Existing public and compatibility routes retain their ownership.
