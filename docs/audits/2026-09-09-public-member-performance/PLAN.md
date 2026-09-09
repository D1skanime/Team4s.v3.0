# Public Member Performance RCA — 2026-09-09

Scope: execute the supplied technical audit on team4s-linux, analysis and temporary instrumentation only. Baseline a5557720; initial working tree clean. No database row changes, schema changes or durable product optimization.

1. Capture DEV cold/warm network, CPU/trace, heap/DOM/listeners, React commits, observers and slow/fast/repeated scrolling for timer (full content), kara (zero projects/contributions/badges, no avatar/banner), and new-subs (control).
2. Trace current repository loaders with pgx query timings on the existing data; measure HTTP separately. Explain individual SQL plans where material.
3. Attribute real generated/loaded bundles and actual image delivery, including fallback and locked stages.
4. Run independent source-isolation variants: Story/editor, badges, static carousel, projects, contributions, images blocked, header only. Restore original source after experiments.
5. Compare isolated production build where feasible. Reproduce shared Windows browser flow as complementary UAT.
6. Preserve reproducible tooling, raw/summary evidence, prioritized findings, uncertainties and a measurable follow-up plan. Review diff and restore temporary changes.

Known analogs read: frontend/scripts/collect-member-profile-evidence.mjs, frontend/scripts/run-profile-image-probe.mjs, backend/internal/repository/query_counter.go; public member/group pages, MemberProfileContent, MemberStorySection, MemberBadgeChain, FocalCarousel, AchievementArtwork, ResponsiveImage.

Cold means a new browser context; warm means reload in the same context after full scrolling. Server compilation/image-cache state is recorded separately and is not called browser cold cache. No synthetic data replaces real API payloads.

Outcome: report and reproducible evidence completed; personal Chrome crash and richer group/login control remain explicit limitations. See REPORT.md and VALIDATION.md. Product source restored.
