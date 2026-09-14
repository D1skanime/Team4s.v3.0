---
phase: quick-260914-ddc
plan: 01
status: complete
completed: 2026-09-14
commit: 8dc5c8fef17d5cb6bd4849d81dbcd533509d6da8
---

# Quick 260914-ddc – Profil-Bilddialoge aus jedem Tab

## Ergebnis und Ursache

Auf `/me/profile` öffnen Avatar-Pencil und „Banner ändern“ nach der Dateiauswahl den bestehenden Zuschnittdialog direkt, unabhängig vom aktiven Tab. Ein Wechsel zu „Sichtbarkeit“ ist nicht mehr erforderlich. Fokus kehrt beim Schließen zum Auslöser zurück.

Header-Buttons starten versteckte Datei-Inputs in dauerhaft gemounteten Bildkarten im Visibility-Panel. Das inaktive Panel besitzt `opacity:0`, `overflow:hidden`, `pointer-events:none` und `aria-hidden`. Der zuvor inline gerenderte Cropper erbte diese Unsichtbarkeit. Das erklärt exakt den beschriebenen verzögerten Dialog beim Tabwechsel.

Der gemeinsame `Team4sCropper` nutzt jetzt dasselbe `createPortal(..., document.body)`-Pattern mit Document-Guard wie `components/ui/Modal.tsx`. Seine Crop-Konfiguration, Fokusfalle, Export- und Fehlerlogik bleiben erhalten. Kein automatischer Tabwechsel, keine doppelte Bildkarte und kein zweiter Uploadpfad. Der spezialisierte Cropper wurde nicht vollständig auf Modal umgebaut, damit sein vorhandenes Layout unverändert bleibt.

## Commits und Dateien

- Ausgang: `d28dd461f2b8f158072527048175487ef6a9b0c8`.
- Implementierung und Regressionstests: `8dc5c8fef17d5cb6bd4849d81dbcd533509d6da8`.
- Runtime: `frontend/src/components/media/crop/Team4sCropper.tsx` – Portal und Fokusrückgabe.
- Tests: `frontend/src/components/media/crop/Team4sCropper.test.tsx` – verborgene Vorfahren für Avatar/Banner, Fokusfalle, Escape/Abbrechen, erneutes Öffnen und Object-URL-Cleanup.
- Dokumentation: dieser Quick-Ordner mit PLAN, SUMMARY, Browser-/Build-Prüfskripten, JSON-Ergebnissen und sechs Screenshots; `.planning/STATE.md` Quick-Task-Zeile und aktuelle Aktivität.
- Backend, Verträge, Styles und Datenbank: keine Änderungen.

## Consumerprüfung

| Bestehender Verbraucher | Unverändertes Verhalten |
| --- | --- |
| AvatarCropDialog → MemberAvatarCard | Kreis, 512×512 PNG, Original+Zuschnitt; animierte GIF/WebP weiter im vorhandenen Bypass |
| ProfileBackgroundCard | Rechteck, 1920×384 JPEG, bestehender Original-/Uploadpfad |
| Admin MediaUpload | Gemeinsamer Cropper für rasterbasierte Uploads, bestehende Ownership und Callbacks |

Zentrale Session-/Upload-Infrastruktur nicht geändert. Der bestehende öffentliche Avatar-Source-Fetch und der API-Client für Background-Source wurden nicht angefasst. Keine neuen Auth-, Medien- oder DTO-Regeln.

## Verifikation

| Check | Ergebnis |
| --- | --- |
| Regression vor Fix | 3 neue Tests rot, 2 vorhandene grün; Dialog durch aria-hidden-Vorfahren nicht zugänglich |
| Gezielte Vitest-Suite | **7 Dateien / 81 Tests bestanden** |
| Auth | Bestehender Refresh-only-Profilfall sowie tokenfreie Upload/API-Grenzen in obiger Suite bestanden |
| Browser | **24/24 Fälle bestanden**, jeweils zweimal geöffnet, **0 Schreibrequests**, **0 Page-Errors** |
| Typecheck | Bestehender `.next/dev/types/app/anime/page.ts` / AnimePageProps.searchParams-Fehler; Log exakt identisch zur vorherigen Baseline |
| Lint | 13 bestehende Fehler / 331 Warnungen; vollständige Diagnose-Multimenge identisch zur Baseline, 0 neue/entfernte Diagnosen |
| Produktionsbuild isoliert | Webpack-Kompilierung erfolgreich (20,1 s), dann bestehender ungültiger `formatEditLoadError`-Export in `admin/anime/[id]/edit/page.tsx` |
| git diff --check | Bestanden |

