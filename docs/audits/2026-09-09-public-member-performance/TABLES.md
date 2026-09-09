# Messwerttabellen

Alle MB sind dezimal. Zeitangaben in ms. Vollständige Einzelwerte und weitere Läufe: browser-summary.json.

## baseline-final: stabile Wiederholung 1

| Route | Cache | TTFB | DCL | Load | Requests | Transfer MB | Resource MB | JS MB | JS roh MB | CSS kB | Bilder kB | Browser-API | RSC | Cache-Treffer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fansubs/new-subs | cold | 133.1 | 284.3 | 824.0 | 17 | 4.982 | 18.509 | 3.743 | 17.020 | 33.5 | 1 172.3 | 0 | 0 | 0 |
| fansubs/new-subs | warm | 154.8 | 354.0 | 695.7 | 17 | 3.811 | 18.509 | 3.743 | 17.020 | 33.5 | 0.7 | 0 | 0 | 6 |
| members/timer | cold | 287.6 | 504.3 | 1 019.8 | 27 | 7.060 | 29.495 | 6.343 | 28.274 | 69.9 | 608.1 | 0 | 0 | 0 |
| members/timer | warm | 203.6 | 399.0 | 1 000.1 | 27 | 6.456 | 29.495 | 6.343 | 28.274 | 69.9 | 3.9 | 0 | 0 | 0 |
| members/kara | cold | 146.2 | 521.3 | 867.3 | 13 | 6.478 | 28.867 | 6.343 | 28.274 | 69.9 | 37.1 | 0 | 0 | 0 |
| members/kara | warm | 131.6 | 312.5 | 881.1 | 13 | 6.442 | 28.867 | 6.343 | 28.274 | 69.9 | 0.7 | 0 | 0 | 0 |

## production-diagnostic: stabile Wiederholung 1

| Route | Cache | TTFB | DCL | Load | Requests | Transfer MB | Resource MB | JS MB | JS roh MB | CSS kB | Bilder kB | Browser-API | RSC | Cache-Treffer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fansubs/new-subs | cold | 21.9 | 86.7 | 141.0 | 67 | 1.443 | 2.158 | 0.187 | 0.632 | 55.7 | 1 172.4 | 0 | 36 | 0 |
| fansubs/new-subs | warm | 17.5 | 86.6 | 86.8 | 67 | 0.030 | 2.158 | 0.000 | 0.632 | 0.0 | 0.0 | 0 | 36 | 30 |
| members/timer | cold | 31.5 | 210.1 | 216.1 | 60 | 1.039 | 2.158 | 0.353 | 1.155 | 49.7 | 608.2 | 0 | 14 | 0 |
| members/timer | warm | 25.0 | 146.8 | 147.3 | 55 | 0.032 | 2.143 | 0.000 | 1.155 | 0.0 | 0.0 | 0 | 14 | 40 |
| members/kara | cold | 20.0 | 78.7 | 160.4 | 44 | 0.459 | 1.535 | 0.353 | 1.155 | 49.7 | 37.1 | 0 | 12 | 0 |
| members/kara | warm | 19.9 | 121.8 | 122.1 | 44 | 0.023 | 1.535 | 0.000 | 1.155 | 0.0 | 0.0 | 0 | 12 | 31 |

Resource bytes = dekomprimierte HTTP-Bodies, nicht Bild-Pixelspeicher. Requests zählen den gesamten Lauf einschließlich Scrollen, Interaktion und Prefetch. Warm lädt in DEV JS erneut; in Produktion greifen Browser-Caches. RSC-Prefetch ist separat von Browser-API erfasst.

## Main Thread und DOM: baseline-final / cold / Wiederholung 1

