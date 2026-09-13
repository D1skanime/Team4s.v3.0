# 157-08 – Projekt-Member: Release-Historie entfernt

Stand: 13.09.2026. Umsetzung im kanonischen Linux-Repository `/home/d1sk/team4s`.

## Ergebnis

Auf `/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type` zeigt die Seite Rollen, projektbezogene Texte/Notizen und Medien. Die Sektion „Mitwirkung an Releases“, der Release-Tab und der Release-Zähler sind vollständig entfernt. Der ausschließlich dafür verwendete Frontend-API-Helper, Release-DTO, die Karten-/Sektionskomponenten und deren Styles wurden entfernt. Die Summary führt keine zusätzliche Release-Zählabfrage mehr aus. Backend-DTO, TypeScript und OpenAPI wurden gemeinsam angepasst.

Release-Daten und Tabellen wurden nicht verändert. Die fachlichen Release-Verknüpfungen für Rollen, Zugriffsprüfung, Notizen, Medien und die Folgenmetrik bleiben erhalten. Der separat dokumentierte Backend-Listenendpunkt bleibt verfügbar, wird von dieser Seite aber nicht mehr abgefragt. Das allgemeine Memberprofil wurde nicht verändert.

## Geänderte Abschnitte

Seitenaufbau: Breadcrumb → Hero mit Rollen und Beitragsmetriken → zwei Navigationseinträge → Texte/Notizen und Medien. Ohne öffentliche Notizen/Medien erscheint der vorhandene Leerzustand; Rollen bleiben im Hero sichtbar.

```tsx
const isEmpty = counts.notes + counts.media === 0
// Navigation:
{ id: 'texte', label: 'Texte & Notizen', key: 'notes' }
{ id: 'bilder', label: 'Bilder & Medien', key: 'media' }
```

Live-Summary nach der Änderung:

```json
{"roles":1,"notes":12,"media":2,"episodes":13}
```

`GetSummary` lädt weiterhin Identität, Rollen und die notwendigen Notiz-/Medien-/Folgenzahlen. Der Aufruf und die Methode `countReleases` wurden entfernt.

## Geänderte Dateien dieses Folgeauftrags

Alle folgenden Pfade relativ zu `/home/d1sk/team4s`:

- `frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberHero.test.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.test.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberSummary.tsx` – Release-Eintrag im bisherigen Summary-Baustein entfernt, passend zum reduzierten DTO.
- `frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.test.tsx`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/api.auth-refresh.test.ts`
- `frontend/src/lib/roleCatalog.accessibility.test.ts` – ausschließlich Tests der gelöschten CSS-Komponente entfernt.
- `frontend/src/types/projectMember.ts`
- `frontend/scripts/shot-projectmember.mjs`
- `backend/internal/repository/project_member_public_repository.go`
- `backend/internal/repository/project_member_public_repository_test.go`
- `backend/internal/handlers/project_member_public_handler_test.go`
- `shared/contracts/openapi.yaml`
- `DECISIONS.md`
- `.planning/phases/157-projekt-memberseite-visuelles-referenzdesign/157-08-PLAN.md`
- `.planning/phases/157-projekt-memberseite-visuelles-referenzdesign/157-08-SUMMARY.md`

Entfernte, ausschließlich vom Release-Bereich verwendete Dateien:

- `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx`
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.module.css`
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx`

Die bereits vor diesem Folgeauftrag vorhandenen Änderungen aus 157-07 wurden beibehalten.

## Prüfungen

- Regression zunächst rot: bisheriger Release-Zähler, Sektion, Leerzustand und Summary-Response widersprachen den neuen Erwartungen. Anschließend grün.
- `docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs/projectMember src/app/fansubs/ src/lib/api.auth-refresh.test.ts src/lib/roleCatalog.accessibility.test.ts`: **120 Tests bestanden**, 19 Dateien. Enthält Notes/Media-Pagination, Medienansicht, Routing, verbleibende Navigation sowie zentrale Auth-Refresh-Regressionen.
- `docker compose exec -T team4sv30-frontend npm run typecheck`: bestanden.
- ESLint auf allen geänderten bzw. neuen TS-/TSX-/MJS-Dateien, `--max-warnings 0`: bestanden.
- `docker compose exec -T team4sv30-backend go test ./internal/handlers ./internal/repository -run 'ProjectMember|FansubProjectResolver' -count=1`: bestanden. Optionale Phase-155-DB-Tests ohne dedizierte DSN übersprungen; für 157-07 separat bereits gegen dedizierte DB ausgeführt.
- `docker compose exec -T team4sv30-backend go build ./...`: bestanden.
- Frontend-Build im isolierten `.next`-Volume: Bundling erfolgreich; bestehender Next.js-Exportfehler siehe unten.
- `git diff --check`: bestanden; Diff auf fachlich erhaltene Release-Joins und ausschließlich entfernte Zählung geprüft.
- Laufende API: `/api/v1/anime/1/group/1/members/type` enthält nur `roles`, `notes`, `media`, `episodes` in `counts`.
- Gemeinsamer In-App-Browser: Projekt-Member-Seite neu geladen; ausschließlich zwei Tabs sichtbar; Medien-Tab und Medienansicht erfolgreich geöffnet, wieder geschlossen und zu Notizen zurückgekehrt.
- Ergänzender bestehender Screenshot-Runner: 390×844, 768×1024, 1440×900. Jeweils HTTP 200, **0 ProjectMember-Releases-Requests**, keine Release-Sektion/-Navigation/-Metrik, kein horizontaler Überlauf, keine normalen Konsolenfehler. Hero-Axe-Prüfung ohne Verstöße. Desktop und Mobile visuell geprüft.

## Vorhandene Einschränkungen

Der vollständige Frontend-Build scheitert an `frontend/src/app/admin/anime/[id]/edit/page.tsx`: `formatEditLoadError` ist kein zulässiger Next.js-Page-Export. Bereits vor dieser Änderung vorhanden und in 157-07 gegen HEAD bestätigt. Die durch den Build erzeugte Änderung an `next-env.d.ts` wurde wiederhergestellt.

Der globale Lint-Lauf aus 157-07 hatte 13 Fehler und 331 Warnungen in unveränderten Dateien; der auf die geänderten Dateien begrenzte Lint-Lauf dieses Folgeauftrags ist sauber. Ein bestehender Test-Mock auf `/fansubs` meldet eine React-Warnung zu `unoptimized`; Tests bestehen.

Keine Migrationen, Datenänderungen oder neuen API-Endpunkte. Kein Commit oder Push durchgeführt.
