# Team4s API-Verträge

## Zweck

Dieses Dokument legt fest, wie API-Verträge für Team4s gepflegt werden. Es ist der Workflow-Leitfaden für Agenten, bevor Backend-Handler, Frontend-API-Helfer, DTO-Typen, gemeinsame OpenAPI-Dateien oder UI-Verhalten geändert werden, das von API-Antwortformen abhängt.

Das Ziel ist, Vertrags-Drift zu verhindern: Backend, Frontend-Helfer, UI-Zustandsbehandlung und gemeinsame Vertragsdateien müssen dasselbe Verhalten beschreiben.

## Vertragsquellen

Diese Quellen in dieser Reihenfolge nutzen:

1. `shared/contracts/openapi.yaml` - kanonischer, übergreifender OpenAPI-Vertrag.
2. Domänenspezifische YAML-Dateien neben `openapi.yaml` unter `shared/contracts/`, zum Beispiel `admin-content.yaml`, `admin-capabilities.yaml`, `anime-backdrops.yaml`, `anime-detail.yaml`, `anime-list.yaml`, `asset-stream.yaml`, `auth.yaml`, `comments.yaml`, `contributions.yaml`, `episodes.yaml`, `episode-versions.yaml`, `fansubs.yaml` und `watchlist.yaml` - fokussierte Verträge für den jeweiligen Bereich, soweit vorhanden.
3. Backend-Handler-, Service-, Repository- und Validierungscode - Laufzeit-Wahrheit, wenn Verträge veraltet sind.
4. `frontend/src/types/*` - Frontend-DTOs und Antwort-/Request-Formen.
5. `frontend/src/lib/api.ts` und feature-lokale API-Helfer-Dateien - Browser- und Server-API-Aufrufstellen.
6. Domänen-Architekturdokumente, insbesondere `docs/architecture/db-schema-fansub-domain.md` und `docs/architecture/db-runtime-authority-map.md`.

Wenn diese Quellen widersprechen, lange genug anhalten, um den Laufzeit-Eigentümer zu identifizieren, und dann entweder den Vertrag aktualisieren oder die Abweichung dokumentieren. Nicht stillschweigend eine neue Form im Seiten-Code wählen.

## Verbindlicher Agenten-Workflow

Vor einer Änderung des API-Verhaltens:

1. Endpoint, Methode, Request-Body, Response-Body, Auth-Anforderung und Eigentümer-Dateien identifizieren.
2. Die relevante gemeinsame Vertrags-YAML und das bestehende Frontend-DTO/-Helfer lesen.
3. Backend-Validierung, Handler-Statuscodes und Fehler-Payloads prüfen.
4. Entscheiden, ob die Änderung additiv, breaking oder ein Bugfix ist.
5. Den gemeinsamen Vertrag, Backend-Code, Frontend-DTOs und API-Helfer gemeinsam aktualisieren, wenn sich das Verhalten ändert.
6. Fokussierte Tests hinzufügen oder aktualisieren, die den Vertrag von beiden Seiten belegen, soweit machbar.
7. Die engsten relevanten Prüfungen plus `git diff --check` ausführen.

## Endpoint-Vertrags-Checkliste

Jeder neue oder geänderte Endpoint muss Folgendes haben:

- Methode und Pfad.
- Auth-Anforderung und Backend-Berechtigungs-Eigentümer.
- Pfad-/Query-/Body-Parameter mit Pflicht-/Optional-Status.
- Erfolgs-Status und Response-Body.
- Fehler-Status und Response-Body-Form.
- Frontend-Helfer-Eigentümerschaft.
- Frontend-DTO-Eigentümerschaft.
- Tests oder einen expliziten Grund, warum Tests nicht machbar sind.

## Frontend-Regeln

- Normale Browser-Aufrufer müssen zentrale API-Helfer statt ad-hoc authentifizierter `fetch`-Aufrufe nutzen.
- UI-Komponenten dürfen keine undokumentierten Response-Varianten parsen.
- DTO-Ergänzungen müssen explizit in `frontend/src/types/*` oder der lokal typisierten API-Stelle erfolgen.
- Statusbehandlung wie `409`-Redirect-/Konflikt-Verhalten muss im Helfer, der den Aufruf besitzt, dokumentiert und getestet sein.
- Keine Token-Parameter, Bearer-Konstruktion oder direkten Auth-Cookie-Lesevorgänge außerhalb der dokumentierten Auth-Grenze hinzufügen.

## Backend-Regeln

- Backend-Handler bleiben maßgeblich für Validierung, Berechtigungsprüfungen und Mutations-Umfang.
- Response-Payloads dürfen Release-, Fansub-, Medien- oder Mitglieds-Daten nicht der falschen Domänen-Entität zuordnen.
- Fehler-Payloads müssen die dokumentierte Projektform nutzen und deutsche, nutzerseitig sichtbare Meldungen erhalten, wenn sie die UI erreichen.
- Neue Endpoints müssen bestehende Service-/Repository-Stellen wiederverwenden, sofern keine dokumentierte Entscheidung eine neue Stelle begründet.

## Vertragstests

Fokussierte Tests nahe am Eigentümer bevorzugen:

- Backend-Handler-/Service-Tests für Statuscodes, Validierung, Berechtigungsverhalten und Response-Payload.
- Frontend-API-Helfer-Tests für Request-Payload-Konstruktion, Response-Parsing und Non-200-Zweige.
- UI-Tests nur, wenn der Screen bedeutsamen Zustand oder an Response-Varianten gebundene Texte hat.

Bei reinen YAML-Vertragsänderungen ist `git diff --check` die Mindestprüfung. Bei Laufzeitänderungen die relevanten Frontend-/Backend-Tests ausführen.