| Faktor | Group new-subs | Member timer | Member kara |
| --- | --- | --- | --- |
| TTFB ms | 133.10 | 287.60 | 146.20 |
| Load ms | 824.00 | 1 019.80 | 867.30 |
| Script bis sichtbar ms | 263.99 | 307.04 | 279.75 |
| Layout bis sichtbar ms | 39.78 | 150.48 | 78.54 |
| Style bis sichtbar ms | 9.25 | 10.14 | 24.93 |
| Long Task maximal ms | 191.00 | 230.00 | 232.00 |
| Long Task nach sichtbar ms | 0.00 | 0.00 | 0.00 |
| Heap sichtbar MB | 25.798 | 46.431 | 44.453 |
| Heap nach Scroll + GC MB | 19.022 | 25.119 | 24.115 |
| Dokument-Elemente sichtbar | 347.00 | 821.00 | 606.00 |
| DOMCounters nach Scroll | 1 187.00 | 3 286.00 | 2 503.00 |
| Listener nach Scroll | 635.00 | 672.00 | 636.00 |
| Root-Commits initial | 12.00 | 13.00 | 12.00 |
| Zusätzliche Root-Commits beim Scrollen | 0.00 | 3.00 | 2.00 |
| Scroll Script ms | 0.53 | 15.31 | 8.25 |
| Scroll Layout ms | 0.00 | 0.60 | 0.00 |
| Scroll Style ms | 0.00 | 1.70 | 1.82 |

Heap sichtbar wurde nicht erzwungen gesammelt; der niedrigere Wert nach Scrollen ist kein Beleg für Speicherfreigabe durch Scrollen. Vergleichbare Vorher-/Nachher-GC-Werte stehen im Bericht. Script/Layout/Style-Zähler laufen über Reloads weiter; deshalb werden nur Cold-Zähler als initiale Dauer ausgewiesen. Warm-Auswertung nutzt die je Lauf getrennten Traces. Root-Commits sind keine gemessenen React-Profiler-Renderdauern.

## A/B-Isolation: Wiederholung 1, DEV

| Variante | JS MB | JS roh MB | timer cold | timer warm | kara cold | kara warm | timer Script cold | kara Script cold | timer Heap GC MB | kara Heap GC MB | kara Elemente |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline-repeat | 6.343 | 28.274 | 895.8 | 842.8 | 822.2 | 799.5 | 319.2 | 265.4 | 25.137 | 24.164 | 606 |
| A-story-removed | 4.675 | 21.314 | 773.8 | 827.2 | 740.0 | 715.3 | 301.6 | 274.9 | 21.892 | 20.932 | 600 |
| A2-renderer-direct | 4.689 | 21.374 | 839.3 | 862.9 | 1 051.4 | 777.1 | 317.0 | 266.2 | 21.963 | 20.960 | 606 |
| B-badges-removed | 6.089 | 27.131 | 817.8 | 777.9 | 845.3 | 758.1 | 262.3 | 212.3 | 22.873 | 22.072 | 172 |
| C-carousel-static | 6.292 | 28.117 | 912.1 | 877.2 | 808.4 | 849.2 | 303.8 | 263.3 | 24.642 | 23.678 | 606 |
| D-projects-removed | 6.310 | 28.141 | 904.6 | 844.5 | 838.8 | 854.3 | 303.6 | 277.8 | 24.980 | 24.045 | 596 |
| E-contributions-removed | 6.283 | 28.015 | 921.3 | 790.4 | 853.4 | 807.8 | 298.9 | 265.1 | 24.652 | 24.045 | 606 |
| F-images-disabled | 6.343 | 28.274 | 877.5 | 853.6 | 861.0 | 941.1 | 322.1 | 281.8 | 25.160 | 24.269 | 606 |
| G-header-only | 3.773 | 17.134 | 658.1 | 656.9 | 610.6 | 596.5 | 209.4 | 199.8 | 18.290 | 17.889 | 116 |
| H-neutral-not-found | 4.741 | 21.229 | 770.9 | 852.9 | 1 064.9 | 814.5 | 309.7 | 272.1 | 24.868 | 23.888 | 604 |

Iteration 0 kann Fast Refresh/Neukompilierung enthalten und dient nicht als Kausalvergleich. Kleine Unterschiede der Ladezeit liegen im beobachteten Streubereich; Payload-/Modulunterschiede sind stärker belegt. Variantenwirkungen überlappen und dürfen nicht addiert werden. G lässt den echten vollständigen Backend-Aggregator bestehen.

## SQL und Serialisierung

| Loader | SQL | Median 7 Läufe ms | Erster Lauf ms | Letzter Lauf ms | json.Marshal Median ms | DTO Bytes |
| --- | --- | --- | --- | --- | --- | --- |
| group-domain-projection | 2 | 2.623 | 3.098 | 0.536 | 0.015 | 3590 |
| group-new-subs | 8 | 2.458 | 4.834 | 0.759 | 0.016 | 2034 |
| member-kara | 20 | 3.344 | 3.522 | 2.981 | 0.042 | 2608 |
| member-timer | 21 | 15.771 | 26.976 | 5.314 | 0.165 | 10171 |
| member-type | 21 | 5.088 | 5.088 | 5.224 | 0.098 | 9146 |

