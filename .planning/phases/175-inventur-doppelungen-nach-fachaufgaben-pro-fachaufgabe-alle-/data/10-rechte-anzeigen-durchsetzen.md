# Fachaufgabe 10: Rechte anzeigen vs. Rechte durchsetzen — Capability-Infrastruktur-Inventur

**Quelle:** 175-CONTEXT.md D-02 #10, mit Schwerpunkt D-05. 174-HOTSPOTS.md hatte die Rechte-Resolution bereits als D-07 "False positive" (legitim getrennt, kein Duplikat) klassifiziert — diese Fachaufgabe prüft diese Einstufung nach UND sucht gezielt nach Aktionen, bei denen Anzeige- und Durchsetzungs-Pfad unterschiedliche Action-Konstanten verwenden (das BUG-174-02-Muster).
**Methode:** `permissions.go` (zentraler Resolver, `CanForFansubGroup`/`CanForReleaseVersion`/`RoleAllowsAction`), `effective_rights.go` (`ResolveGroupRights`), die Capability-Endpunkte (`app_auth_capabilities.go`, `admin_content_release_version_media_capabilities.go`), die Rollenkatalog-Infrastruktur (`role_catalog_handler.go`, `RoleCatalogProvider.tsx`) und `frontend/src/lib/api/permissions.ts` gelesen. Für eine Stichprobe von 9 Aktionen aus 4 Fachaufgaben wurde je ein Datei:Zeile-Beleg für Anzeige UND Durchsetzung verglichen.

---

## (a) UI-Flächen, die Capability-Endpunkte konsumieren

| Endpunkt | Root-Konsument | Datei:Zeile |
|---|---|---|
| `GET /api/v1/admin/fansubs/:id/capabilities` | `FansubEditAccessGate.tsx` — lädt EINMAL pro Fansub-Edit-Seitenaufruf, reicht `capabilities` als Prop an alle Unterabschnitte (Gruppenmedien-Review, Beiträge-Review, Mitglieder, Notizen, Release-Medien) weiter | `frontend/src/app/admin/fansubs/[id]/edit/FansubEditAccessGate.tsx:49` |
| `GET /api/v1/admin/release-versions/:versionId/capabilities` | `EpisodeVersionEditorPage.tsx` + `workspace/page.tsx` (siehe `data/03-release-bearbeiten.md`) | bereits in Fachaufgabe 3 belegt |
| `GET /api/v1/role-catalog/...` (Rollenkatalog, NICHT Rechte-Gate) | `RoleCatalogProvider.tsx`, root-geladen im App-Layout, konsumiert über `useRoleCatalog(context)` | `frontend/src/providers/RoleCatalogProvider.tsx:44-60` |

**Wichtige Abgrenzung:** Der Rollenkatalog (`RoleCatalogProvider`/`useRoleCatalog`) liefert ausschließlich Anzeige-Metadaten (Rollenname, Farbe, in welchen Kontexten eine Rolle wählbar ist) für Dropdowns — er ist KEIN Rechte-Gate und entscheidet nirgends "darf ich das sehen/tun". Die eigentlichen Anzeige-Rechte-Entscheidungen laufen ausschließlich über die beiden Capability-Endpunkte oben. Diese Trennung ist korrekt (kein Verwechslungsrisiko), weil beide UI-seitig unterschiedliche Typen (`RoleDefinitionOption` vs. `FansubGroupCapabilities`) verwenden.

---

## (b)/(c) Frontend-API-Funktionen und Backend-Bereitstellung

- `getFansubGroupCapabilities(fansubId)` — `frontend/src/lib/api/admin/fansub-members.ts:123-134`, ruft `GET /admin/fansubs/:id/capabilities` → `AppAuthHandler.GetFansubGroupCapabilities` — `backend/internal/handlers/app_auth_capabilities.go:44`, Route registriert in `backend/cmd/server/admin_routes.go:222`.
- `getReleaseVersionCapabilities(versionId)` — `frontend/src/lib/api/permissions.ts:15-21` → `AdminContentHandler.GetReleaseVersionCapabilities` — `backend/internal/handlers/admin_content_release_version_media_capabilities.go:25`.
- Zentraler Resolver für BEIDE Endpunkte: `permissions.Service.CanForFansubGroup`/`CanForReleaseVersion` (`backend/internal/permissions/permissions.go:518,624`), die intern auf `ResolveGroupRights` (`backend/internal/permissions/effective_rights.go`) und den In-Memory-Cache aus `LoadCache`/`roleAllows` (`permissions.go:383-397,942-950`) zurückgreifen. **Ein einziger Resolver für alle Anzeige- UND Durchsetzungs-Aufrufe** — es gibt keinen zweiten, unabhängig implementierten Rechte-Berechnungspfad.

---

## (d) Stichprobe: 9 Aktionen aus 4 Fachaufgaben — Anzeige-Konstante vs. Durchsetzungs-Konstante

