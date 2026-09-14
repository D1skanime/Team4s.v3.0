# Backend consumer matrix — 260914-dzk

Before schema/contract edits, current HEAD 6cd178d0. Title and caption belong to the release_version_media relation. media_assets, episodes, release_media and group media remain separate owners.

| Consumer | Existing seam | Change |
|---|---|---|
| Admin / own release workspace upload, list, edit | admin_content_release_version_media.go; release_version_media_repository.go | Add nullable title to read DTO and PATCH (missing unchanged, null/trimmed empty clears, max 200 Unicode codepoints); caption unchanged |
| Replace image with metadata | admin_content_release_version_media_replace.go | Optional multipart title, empty clears; same title parser and same relation transaction |
| Public release initial image list + category cursor | release_detail_public_repository.go / _helpers.go, PublicReleaseImage | Project nullable rvm.title in both existing queries |
| Public group/anime release media | group_release_media_repository.go, PublicReleaseMediaItem | Project nullable rvm.title |
| Public project member images | project_member_public_repository.go, ProjectMemberMediaItem; handler embedded DTO mapping | Project nullable rvm.title and preserve mapping |
| Member recent media | member_profile_recent_repository.go; models.MemberProfileRecentMedia | Project nullable title alongside existing caption |
| Member latest contributions | member_profile_contributions_repository.go; existing PublicMemberLatestContribution.title | Use rvm.title for existing internal contribution_title SQL column (JSON title); text_preview remains description |
| Review, attribution, badge/count, visibility/existence readers | admin_users_queries, review/permission repositories, contribution/badge counters | No displayed metadata consumer; no new title projection required |

Admin and public outputs retain existing auth/visibility/review gates and bounded/set-based queries. No title derived from filename or copied from captions. Existing compatibility routes and media ownership remain. Schema migration 0163 is additive only; no backfill, data reset or runtime apply by backend executor. Preview clear+set now locks the release_versions row before touching media rows; parent authorized the narrow correction and a real overlapping-transaction regression test passed.
