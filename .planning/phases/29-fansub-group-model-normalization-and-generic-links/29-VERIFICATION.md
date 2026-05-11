---
phase: 29-fansub-group-model-normalization-and-generic-links
verified: 2026-05-11T00:00:00Z
status: passed
score: sc1-sc2-sc4-sc5-passed-sc3-redesign-deferred
re_verification: false
---

# Phase 29: Fansub Group Model Normalization And Generic Links — Verification

**Phase Goal:** Fansub-Gruppen auf kanonisches Profilmodell konsolidieren, generische Community-Links ueber fansub_group_links verwalten, Kollaborationen explizit administrierbar machen, Legacy-Doppelfelder in Cleanup-Pfad ueberfuehren.

**Verified:** 2026-05-11
**Status:** passed (SC1, SC2, SC4, SC5 live und bestaetigt — SC3 als impraktikabel eingestuft, wird durch Phase 39 ersetzt)

## UAT Ergebnisse

| SC | Kriterium | Status |
|---|---|---|
| SC1 | Fansub-CRUD auf kanonichem Profil, keine neuen Abh. auf closed_year/history_description | bestanden |
| SC2 | Community-Links ueber fansub_group_links (website, discord, twitter, github, irc) | bestanden (UAT Test 1+2, 2026-05-11) |
| SC3 | Kollaborationsgruppen mit Mitgliedsgruppen im Admin pflegbar | Redesign noetig — Phase 39 |
| SC4 | Fansub-Create/Edit zeigt generische Linkzeilen, add/edit/delete | bestanden (UAT Test 1+2, 2026-05-11) |
| SC5 | Legacy-Doppelfelder haben dokumentierten Cleanup-Pfad | bestanden (kein aktiver Regressionsbefund) |

## Warum SC3 nicht passt

Das aktuelle Design verlangt:
1. Admin erstellt manuell eine neue Fansub-Gruppe mit group_type='collaboration'
2. Admin benennt sie (z.B. "AnimeOwna x Project Messia")
3. Admin pflegt Mitgliedsgruppen in einem separaten Tab

UAT-Feedback 2026-05-11: Bei 10 kollaborierenden Gruppen an einer Episode ist dieser Workflow
unzumutbar. Ein Name wie "GroupA x GroupB x ... x GroupJ" ist sinnlos.
Das eigentliche Nutzerbedurfnis ist: einem Release direkt mehrere Gruppen zuweisen, ohne
eine Zwischen-Entitaet manuell anlegen zu muessen.

SC3 wird nicht als UAT-Pass gewertet. Das Problem wird durch Phase 39 neu geloest
(direkte Multi-Gruppen-Zuweisung am Release, ohne Kollaborations-Entitaet als Zwischenschritt).

## Technischer Stand SC3

Das Feature ist technisch implementiert (Backend-Endpunkte, Frontend-Tab) und funktioniert korrekt
nach seiner Spec — loest aber das falsche Problem. Der Code bleibt vorerst im System,
Phase 39 ersetzt die UX-Ebene.