| # | Aktion (Konstante) | Fachaufgabe | Anzeige (Datei:Zeile) | Durchsetzung (Datei:Zeile) | Gleicher String? |
|---|---|---|---|---|---|
| 1 | `ActionFansubGroupEdit` | Gruppenverwaltung (Fansub-Edit-Stammdaten) | `can_edit_group` ← `CanForFansubGroup(..., ActionFansubGroupEdit, ...)` — `app_auth_capabilities.go:56,242` | `requiredFansubGroupPatchActions` fügt `permissions.ActionFansubGroupEdit` hinzu (`fansub_groups.go:353,365`), geprüft in der Schleife `UpdateFansub` (`fansub_groups.go:270-280`) | **Ja** |
| 2 | `ActionFansubGroupEdit` (Zweitnutzung für Gruppenmedien-Review) | Prüfen & Freigeben (Fachaufgabe 4) | `can_review_group_media` ← `canEditGroup.Allowed` — `app_auth_capabilities.go:259` | `PatchFansubMediaReview`: `authorizationAction = permissions.ActionFansubGroupEdit` — `fansub_media_review_handler.go:382,397` | **Ja** (BUG-174-02-Fix bestätigt, siehe `data/04-*.md`) |
| 3 | `ActionReviewImageDecide` | Prüfen & Freigeben — Release-Bilder | `authorizedKinds`-Tabelle liefert `{ActionReviewImageDecide, ReviewKindImage}`, von `List`/`Counts`/`Detail` beim LADEN der Queue genutzt — `release_review_handler_authz.go:15-26` | `Decide` ruft **dieselbe** `authorizedKinds`-Funktion vor der Entscheidung auf — `release_review_handler.go:185` | **Ja** (strukturell identisch, da eine einzige Funktion beide Seiten bedient) |
| 4 | `ActionReviewTextDecide` | Prüfen & Freigeben — Release-Notizen | `CanReviewText: canReviewText.Allowed` — `app_auth_capabilities.go:171,260` UND dieselbe `authorizedKinds`-Tabelle wie #3 | `Decide`/`authorizedKinds`, identisch zu #3 | **Ja** |
| 5 | `ActionReleaseVersionMediaUpdate` | Release bearbeiten (Fachaufgabe 3) | `CanUpdateMedia: canUpdateMedia.Allowed` — `admin_content_release_version_media_capabilities.go:56,101`; zusätzlich `items[i].CanUpdate` in der Medienliste — `admin_content_release_version_media_permissions.go:228-231` | `PatchReleaseVersionMedia`: `CanForReleaseVersionMedia(..., permissions.ActionReleaseVersionMediaUpdate, relationID)` — `admin_content_release_version_media_patch.go:79` | **Ja** (BUG-174-04-Fix bestätigt) |
| 6 | `ActionReleaseVersionMediaReorder` | Release bearbeiten (Fachaufgabe 3) | `CanReorderMedia: canReorderMedia.Allowed` — `admin_content_release_version_media_capabilities.go:66,104` | `ReorderReleaseVersionMedia`: `CanForReleaseVersion(..., permissions.ActionReleaseVersionMediaReorder, versionID)` — `admin_content_release_version_media_reorder.go:47` | **Ja** |
| 7 | `ActionReleaseVersionMediaUpload` | Medien hochladen (Fachaufgabe 1) | `CanUploadReleaseMedia: canUploadReleaseMedia.Allowed` — `app_auth_capabilities.go:146,262` (Gruppen-Scope, `CanForFansubGroup`) | `UploadReleaseVersionMedia`: `CanForReleaseVersion(..., permissions.ActionReleaseVersionMediaUpload, versionID)` — `admin_content_release_version_media_upload.go:140` | **Ja, gleiche Aktion** — ABER unterschiedlicher Resolver-EINTRITTSPUNKT (`CanForFansubGroup` vs. `CanForReleaseVersion`). Beide münden letztlich in denselben `role_capabilities`-Cache-Eintrag für dieselbe Aktion; kein Anzeige/Durchsetzung-Mismatch, aber bewusst dokumentierter Scope-Unterschied (Gruppen-weite Vorschau-Anzeige vs. Release-Version-genaue Durchsetzung). |
| 8 | `ActionFansubGroupMembersManage` | Prüfen & Freigeben — Beiträge (Fachaufgabe 4) | `can_manage_members` — `ContributionsReviewSection.tsx:49`, Backend `app_auth_capabilities.go:86,249` | `ConfirmProposal`/`RejectProposal`/`ListProposals` — `contribution_review_handler.go:91,139,199` | **Ja** |
| 9 | `ActionFansubGroupHistoricalMembersLink` | Mitglieder einladen / Claims (Fachaufgabe 5) | `can_link_historical_members` — `app_auth_capabilities.go:101`; Dashboard-Hinweis `attachPendingClaimAttention` — `dashboard_me_handler.go:180-181` | `VerifyClaim`/`RejectClaim`/`ActivateClaim`/`ListClaims` — alle über `requireFansubPermission(c, permissions.ActionFansubGroupHistoricalMembersLink, ...)` — `member_claims_handler.go:118,142,167,192` | **Ja** |

