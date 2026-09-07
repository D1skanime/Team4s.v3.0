# Phase 151 artwork signoff

Automation supplies exhaustive rows and evidence links; die Sichtspalten waren im Collector-Output leer und wurden anschliessend vom Koordinator ausgefuellt (siehe unten).

## Coordinator-Signoff (Claude, 2026-09-07)

Methode: Jede Zeile wurde an ihren Belegen gesichtet — die 113 Quellzeilen ueber die acht
`contact-sheets/sources-*.png` (volle contain-Kacheln, jede Kachel mit Dateinamen beschriftet) und
die 84 Kompositionszeilen ueber die zehn `contact-sheets/compositions-*.png` (vollstaendige Karten,
kein Beschnitt) sowie punktuell ueber die Einzel-Crops unter `crops/`. Geometrie-, Titel-, Hoehen-
und Aktiv/Inaktiv-Werte stammen zusaetzlich aus den Maschinen-Gates des Collectors
(`browser-matrix-summary.json`, 16/16 Matrixzeilen, 0 Findings, 0 Browserfehler).

Legende: `OK` = geprueft und angenommen. `n/a` = Spalte gilt fuer Quelldateien nicht
(Quellkacheln haben keinen Kartentitel, keine Kartenhoehe und keinen Aktiv/Inaktiv-Zustand).

Notierte, bewusst akzeptierte Abweichungen:
- `historical_leader` / `special-historical_leader-v1.png`: Portrait-Banner statt Kreisbadge. Es bleibt
  im gemeinsamen 192/216/240-Slot begrenzt und wirkt dadurch optisch leichter als die runden Badges.
  Das ist die bestehende Quellgeometrie und wurde nicht kuenstlich vergroessert.
- `admin`, `designer`, `other`: Motive tragen mehr Eigen-Padding; die geteilte CSS-Regel weitet dafuer
  den Backdrop-Rand (`margin: 12%`). Slotgroesse und Kartenhoehe bleiben identisch zu allen anderen Rollen.
- Superseded Quellen (ohne `-vN`-Suffix bzw. aeltere Versionen) erscheinen nur in der Quell-Inventur,
  nie in einer produktiven Komposition.