Neue Tracer-Verbindung, vorbereitete Pläne wärmen während der Serie auf. HTTP wurde separat am bereits laufenden Backend gemessen. json.Marshal misst DTO-Serialisierung, nicht vollständig Handler-Mapping + Response-Envelope.

| SQL # | Codepfad | Median ms | Letzter Lauf ms | Zeilen | EXPLAIN Planning ms | EXPLAIN Execution ms |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | ResolvePublicMemberAccess | 0.265 | 0.137 | 1 | 0.088 | 0.017 |
| 1 | GetPublicMemberProfileByID | 0.407 | 0.141 | 1 | 0.148 | 0.032 |
| 2 | loadMemberships | 0.809 | 0.688 | 1 | 0.468 | 0.119 |
| 3 | loadPublicBadges | 0.132 | 0.093 | 2 | 0.050 | 0.022 |
| 4 | loadRoleVolumeCounts | 0.092 | 0.088 | 1 | 0.045 | 0.036 |
| 5 | loadContribProjectsCount | 0.235 | 0.211 | 1 | 0.499 | 0.171 |
| 6 | loadContribChronicleCount | 0.129 | 0.102 | 1 | 0.305 | 0.046 |
| 7 | loadContribArchivistCount | 0.186 | 0.184 | 1 | 0.314 | 0.136 |
| 8 | loadTotalPoints | 0.086 | 0.056 | 1 | 0.019 | 0.008 |
| 9 | loadBadgeProgress | 0.148 | 0.093 | 1 | 0.059 | 0.028 |
| 10 | loadContribProjectsCount | 0.208 | 0.189 | 1 | 0.473 | 0.165 |
| 11 | loadContribChronicleCount | 0.107 | 0.107 | 1 | 0.283 | 0.040 |
| 12 | loadContribArchivistCount | 0.162 | 0.162 | 1 | 0.299 | 0.133 |
| 13 | loadBadgeProgress | 0.128 | 0.080 | 1 | 0.038 | 0.013 |
| 14 | loadRoleVolumeCounts | 0.115 | 0.082 | 1 | 0.032 | 0.026 |
| 15 | loadCurrentProjects | 2.988 | 0.842 | 1 | 1.991 | 0.904 |
| 16 | loadCurrentProjectReleaseVersionsBatch | 1.539 | 0.779 | 13 | 0.704 | 0.657 |
| 17 | countCurrentProjects | 0.352 | 0.146 | 1 | 0.191 | 0.080 |
| 18 | loadKnownFor | 0.733 | 0.146 | 1 | 0.519 | 0.083 |
| 19 | loadLatestContributions | 3.480 | 0.538 | 3 | 2.967 | 0.604 |
| 20 | loadPreviousContributions | 1.185 | 0.096 | 0 | 1.019 | 0.043 |

## Navigation: gleiches Gruppendokument nach jedem Zyklus

| Versuch | Nodes vorher | Nodes nach 12 | Elemente vorher | Elemente nach 12 | Listener vorher | Listener nach 12 | Heap vorher MB | Heap nach 12 MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dev-member | 1185 | 15858 | 346 | 361 | 621 | 1551 | 17.542 | 28.150 |
| dev-group | 1185 | 5191 | 346 | 349 | 621 | 1194 | 17.538 | 22.143 |
| production-diagnostic-member | 466 | 15107 | 337 | 339 | 347 | 1100 | 3.813 | 8.384 |
| production-diagnostic-group | 465 | 4479 | 336 | 338 | 347 | 766 | 3.838 | 5.816 |
| production-eager-member | 466 | 1194 | 337 | 339 | 347 | 367 | 3.834 | 6.596 |
| production-no-auto-sizes-member | 464 | 1192 | 335 | 337 | 347 | 367 | 3.855 | 6.615 |

In allen Samples GC erzwungen. Member-Interventionen ändern ausschließlich Bildattribute im Browser; Seiten und Daten bleiben identisch. Vollständige Haltepfade: retainers.json.