**Ergebnis der Stichprobe: 9/9 Aktionen verwenden identische Anzeige- und Durchsetzungs-Konstanten.** Keine String-Abweichung im BUG-174-02-Muster gefunden. Aktion #7 zeigt eine bewusste, aber harmlose Scope-Differenz (Gruppen- vs. Versions-Resolver-Eintrittspunkt bei gleicher Aktion) — dokumentiert als Beobachtung, nicht als Befund, da beide Eintrittspunkte denselben Cache-Eintrag konsultieren und somit nicht divergieren können.

**Einordnung gegenüber 174-HOTSPOTS D-07:** Die bereits getroffene Einstufung "Rights Resolution: False positive" (ein zentraler Resolver, keine Duplizierung) wird durch diese Stichprobe bestätigt — nicht nur die Infrastruktur ist zentral, auch die tatsächlich in Produktionscode verwendeten Action-Konstanten bleiben über Anzeige und Durchsetzung hinweg identisch. 0 neue Befunde für `175-PERMISSION-MATRIX.md` aus dieser Stichprobe (ergänzt die bereits in `data/04-*.md` dokumentierten, ebenfalls konsistenten Befunde).

---

## (e) Datenhaltung

- **`role_capabilities`** (Tabelle, migrationsgepflegt) — eine Zeile pro (Rolle, Action); beim Server-Start vollständig in einen In-Memory-Cache geladen (`Service.LoadCache`, `permissions.go:383-397`). Laufzeitlesungen (`CanForFansubGroup` etc.) greifen NIE direkt auf die DB zu, sondern ausschließlich auf den Cache (`roleAllows`, `permissions.go:942-950`).
- **`role_definitions`** (separat, Rollenkatalog-Metadaten: Name, Farbe, Kontext) — beliefert NUR den Rollenkatalog (`role_catalog_handler.go`/`role_catalog_repository.go`), nicht den Rechte-Cache. Getrennte Tabelle für getrennten Zweck — legitim getrennt.
- **`fansub_group_member_permissions`**/Custom-Media-Permissions (`GetFansubGroupMediaPermissionsForAppUser`) — eine dritte, orthogonale Quelle für individuelle Medien-Ausnahmen pro Mitglied, additiv zu den rollenbasierten Capabilities (`app_auth_capabilities.go:184-192`, `hasAnyCustomMediaPermission`). Kein Rechte-Konflikt, da rein additiv (ODER-Verknüpfung) mit dem Rollen-Ergebnis.
- **Cache-Schicht:** modulweiter `cacheMu`-geschützter `loadedCache map[string][]Action` (`permissions.go`), beim Start einmalig befüllt; kein TTL, keine Laufzeit-Invalidierung außer explizitem `ReloadCache`-Aufruf (`permissions.go:932-936`).

---

## (f) Beobachtbares Verhalten bei Cache-Veralterung

- **Startup-Abbruch (fail-closed):** `validateCapabilityCatalog` bricht den Server-Start ab, wenn eine bekannte Action-Konstante weder einer Rolle im DB-geladenen Cache zugeordnet noch als `standaloneAction` deklariert ist — `permissions.go:402-416` ("`permission cache: Action %q fehlt in role_capabilities und ist keine standalone-Action — Startup abgebrochen`"). Dies ist exakt das in `174-HOTSPOTS.md` Category B dokumentierte Verhalten; bestätigt am aktuellen Code weiterhin vorhanden.
- **Zusätzlicher Start-Gate:** `validateMembershipBaselineRegistryPresence` bricht ebenfalls fail-closed ab, wenn der reservierten Pseudo-Rolle `RoleMembershipBaseline` eine der drei Baseline-Actions fehlt — `permissions.go:435-446`.
- **Laufzeit-Veralterung:** Da der Cache nur beim Start (oder explizitem `ReloadCache`) neu geladen wird, würde eine nachträgliche DB-Änderung an `role_capabilities` ohne Neustart/Reload NICHT wirksam — ein Admin, der über den Rollen-Matrix-Editor (`/admin/roles`, Phase 138) eine Capability ändert, braucht laut Code-Pfad einen expliziten `ReloadCache`-Aufruf, um die Änderung laufzeit-wirksam zu machen (nicht in dieser Phase nachvollzogen, ob der Matrix-Editor-Handler `ReloadCache` nach jeder Mutation aufruft — Hinweis für eine künftige Phase, falls nicht).

---

## Zusammenfassung (reproduzierbar per `scripts/count-10-rechte-anzeigen-durchsetzen.sh`)

- **Capability-Endpunkte inventarisiert: 2** (`/admin/fansubs/:id/capabilities`, `/admin/release-versions/:versionId/capabilities`)
- **Untersuchte Aktionen (Stichprobe): 9**
- **Fachaufgaben abgedeckt: 4** (Gruppenverwaltung, Prüfen & Freigeben, Release bearbeiten, Mitglieder/Claims — zusätzlich Medien hochladen als Scope-Beobachtung)
- **Gefundene String-Abweichungen Anzeige vs. Durchsetzung: 0**
- **Zentraler Resolver bestätigt: 1** (`permissions.Service`, kein zweiter unabhängiger Rechte-Pfad)
