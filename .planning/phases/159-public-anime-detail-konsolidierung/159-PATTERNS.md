# Phase159 — Patterns und read_first

Konkrete Quelldateien vor Änderungen vollständig lesen. Die Tabelle nennt vorhandene Analoga, keine Aufforderung zu parallelen Implementierungen. [VERIFIED: technische Preflights]

| Arbeit | Vorhandene Analoga und Consumer |
|---|---|
|Page/ID/Metadata/Loading|frontend/src/app/anime/[id]/page.tsx; page.module.css; app/anime/loading.tsx; app/anime/[id]/loading.tsx; app/anime/page.tsx|
|Session/Status|frontend/src/lib/useAuthSession.ts; api.ts; CommentForm.tsx; WatchlistAddButton.tsx; useCancellableSlugState.ts|
|Beiträge/Versionen/Story|AnimeContributionsSection.tsx/.module.css; FansubVersionBrowser.tsx/.module.css; ActiveFansubStory.tsx und Tests|
|Pretty|fansubProjectRoutes.ts; Phase155-Resolver und Prettyroute; types/anime.ts; backend/internal/models/anime.go; repository/anime_v2.go|
|Relations|backend/internal/handlers/anime.go; repository/anime.go; anime_relations.go; comment.go:animeExists; OpenAPI|
|Grid|AnimeEdgeNavigation.tsx; animeGridContext.ts; getAnimeList; getSearch mit AbortSignal|
|Media|animeBackdrops.ts; AnimeMediaProvider.tsx und Tests; AnimeBackdropRotator.tsx; ResponsiveImage.tsx/Configtests; next.config.mjs|
|Variantenvertrag|episode_version_repository_read_helpers.go; types/episodeVersion.ts; api.ts groupedHelper; shared/contracts/openapi.yaml|
|Assignmentwahrheit|theme_segment_assignments.go; group_repository_cursor_timeline.go; release_detail_public_repository_segment_credits.go; segment_credit_role_filter_test.go; segment_origin_query_budget_test.go|
|Browser/Build|audit-public-member-performance.mjs; run-profile-image-probe.mjs; Dockerfile; docker-compose.override.yml|

## Konfliktgrenzen

page.tsx erhält einen Integrator. api.ts, OpenAPI und Typen erhalten einen Vertragsbesitzer. FansubVersionBrowser-State und DTOintegration sequenzieren. Bildblätter und Cache im AnimeMediaProvider koordiniert ändern. Globale CSS-/Rollenpalette nicht neu erfinden. Consumer-Matrix vor riskantem Vertrag;158-Gate ist Startvoraussetzung.

## Quellen

- [GSD-Kontext und vollständiges Leseinventar](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/GSD-CONTEXT.md)
- [Frontend-Reparaturen und Routing](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/FRONTEND-REPAIRS.md)
- [Clientzustand und Medien](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/FRONTEND-STATE-MEDIA.md)
- [Backend und Verträge](../../../docs/audits/2026-09-13-public-anime-detail/implementation-preflight/BACKEND-CONTRACTS.md)
- Vollständiger Deep-Audit: docs/audits/2026-09-13-public-anime-detail/{AUDIT,COMPONENTS-AND-CLIENT,REQUESTS-AND-SQL,RUNTIME-VERIFICATION,FOLLOW-UP-PLAN}.md

Aktuelle Quelldateien vor jeder Implementierung vollständig lesen. Die Preflights sind Belege für den recherchierten Stand, kein Ersatz für die Diffprüfung. [VERIFIED: vier Preflightberichte vom13.09.2026]