## Umgang mit Drift

Wenn Implementierung und Vertrag widersprechen:

1. Identifizieren, welche Quelle heute laufzeit-maßgeblich ist.
2. Die veraltete Seite korrigieren, wenn das beabsichtigte Verhalten klar ist.
3. Wenn das beabsichtigte Verhalten nicht klar ist, anhalten und die Abweichung als Risiko oder Entscheidung dokumentieren.
4. Keinen zweiten Helfer, keine zweite Route und keine zweite DTO-Familie erstellen, um die Abweichung zu umgehen.

## Frontend-Bilddarstellungs-Auslieferung (Phase 159)

Dies ist ein beabsichtigter Oberflächen-Split: Das Backend-GET /api/v1/media/files/{filename}
liefert weiterhin sein maßgebliches Original und ignoriert display_width. Das Next-
Frontend besitzt den untenstehenden additiven Darstellungs-Vertrag, entfernt diese
Query vor dem Aufruf des bestehenden festen internen API-Proxys und transformiert die
zurückgegebenen Rasterbytes. Die OpenAPI-media-files-Operation bleibt der maßgebliche
Backend-Original-Vertrag; ihre x-frontend-display-Metadaten verweisen hierher. Kein
Backend-Resize-Parameter wird dadurch impliziert.

| Frontend-Eigentümer | Opt-in GET- und HEAD-URL | Maßgebliche Quelle |
| --- | --- | --- |
| Covers-Kind-Route | /covers/display/{filename}?display_width=512 | Bestehende public/covers-Basisnamen-Auflösung |
| Bestehende lokale Medien-Route | /media/anime/{path}?display_width=512 | Bestehende validierte MEDIA_BASE_PATH-Auflösung |
| Bestehendes API-Relay, genau drei Segmente | /api/v1/media/files/{filename}?display_width=512 | Bestehender interner API-Proxy und Backend-Dateinamen-Lookup |

display_width ist auf der Covers-Kind-Route pflicht und auf den beiden anderen
Eigentümern optional. Genau ein Dezimalwert aus 512, 760, 1280, 1920 wird akzeptiert.
Es ist eine Frontend-Transform-Anfrage, keine Original-Datei-Query. Ohne Opt-in bleiben
bestehende Original-Bytes, SVG-/Video-Behandlung, API-Methoden/-Status und Medien-Range
206/416 unverändert. Der Covers-Kind-Pfadname vermeidet bewusst die Next-Public-File-
Vorrangregel.

Erfolg ist ein statisches Frame-null-WebP, Qualität 75 mit Transparenz, nie vergrößert;
Breite <= angeforderter Slot, Höhe <= min(3 * Breite, 4096), <= 4 MiB Ausgabe. Eingabe ist
auf 16 MiB und 20 Millionen dekodierte Pixel begrenzt. Nur zwei Transforms pro
Serverprozess laufen gleichzeitig; bis zu acht Anfragen warten in einer abbrechbaren
FIFO innerhalb derselben Fünf-Sekunden-Frist; nur überschüssige Anfragen liefern 429.
Quell-Lesevorgänge und Sharp-Arbeit haben endliche Fünf-Sekunden-Fristen; ein Abbruch
bricht den Quelltransport ab, und ein nativer Job behält seinen Slot bis zum Abschluss.
Dateien werden vor und während begrenzter Lesevorgänge geprüft. Keine transformierte
Cache-Map und keine Original-Mutation.

GET ignoriert Quell-Range-/If-*-Semantik für die Transformation. HEAD berechnet dieselben
Repräsentations-Header ohne Body. Original-ETag, Content-Encoding, Content-Range,
Accept-Ranges, Last-Modified und Länge werden nicht als transformierte Metadaten
weitergereicht. Content-Type und Länge werden neu berechnet. Lokale Ergebnisse werden
60 Sekunden öffentlich gecacht; API-Datei-Ergebnisse sind private/no-store. Das API-Relay
behält seine bestehende feste Zielvorgabe, manuelles Redirect-Verhalten und
Auth-Header-Weiterleitung bei; Redirects und andere Non-200-Quellantworten werden nie zu
einem Bild-200.

Darstellungs-Fehlschläge haben einen Klartext-Body (HEAD/304 haben keinen Body), no-store
und nosniff: 400 ungültige Breite, 404 fehlendes/ungültiges Cover oder API-Dateiname,
408 Abbruch/Timeout, 413 Eingabe-/Pixel-/Ausgabe-Budget, 415 defektes/nicht unterstütztes
Raster, 429 Nebenläufigkeit, 502 nicht verfügbare oder unerwartet partielle Quelle.
Bestehende Quell-Status 3xx/401/404/5xx bleiben erhalten, ohne Original-Bild-Bytes.
Bestehende Medien-Traversal-Prüfungen liefern weiterhin 403. Unterstützte Eingabe-
Rasterfamilien sind JPEG, PNG/APNG, GIF, WebP und AVIF; SVG/Video werden vom
Opt-in-Darstellungs-Helfer nicht dekodiert.

Fokussierte Abdeckung: imageDisplay.test.ts, covers/display/[file]/route.test.ts,
api/v1/[...path]/route.test.ts, bestehende Medien-Range-Tests und animeBackdrops.test.ts.

Korrektur aus der Cold-Start-Prüfung: Vier verschiedene parallele Bilder müssen mit 200
über zwei aktive Transforms hinweg abschließen. Höchstens acht Wartende teilen sich die
Fünf-Sekunden-Request-Frist; ein abgebrochener Wartender wird vor der Quell-IO entfernt.
Sättigung über diese endliche Grenze hinaus liefert 429.
