---
phase: quick-260914-ddc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/media/crop/Team4sCropper.tsx
  - frontend/src/components/media/crop/Team4sCropper.test.tsx
autonomous: true
requirements: []
---

<objective>
Avatar- und Banner-Zuschnitt auf /me/profile direkt nach der Dateiauswahl sichtbar machen, auch wenn Profil, Aktivität oder Account aktiv sind. Kein zusätzlicher Wechsel zu Sichtbarkeit.
</objective>

<read_first>
AGENTS.md; AI-HANDOFF.md; .planning/STATE.md; .planning/ROADMAP.md;
docs/engineering/implementation-contract.md; docs/frontend/auth-api-client.md;
docs/frontend/ui-system.md; docs/agent-guidelines-ui.md;
frontend/src/app/me/profile/page.tsx und page.module.css;
frontend/src/app/me/profile/components/MemberAvatarCard.tsx und ProfileBackgroundCard.tsx;
frontend/src/components/media/crop/AvatarCropDialog.tsx;
frontend/src/components/media/crop/Team4sCropper.tsx, Team4sCropper.module.css und Tests;
frontend/src/components/ui/Modal.tsx; frontend/src/components/admin/MediaUpload.tsx und Tests.
</read_first>

<context>
Ausgangscommit d28dd461. Nur unzusammenhängende untracked frontend/scripts/shot2.mjs vorhanden; bleibt unangetastet.
Beleg: Header klickt Input-Refs in dauerhaft gemountetem Visibility-Panel. Ausgeblendetes Panel hat opacity:0, overflow:hidden und aria-hidden. Beide Bildkarten rendern Cropper darin inline. Der bereits gemountete Dialog wird erst bei Tabwechsel sichtbar.
Reuse: Team4sCropper ist die gemeinsame Dialoggrenze für AvatarCropDialog, ProfileBackgroundCard und Admin MediaUpload. Das vorhandene Modal nutzt createPortal nach document.body. Diesen Mechanismus im spezialisierten Cropper übernehmen; kein Ersatz seiner fachlichen Crop-/Exportlogik oder seines Layouts.
API, Uploadtransport, Formzustand, Berechtigungen und Datenverträge bleiben in bestehenden Besitzern. Kein Backend-/Schema-/Datenänderungsbedarf.
</context>

<tasks>
<task type="auto">
<name>1. Ursache als Regression beweisen und gemeinsame Dialoggrenze korrigieren</name>
<files>Team4sCropper.tsx, Team4sCropper.test.tsx</files>
<action>Test für Dialog unter verborgenem Tab zuerst rot ausführen. Bestehendes Portal-Pattern mit Server-Guard verwenden. Fokus beim Schließen zurückgeben. Bestehende Crop- und Uploadcallbacks unverändert lassen.</action>
<verify>Avatar und Banner außerhalb des aria-hidden-Containers zugänglich; Fokus hinein, Tab-Trap, Escape/Abbrechen, Unmount-Cleanup; bestehender Exporttest grün.</verify>
<done>Kein Tabwechsel erforderlich; Cropper-Konfiguration und Export erhalten.</done>
</task>
<task type="auto">
<name>2. Verbraucher und Browserablauf verifizieren; Quick-Task dokumentieren</name>
<files>Quick-Task Evidence/Script/Summary und STATE.md</files>
<action>Profil-/Banner-/Avatar-/Admin-Uploadtests einschließlich Refresh-only ausführen. Echte Profilroute mit isolierten gemockten Daten in Browserfixtures auf Mobile/Tablet/Desktop aus allen vier Tabs öffnen, abbrechen und erneut öffnen. Keine echten Schreibrequests. Lint, Typecheck, isolierten Produktionsbuild und diff-check ausführen; bekannte Baselinefehler getrennt führen.</action>
<verify>Dialog sichtbar, ausgewählter Tab erhalten, kein Dialog unter aria-hidden; Fokus und Zoom/Reset bedienbar, Abbrechen schreibt nichts. Keine neuen Lint-/Typecheckfehler.</verify>
<done>Codecommit und nachvollziehbare Evidence/Summary/STATE-Aktualisierung, kein Roadmap- oder Human-UAT-Sign-off.</done>
</task>
</tasks>

<threat_model>
Kein neuer Authmechanismus. Vorhandenen Refresh-only-Profiltest mitführen; Upload/Recrop bleibt zentraler API-Client. Browserfixtures verwenden synthetische Tokens, intercepten Requests und verbieten persistierende Schreibzugriffe. Keine Profildaten oder Runtime-Medien ändern. Portaldialog behält Fokusfalle und Escape; Rückkehr zum Auslöser prüfen.
</threat_model>

<verification>
Gezielte Vitest-Suite; isolierter Browserlauf bei 390/768/1440 px; Shared-Browser-Route prüfen (derzeit Anmeldung erforderlich); Lintdiagnostik mit gespeicherter Baseline vergleichen; Typecheck; Produktionsbuild außerhalb des Devserver-.next; git diff --check.
Bekannte Baseline: 13 Lintfehler/331 Warnungen, Next AnimePageProps.searchParams-Typefehler, ungültiger formatEditLoadError-Pageexport im Build.
</verification>

<output>
260914-ddc-SUMMARY.md mit Commits, Tests, Browserbelegen und Grenzen. STATE Quick Tasks Completed ergänzen. Phasen 156–159 und deren Human-UAT unverändert. Quick-Workflow im selben Agent ausgeführt: kleiner gekoppelter Fix ohne sinnvolle unabhängige Delegationsaufgabe.
</output>
