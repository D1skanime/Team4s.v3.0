# WORKING_NOTES

## Current Workflow Phase
- Praktisch lief heute ein breiter Follow-through-Slice über Fansub-Admin, Release-Version-Media und die Vorbereitung des nächsten Roadmap-Blocks.
- Phase 41 ist dokumentarisch weitgehend saubergezogen; Phase 42 wurde bewusst hinter Phase 43 bis 48 geschoben.

## Useful Facts To Keep
- `http://localhost:3000` war heute der verlässlichste Frontend-Stand für UAT.
- Für Live-Prüfung des Release-Version-Media-Flows lief zusätzlich ein lokales Backend auf `:8092` mit Bypass-Kontext.
- Playwright funktioniert auf diesem Windows-Host zuverlässig mit installiertem `msedge`, nicht mit dem standardmäßigen gebündelten Chromium.
- Der verifizierte Test-Upload landete hier:
  - `release_version_media.id = 20`
  - `media_assets.id = 112`
  - Pfad: `C:\Users\admin\Documents\Team4s\media\release-version\62\5cc20f1f-9d27-4e73-b0a5-4dd9f15c5489\`
- Die Media-API für Release-Versionen nutzt weiter sauber die bestehende Kette:
  - `media_assets`
  - `media_files`
  - `release_version_media`
- `Tags / Aliase` und `Community-Links` sind jetzt Teil von `Grunddaten`; die alten Extra-Reiter dafür sind nicht mehr die Zielstruktur.
- `Description / History` ist fachlich entfernt und soll nicht wieder auftauchen.
- TipTap-Bilder bleiben ein später eigener Slice und sollen erst lokal/temporär im Editor leben, dann beim Speichern durch den bestehenden Uploader gehen.

## Verification Memory
- 2026-05-16: Playwright-Live-UAT bestätigt `previewCount = 2` nach Auswahl + Drop im Release-Media-Tab.
- 2026-05-16: echter Upload via API liefert `status=ready`, `media_asset_id=112`, `release_version_media_id=20`.
- 2026-05-16: List-API liefert `thumbnail_url` und `original_url` für denselben Upload zurück.