| Kind | Key | Evidence | Sharpness | Centering | Padding | Crop | Aspect | Title | Height | Active/inactive | Relative weight |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| source | `contribution_archivist_bronze-v2.png` | [crop](crops/sources/001-contribution_archivist_bronze-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_archivist_bronze.png` | [crop](crops/sources/002-contribution_archivist_bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_archivist_gold-v2.png` | [crop](crops/sources/003-contribution_archivist_gold-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_archivist_gold.png` | [crop](crops/sources/004-contribution_archivist_gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_archivist_silver-v2.png` | [crop](crops/sources/005-contribution_archivist_silver-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_archivist_silver.png` | [crop](crops/sources/006-contribution_archivist_silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_chronicle_bronze-v4.png` | [crop](crops/sources/007-contribution_chronicle_bronze-v4.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_chronicle_bronze.png` | [crop](crops/sources/008-contribution_chronicle_bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_chronicle_gold-v2.png` | [crop](crops/sources/009-contribution_chronicle_gold-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_chronicle_gold.png` | [crop](crops/sources/010-contribution_chronicle_gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_chronicle_silver-v2.png` | [crop](crops/sources/011-contribution_chronicle_silver-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_chronicle_silver.png` | [crop](crops/sources/012-contribution_chronicle_silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_projects_bronze-v3.png` | [crop](crops/sources/013-contribution_projects_bronze-v3.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_projects_bronze.png` | [crop](crops/sources/014-contribution_projects_bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_projects_gold-v2.png` | [crop](crops/sources/015-contribution_projects_gold-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_projects_gold.png` | [crop](crops/sources/016-contribution_projects_gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_projects_silver-v2.png` | [crop](crops/sources/017-contribution_projects_silver-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `contribution_projects_silver.png` | [crop](crops/sources/018-contribution_projects_silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `membership-10_years-v4.png` | [crop](crops/sources/019-membership-10_years-v4.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `membership-7_years-v4.png` | [crop](crops/sources/020-membership-7_years-v4.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `membership-founding_member-v4.png` | [crop](crops/sources/021-membership-founding_member-v4.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `membership-long_term_member-v4.png` | [crop](crops/sources/022-membership-long_term_member-v4.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `point_milestone_active-v2.png` | [crop](crops/sources/023-point_milestone_active-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `point_milestone_engaged-v2.png` | [crop](crops/sources/024-point_milestone_engaged-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `point_milestone_experienced-v2.png` | [crop](crops/sources/025-point_milestone_experienced-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `point_milestone_first-v2.png` | [crop](crops/sources/026-point_milestone_first-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `point_milestone_first.png` | [crop](crops/sources/027-point_milestone_first.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `point_milestone_legend-v2.png` | [crop](crops/sources/028-point_milestone_legend-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `point_milestone_veteran-v2.png` | [crop](crops/sources/029-point_milestone_veteran-v2.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `point_milestone_veteran-v3.png` | [crop](crops/sources/030-point_milestone_veteran-v3.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `progress-first_contribution-motif.png` | [crop](crops/sources/031-progress-first_contribution-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `progress-frame-first_contribution.png` | [crop](crops/sources/032-progress-frame-first_contribution.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `progress-frame-productive-bronze.png` | [crop](crops/sources/033-progress-frame-productive-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `progress-frame-productive-gold.png` | [crop](crops/sources/034-progress-frame-productive-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `progress-frame-productive-silver.png` | [crop](crops/sources/035-progress-frame-productive-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `progress-productive-motif.png` | [crop](crops/sources/036-progress-productive-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-admin-bronze.png` | [crop](crops/sources/037-rank-frame-admin-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `rank-frame-admin-gold.png` | [crop](crops/sources/038-rank-frame-admin-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `rank-frame-admin-platinum.png` | [crop](crops/sources/039-rank-frame-admin-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `rank-frame-admin-silver.png` | [crop](crops/sources/040-rank-frame-admin-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `rank-frame-designer-bronze.png` | [crop](crops/sources/041-rank-frame-designer-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `rank-frame-designer-gold.png` | [crop](crops/sources/042-rank-frame-designer-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `rank-frame-designer-platinum.png` | [crop](crops/sources/043-rank-frame-designer-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `rank-frame-designer-silver.png` | [crop](crops/sources/044-rank-frame-designer-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `rank-frame-editor-bronze.png` | [crop](crops/sources/045-rank-frame-editor-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-editor-gold.png` | [crop](crops/sources/046-rank-frame-editor-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-editor-platinum.png` | [crop](crops/sources/047-rank-frame-editor-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-editor-silver.png` | [crop](crops/sources/048-rank-frame-editor-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-encoder-bronze.png` | [crop](crops/sources/049-rank-frame-encoder-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-encoder-gold.png` | [crop](crops/sources/050-rank-frame-encoder-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-encoder-platinum.png` | [crop](crops/sources/051-rank-frame-encoder-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-encoder-silver.png` | [crop](crops/sources/052-rank-frame-encoder-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-karaoke_fx-bronze.png` | [crop](crops/sources/053-rank-frame-karaoke_fx-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (gleich wie uebrige Rollen) |
| source | `rank-frame-karaoke_fx-gold.png` | [crop](crops/sources/054-rank-frame-karaoke_fx-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (gleich wie uebrige Rollen) |
| source | `rank-frame-karaoke_fx-platinum.png` | [crop](crops/sources/055-rank-frame-karaoke_fx-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (gleich wie uebrige Rollen) |
| source | `rank-frame-karaoke_fx-silver.png` | [crop](crops/sources/056-rank-frame-karaoke_fx-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (gleich wie uebrige Rollen) |
| source | `rank-frame-other-bronze.png` | [crop](crops/sources/057-rank-frame-other-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-other-gold.png` | [crop](crops/sources/058-rank-frame-other-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-other-platinum.png` | [crop](crops/sources/059-rank-frame-other-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-other-silver.png` | [crop](crops/sources/060-rank-frame-other-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-project_lead-bronze.png` | [crop](crops/sources/061-rank-frame-project_lead-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-project_lead-gold.png` | [crop](crops/sources/062-rank-frame-project_lead-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-project_lead-platinum.png` | [crop](crops/sources/063-rank-frame-project_lead-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-project_lead-silver.png` | [crop](crops/sources/064-rank-frame-project_lead-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-quality_checker-bronze.png` | [crop](crops/sources/065-rank-frame-quality_checker-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-quality_checker-gold.png` | [crop](crops/sources/066-rank-frame-quality_checker-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-quality_checker-platinum.png` | [crop](crops/sources/067-rank-frame-quality_checker-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-quality_checker-silver.png` | [crop](crops/sources/068-rank-frame-quality_checker-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-raw_provider-bronze.png` | [crop](crops/sources/069-rank-frame-raw_provider-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-raw_provider-gold.png` | [crop](crops/sources/070-rank-frame-raw_provider-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-raw_provider-platinum.png` | [crop](crops/sources/071-rank-frame-raw_provider-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-raw_provider-silver.png` | [crop](crops/sources/072-rank-frame-raw_provider-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-timer-bronze.png` | [crop](crops/sources/073-rank-frame-timer-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-timer-gold.png` | [crop](crops/sources/074-rank-frame-timer-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-timer-platinum.png` | [crop](crops/sources/075-rank-frame-timer-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-timer-silver.png` | [crop](crops/sources/076-rank-frame-timer-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-translator-bronze.png` | [crop](crops/sources/077-rank-frame-translator-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-translator-gold.png` | [crop](crops/sources/078-rank-frame-translator-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-translator-platinum.png` | [crop](crops/sources/079-rank-frame-translator-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-translator-silver.png` | [crop](crops/sources/080-rank-frame-translator-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-typesetter-bronze.png` | [crop](crops/sources/081-rank-frame-typesetter-bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-typesetter-gold.png` | [crop](crops/sources/082-rank-frame-typesetter-gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-typesetter-platinum.png` | [crop](crops/sources/083-rank-frame-typesetter-platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `rank-frame-typesetter-silver.png` | [crop](crops/sources/084-rank-frame-typesetter-silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_entry_admin.png` | [crop](crops/sources/085-role_entry_admin.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `role_entry_designer.png` | [crop](crops/sources/086-role_entry_designer.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `role_entry_editor.png` | [crop](crops/sources/087-role_entry_editor.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_entry_encoder.png` | [crop](crops/sources/088-role_entry_encoder.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_entry_karaoke_fx.png` | [crop](crops/sources/089-role_entry_karaoke_fx.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (gleich wie uebrige Rollen) |
| source | `role_entry_other.png` | [crop](crops/sources/090-role_entry_other.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `role_entry_project_lead.png` | [crop](crops/sources/091-role_entry_project_lead.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_entry_quality_checker.png` | [crop](crops/sources/092-role_entry_quality_checker.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_entry_raw_provider.png` | [crop](crops/sources/093-role_entry_raw_provider.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_entry_timer.png` | [crop](crops/sources/094-role_entry_timer.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_entry_translator.png` | [crop](crops/sources/095-role_entry_translator.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_entry_typesetter.png` | [crop](crops/sources/096-role_entry_typesetter.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_volume_timer_bronze.png` | [crop](crops/sources/097-role_volume_timer_bronze.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_volume_timer_gold.png` | [crop](crops/sources/098-role_volume_timer_gold.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_volume_timer_platinum.png` | [crop](crops/sources/099-role_volume_timer_platinum.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role_volume_timer_silver.png` | [crop](crops/sources/100-role_volume_timer_silver.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role-admin-motif.png` | [crop](crops/sources/101-role-admin-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `role-designer-motif.png` | [crop](crops/sources/102-role-designer-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (motiveigenes Padding) |
| source | `role-editor-motif.png` | [crop](crops/sources/103-role-editor-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role-encoder-motif.png` | [crop](crops/sources/104-role-encoder-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role-karaoke_fx-motif.png` | [crop](crops/sources/105-role-karaoke_fx-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (gleich wie uebrige Rollen) |
| source | `role-other-motif.png` | [crop](crops/sources/106-role-other-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role-project_lead-motif.png` | [crop](crops/sources/107-role-project_lead-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role-quality_checker-motif.png` | [crop](crops/sources/108-role-quality_checker-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role-raw_provider-motif.png` | [crop](crops/sources/109-role-raw_provider-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role-timer-motif.png` | [crop](crops/sources/110-role-timer-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role-translator-motif.png` | [crop](crops/sources/111-role-translator-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `role-typesetter-motif.png` | [crop](crops/sources/112-role-typesetter-motif.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK |
| source | `special-historical_leader-v1.png` | [crop](crops/sources/113-special-historical_leader-v1.png.png) | OK | OK | OK | OK | OK | n/a | n/a | n/a | OK (Portrait, bewusst leichter) |
| composition | `role_entry_project_lead` | [crop](crops/compositions/001-role_entry_project_lead.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_project_lead_bronze` | [crop](crops/compositions/002-role_volume_project_lead_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_project_lead_silver` | [crop](crops/compositions/003-role_volume_project_lead_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_project_lead_gold` | [crop](crops/compositions/004-role_volume_project_lead_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_project_lead_platinum` | [crop](crops/compositions/005-role_volume_project_lead_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_entry_translator` | [crop](crops/compositions/006-role_entry_translator.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_translator_bronze` | [crop](crops/compositions/007-role_volume_translator_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_translator_silver` | [crop](crops/compositions/008-role_volume_translator_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_translator_gold` | [crop](crops/compositions/009-role_volume_translator_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_translator_platinum` | [crop](crops/compositions/010-role_volume_translator_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_entry_timer` | [crop](crops/compositions/011-role_entry_timer.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_timer_bronze` | [crop](crops/compositions/012-role_volume_timer_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_timer_silver` | [crop](crops/compositions/013-role_volume_timer_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_timer_gold` | [crop](crops/compositions/014-role_volume_timer_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_timer_platinum` | [crop](crops/compositions/015-role_volume_timer_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_entry_typesetter` | [crop](crops/compositions/016-role_entry_typesetter.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_typesetter_bronze` | [crop](crops/compositions/017-role_volume_typesetter_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_typesetter_silver` | [crop](crops/compositions/018-role_volume_typesetter_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_typesetter_gold` | [crop](crops/compositions/019-role_volume_typesetter_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_typesetter_platinum` | [crop](crops/compositions/020-role_volume_typesetter_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_entry_editor` | [crop](crops/compositions/021-role_entry_editor.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_editor_bronze` | [crop](crops/compositions/022-role_volume_editor_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_editor_silver` | [crop](crops/compositions/023-role_volume_editor_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_editor_gold` | [crop](crops/compositions/024-role_volume_editor_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_editor_platinum` | [crop](crops/compositions/025-role_volume_editor_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_entry_encoder` | [crop](crops/compositions/026-role_entry_encoder.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_encoder_bronze` | [crop](crops/compositions/027-role_volume_encoder_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_encoder_silver` | [crop](crops/compositions/028-role_volume_encoder_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_encoder_gold` | [crop](crops/compositions/029-role_volume_encoder_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_encoder_platinum` | [crop](crops/compositions/030-role_volume_encoder_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_entry_raw_provider` | [crop](crops/compositions/031-role_entry_raw_provider.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_raw_provider_bronze` | [crop](crops/compositions/032-role_volume_raw_provider_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_raw_provider_silver` | [crop](crops/compositions/033-role_volume_raw_provider_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_raw_provider_gold` | [crop](crops/compositions/034-role_volume_raw_provider_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_raw_provider_platinum` | [crop](crops/compositions/035-role_volume_raw_provider_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_entry_quality_checker` | [crop](crops/compositions/036-role_entry_quality_checker.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_quality_checker_bronze` | [crop](crops/compositions/037-role_volume_quality_checker_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_quality_checker_silver` | [crop](crops/compositions/038-role_volume_quality_checker_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_quality_checker_gold` | [crop](crops/compositions/039-role_volume_quality_checker_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_volume_quality_checker_platinum` | [crop](crops/compositions/040-role_volume_quality_checker_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `role_entry_designer` | [crop](crops/compositions/041-role_entry_designer.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_designer_bronze` | [crop](crops/compositions/042-role_volume_designer_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_designer_silver` | [crop](crops/compositions/043-role_volume_designer_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_designer_gold` | [crop](crops/compositions/044-role_volume_designer_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_designer_platinum` | [crop](crops/compositions/045-role_volume_designer_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_entry_admin` | [crop](crops/compositions/046-role_entry_admin.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_admin_bronze` | [crop](crops/compositions/047-role_volume_admin_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_admin_silver` | [crop](crops/compositions/048-role_volume_admin_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_admin_gold` | [crop](crops/compositions/049-role_volume_admin_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_admin_platinum` | [crop](crops/compositions/050-role_volume_admin_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_entry_other` | [crop](crops/compositions/051-role_entry_other.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_other_bronze` | [crop](crops/compositions/052-role_volume_other_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_other_silver` | [crop](crops/compositions/053-role_volume_other_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_other_gold` | [crop](crops/compositions/054-role_volume_other_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_volume_other_platinum` | [crop](crops/compositions/055-role_volume_other_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (motiveigenes Padding) |
| composition | `role_entry_karaoke_fx` | [crop](crops/compositions/056-role_entry_karaoke_fx.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (gleich wie uebrige Rollen) |
| composition | `role_volume_karaoke_fx_bronze` | [crop](crops/compositions/057-role_volume_karaoke_fx_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (gleich wie uebrige Rollen) |
| composition | `role_volume_karaoke_fx_silver` | [crop](crops/compositions/058-role_volume_karaoke_fx_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (gleich wie uebrige Rollen) |
| composition | `role_volume_karaoke_fx_gold` | [crop](crops/compositions/059-role_volume_karaoke_fx_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (gleich wie uebrige Rollen) |
| composition | `role_volume_karaoke_fx_platinum` | [crop](crops/compositions/060-role_volume_karaoke_fx_platinum.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (gleich wie uebrige Rollen) |
| composition | `contribution_archivist_bronze` | [crop](crops/compositions/061-contribution_archivist_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `contribution_archivist_gold` | [crop](crops/compositions/062-contribution_archivist_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `contribution_archivist_silver` | [crop](crops/compositions/063-contribution_archivist_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `contribution_chronicle_bronze` | [crop](crops/compositions/064-contribution_chronicle_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `contribution_chronicle_gold` | [crop](crops/compositions/065-contribution_chronicle_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `contribution_chronicle_silver` | [crop](crops/compositions/066-contribution_chronicle_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `contribution_projects_bronze` | [crop](crops/compositions/067-contribution_projects_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `contribution_projects_gold` | [crop](crops/compositions/068-contribution_projects_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `contribution_projects_silver` | [crop](crops/compositions/069-contribution_projects_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `first_contribution` | [crop](crops/compositions/070-first_contribution.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `founding_member` | [crop](crops/compositions/071-founding_member.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `historical_leader` | [crop](crops/compositions/072-historical_leader.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK (Portrait, bewusst leichter) |
| composition | `long_term_member` | [crop](crops/compositions/073-long_term_member.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `membership_10_years` | [crop](crops/compositions/074-membership_10_years.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `membership_7_years` | [crop](crops/compositions/075-membership_7_years.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `point_milestone_active` | [crop](crops/compositions/076-point_milestone_active.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `point_milestone_engaged` | [crop](crops/compositions/077-point_milestone_engaged.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `point_milestone_experienced` | [crop](crops/compositions/078-point_milestone_experienced.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `point_milestone_first` | [crop](crops/compositions/079-point_milestone_first.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `point_milestone_legend` | [crop](crops/compositions/080-point_milestone_legend.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `point_milestone_veteran` | [crop](crops/compositions/081-point_milestone_veteran.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `productive_bronze` | [crop](crops/compositions/082-productive_bronze.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `productive_gold` | [crop](crops/compositions/083-productive_gold.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| composition | `productive_silver` | [crop](crops/compositions/084-productive_silver.png) | OK | OK | OK | OK | OK | OK | OK | OK | OK |
