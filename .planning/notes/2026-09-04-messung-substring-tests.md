# Messung — Quelltext-Substring-Tests im Backend (2026-09-04)

Grundlage für Phase 146, Kriterien 5 bis 8. Reproduzierbar über
`.planning/notes/measure-substring-tests.py` (`python3 .planning/notes/measure-substring-tests.py`).

## Was gemessen wurde

Alle `*_test.go` unter `backend/`, die per `os.ReadFile("…​.go")` eine Go-Quelldatei einlesen.
Für jede Datei die Zahl der `strings.Contains`-Aufrufe (Obergrenze — einige davon prüfen
Response-Bodies, nicht Quelltext) und die Zahl der Testfunktionen.

## Abweichung zum Roadmap-Ausgangsbefund

Der Roadmap-Block nennt 53 Dateien / 357 Aufrufe / 302 Testfunktionen und **17**
sicherheitsrelevante Dateien. Diese Messung bestätigt 53 und 302, kommt aber auf **376** Aufrufe
und **20** sicherheitsrelevante Dateien. Die Differenz ist eine Definitionsfrage, kein Widerspruch:

- 376 vs. 357 — beide sind Obergrenzen mit leicht unterschiedlichem Zuschnitt beim Abzug der
  Response-Body-Prüfungen.
- 20 vs. 17 — der Filter hier trifft auf Dateinamen **und** Dateikopf
  (permission, authz, capability, preview, 403, forbidden, effective_right, whitelist,
  delegation, role_catalog, reserved). Vier der 20 haben `contains=0`, lesen die Quelle also ein,
  ohne per `strings.Contains` etwas zu behaupten — ein plausibler Teil der Differenz, aber er
  erklärt sie nicht exakt (20 minus 4 = 16, nicht 17).

**Konsequenz für die Planung:** Die exakte Menge der sicherheitsrelevanten Dateien ist als erste
Aufgabe festzunageln, mit genau der Filterregel, die anschließend auch den Guard aus Kriterium 7
trägt. Ohne diese Festlegung sind die Kriterien 5 und 6 nicht messbar — Kriterium 6 verlangt
höchstens 36 von 53 verbleibenden Dateien, also genau 17 Abgänge, was nur bei geklärter
Mengendefinition aufgeht.

## Rohausgabe

```
GESAMT Dateien mit .go-Quelltext-Lesen: 53
strings.Contains gesamt: 376
Testfunktionen gesamt: 302

=== SICHERHEITSRELEVANT (20) ===
  internal/repository/release_version_media_repository_test.go                contains=33   funcs=18
  internal/handlers/admin_content_release_version_media_test.go               contains=25   funcs=40
  internal/handlers/admin_content_fansub_notes_test.go                        contains=11   funcs=2
  internal/handlers/admin_content_release_theme_assets_test.go                contains=7    funcs=4
  internal/handlers/admin_content_release_version_media_replace_test.go       contains=7    funcs=2
  internal/repository/hist_group_member_roles_whitelist_test.go               contains=5    funcs=2
  internal/repository/member_archive_repository_test.go                       contains=5    funcs=4
  internal/handlers/fansub_test.go                                            contains=3    funcs=20
  internal/repository/member_claims_repository_claim_activation_test.go       contains=3    funcs=5
  internal/repository/role_definitions_context_test.go                        contains=3    funcs=2
  internal/handlers/role_catalog_router_integration_test.go                   contains=2    funcs=1
  internal/repository/point_ledger_repository_test.go                         contains=2    funcs=8
  internal/repository/role_catalog_repository_test.go                         contains=2    funcs=1
  internal/services/release_crew_service_test.go                              contains=2    funcs=3
  internal/handlers/admin_content_anime_project_notes_test.go                 contains=1    funcs=5
  internal/handlers/dashboard_me_handler_test.go                              contains=1    funcs=10
  internal/handlers/public_member_access_matrix_test.go                       contains=0    funcs=2
  internal/repository/member_point_totals_repository_test.go                  contains=0    funcs=7
  internal/repository/review_delegation_repository_test.go                    contains=0    funcs=11
  internal/services/release_review_submission_test.go                         contains=0    funcs=6

=== UEBRIGE (33) ===
  internal/repository/member_profile_repository_test.go                       contains=128  funcs=6
  internal/repository/release_version_notes_repository_test.go                contains=12   funcs=7
  internal/repository/anime_project_notes_repository_test.go                  contains=11   funcs=4
  internal/repository/fansub_repository_test.go                               contains=11   funcs=8
  internal/repository/media_repository_path_test.go                           contains=11   funcs=3
  internal/repository/admin_users_repository_test.go                          contains=9    funcs=4
  internal/repository/app_auth_repository_test.go                             contains=9    funcs=4
  internal/repository/group_repository_test.go                                contains=8    funcs=7
  internal/repository/group_themes_repository_test.go                         contains=7    funcs=2
  internal/repository/fansub_notes_repository_test.go                         contains=6    funcs=1
  internal/repository/episode_version_repository_read_helpers_test.go         contains=5    funcs=3
  internal/handlers/admin_content_release_version_notes_test.go               contains=4    funcs=2
  internal/handlers/fansub_media_upload_thumbnail_test.go                     contains=4    funcs=1
  internal/handlers/project_member_public_handler_test.go                     contains=4    funcs=9
  internal/repository/admin_content_theme_asset_locks_test.go                 contains=4    funcs=1
  internal/repository/anime_contributions_member_project_repository_test.go   contains=4    funcs=2
  internal/repository/episode_import_repository_test.go                       contains=4    funcs=10
  internal/repository/member_claims_repository_test.go                        contains=4    funcs=7
  cmd/server/phase108_runtime_wiring_test.go                                  contains=2    funcs=2
  internal/handlers/contributions_me_member_anchor_test.go                    contains=2    funcs=1
  internal/repository/admin_users_tab_repository_test.go                      contains=2    funcs=2
  internal/repository/anime_contributions_display_avatar_test.go              contains=2    funcs=2
  internal/repository/anime_contributions_member_anchor_test.go               contains=2    funcs=1
  internal/repository/episode_import_repository_release_helpers_test.go       contains=2    funcs=2
  internal/repository/episode_version_repository_test.go                      contains=2    funcs=2
  internal/repository/release_detail_cursor_test.go                           contains=2    funcs=9
  internal/handlers/group_contributors_handler_test.go                        contains=1    funcs=1
  internal/repository/anime_coverage_repository_test.go                       contains=1    funcs=1
  internal/repository/episode_version_repository_write_helpers_test.go        contains=1    funcs=4
  internal/handlers/media_upload_test.go                                      contains=0    funcs=11
  internal/repository/group_contributors_repository_test.go                   contains=0    funcs=8
  internal/repository/review_credit_repository_test.go                        contains=0    funcs=7
  internal/services/release_version_media_cleanup_test.go                     contains=0    funcs=15
```
