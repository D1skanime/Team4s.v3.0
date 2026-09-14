# Gemeinsame Live-Browserprüfung — 14.09.2026

Der Benutzer meldete sich ausdrücklich selbst an. Ausgangsseite war sein Projektbereich `/me/projects/1/group/1?return_to=%2Fme%2Fprofile`. Navigation über den sichtbaren Eintrag „Folge2 · Nice Coupling“ / „Notizen & Medien“ führte zu `/me/releases/28/workspace?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F1`.

Im Inhaltsreiter „Segmente“ sichtbar: „Aktive Segmente für Episode2“, Erklärung zur tatsächlichen Release-Version-Zuordnung, „Buddy Opening2“, zugewiesene Folgen2,3, Quelle „Episode-Version / Jellyfin-Stream“, Status „Bereit“. „Bearbeiten“ öffnete den vorhandenen Drawer unmittelbar mit Typ OP Kara und Bereich2–3. Neue Erklärung zu freien Plätzen und übersprungenen Folgen sichtbar. Origin-Auswahl bot ausschließlich Folge2 und3 an; Hinweis zum unveränderten Originverhalten sichtbar.

Screenshot im Tool visuell geprüft (Desktop, Screenshot2204×1054). Editor mit „Abbrechen“ geschlossen, keine Eingaben gespeichert, keine Medien hochgeladen/gelöscht. Benutzer-Tab bleibt auf dem Segmente-Reiter. Dies belegt den echten Navigations-/Lesefluss, nicht die menschliche Abnahme der Schreibfälle.

Schreib-/Konfliktfälle werden separat über isolierte PostgreSQL-Tests und die Browser-API-Fixtures in browser-check.cjs geprüft. Kein Live-Schreibtest mit Benutzerdaten. Human-UAT156 GAP-02 und GAP-04 bleiben ausdrücklich offen.

## Nachtrag: Editierbereich nach übersprungenen Folgen

Der Auftraggeber meldete anschließend in `/me/releases/42/workspace?return_to=%2Fme%2Fprojects%2F1%2Fgroup%2F1` das verbleibende Anzeigeproblem: Segment „test“ ist nur Folge 6 zugewiesen, der wieder geöffnete Drawer zeigte aber 2–6.

Nach dem gezielten Form-Mapping-Fix wurde vom inzwischen sichtbaren Workspace der Folge 5 über „Nächster Release“ zur Folge 6 navigiert, dort „Segmente“ und „Bearbeiten“ geöffnet. Live-AX und Screenshot 2204 × 1054 belegen **Von 6 / Bis 6**, OP Kara, Name „test“ und tatsächliche Tabellenzuordnung 6. Keine Eingabe geändert und kein Speichern ausgelöst. Der Benutzer-Tab bleibt mit dieser korrigierten Maske geöffnet. Dieser konkrete Lesefall ist technisch sichtbar geprüft; ein Human-UAT-Sign-off wird weiterhin nicht behauptet.
