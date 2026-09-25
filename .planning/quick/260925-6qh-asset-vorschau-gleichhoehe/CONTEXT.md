# Context

The Anime edit asset board showed Cover and Banner preview frames with different CSS aspect ratios, so their visible heights did not align in the side-by-side layout.

Decision: use one shared fixed preview height for Cover and Banner in the existing asset-card layout. Keep the image object-fit behavior and the separate Logo/Background sizing unchanged.