Vitest-Befehl (im kanonischen Repository):

```sh
docker exec -w /app team4sv30-frontend npx vitest run   src/components/media/crop/Team4sCropper.test.tsx   src/components/media/crop/AvatarCropDialog.test.tsx   src/components/media/crop/mediaCropA11y.test.ts   src/app/me/profile/page.test.tsx   src/app/me/profile/components/ProfileBackgroundCard.test.tsx   src/components/admin/MediaUpload.test.tsx   src/lib/api.no-token-boundary.test.ts --reporter=dot
```

Der Admin-MediaUpload-Test meldete eine bestehende `act(...)`-Warnung. Keine Testfehler. Lint- und Typecheck-Baseline: `docs/audits/2026-09-14-project-hero-without-card/`; neue rohe Logs sind lokal vorhanden, gemäß bestehender Git-Ignore-Regel nicht versioniert. `lint-comparison.json` hält das Vergleichsergebnis fest.

## Browserbelege

Route: http://127.0.0.1:3300/me/profile (Linux-Prüfung: http://192.168.235.196:3000/me/profile).

Die echte gerenderte Profilroute wurde mit synthetischer Session und abgefangenen API-Antworten geprüft. Alle nicht lesenden HTTP-Methoden wurden blockiert und gezählt; keine echten Profildaten gelesen oder geschrieben. Statisches blaues Testbild lokal im Speicher erzeugt. Die vorhandenen Daten bleiben unverändert.

| Viewport | Tabs × Bildarten | Dokumentbreite | Belege |
| --- | --- | --- | --- |
| 390×844 | Profil/Sichtbarkeit/Aktivität/Account × Avatar/Banner | 390 px | [Avatar](390-avatar.png), [Banner](390-banner.png) |
| 768×1024 | dieselben 8 Fälle | 768 px | [Avatar](768-avatar.png), [Banner](768-banner.png) |
| 1440×900 | dieselben 8 Fälle | 1440 px | [Avatar](1440-avatar.png), [Banner](1440-banner.png) |

Pro Fall: Header-Button öffnet Dateiauswahl; Dialog sichtbar und ohne verborgenen Vorfahren; Fokus im Dialog; Übernehmen aktiv; Zoom und Reset bedienbar; Abbrechen entfernt Dialog und gibt Fokus zurück; identische Datei erneut auswählbar; Escape schließt; ursprünglicher Tab bleibt ausgewählt. Avatar auf Mobile und Banner auf Desktop zusätzlich visuell begutachtet. Messwerte: [browser-results.json](browser-results.json).

Reproduktion:

```sh
docker exec -i -w /app team4sv30-frontend node < .planning/quick/260914-ddc-profile-image-dialogs/browser-check.cjs
docker exec -i -w /app team4sv30-frontend node < .planning/quick/260914-ddc-profile-image-dialogs/build-check.cjs
```

Browserartefakte entstehen im Frontendcontainer unter `/tmp/team4s-quick-260914-ddc`; Build verwendet und entfernt nur einen eigens angelegten, geprüften `/tmp/team4s-quick-ddc-build-*`-Ordner. Das Devserver-`.next` wurde nicht für den Build verwendet.

## Grenzen / offene Human-UAT

- Der Codex-In-app-Browser zeigte auf der echten Profilroute „Anmeldung erforderlich“. Keine authentifizierte Nutzer-UAT behauptet; Browsernachweis oben basiert auf isolierten Fixtures.
- Kein echter Upload zum Nutzerkonto ausgeführt. Vorhandene Upload-/Fehlerpfade werden durch die gezielte Suite abgedeckt.
- Globaler Lint/Typecheck/Build bleiben wegen exakt benannter Altfehler rot; kein Teil dieses kleinen UI-Fixes.
- Phasen 156–159 und offene Human-UAT-Punkte wurden nicht geschlossen oder überschrieben. Keine neue Phase oder Roadmapänderung.
- `frontend/scripts/shot2.mjs` blieb unangetastet. Keine unautorisierten Produkt-, Schema-, Daten- oder Scopeänderungen; keine Service-Neustarts.

GSD-Quick wurde im selben Agent ausgeführt, da dieser kleine gekoppelte Fix keine sinnvolle unabhängig delegierbare Arbeit benötigte. Plan, Red/Green-Beweis, technische Verifikation und getrennte Code-/Dokumentationscommits sind erhalten.
