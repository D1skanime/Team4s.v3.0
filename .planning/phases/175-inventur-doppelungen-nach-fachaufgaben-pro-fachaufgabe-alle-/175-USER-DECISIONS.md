# Phase 175 – Nutzer-Entscheidungen für 175-09

Nutzer-Entscheidungen/Klarstellungen für 175-09 (ROADMAP-PROPOSAL), Stand 2026-10-07 — bitte verbindlich berücksichtigen:

1. Member-Group-Story (Befund 1 aus data/06-notizen-schreiben.md) ist KEIN fehlendes UI, sondern eine ABGELÖSTE ALTLAST:
   - Persönliche Geschichte schreiben Mitglieder im Profil (`members.member_story_*`, `/me/profile`, öffentlich `/members/<slug>`; 1 Datensatz).
   - Die Geschichte der Gruppe wird auf der Fansub-Bearbeiten-Seite („Gruppengeschichte“, mehrere ordenbare Einträge) gepflegt.
   - `member_group_stories` (Migration 0062/0068, 0 Datensätze) + 5 Admin-Endpunkte `/admin/fansubs/:id/member-stories*` + Handler/Repository + ungenutzte API-Funktionen (`lib/api/history.ts`/`fansubs-members.ts`) werden ENTFERNT (Nutzer 2026-10-07). Einordnung: Altlast-Entfernung, nicht Feature.
2. F-02 OUTRO: „Outro“ bleibt eigener Typ mit Kürzel `OUT`; Kürzel künftig fest in der DB beim Theme-Typ statt Namens-Raten; `segmenteTabUtils.ts` ist laut data/11 toter Code (nur Test-Import) → entfernen. Gehört in die Bug-Phase direkt nach 175.
3. F-05 doppelte anime_contributions (timer): Ursache finden und beheben; Bestandsdaten nur mit Nutzerfreigabe bereinigen. Bug-Phase.
4. Reihenfolge-Wunsch des Nutzers: direkt nach 175 die Bug-Phase (inkl. neuer Rechte-/Sicherheitsbefunde aus 175, z. B. Claim-Invite-Accept ohne disabled-Prüfung), danach die Zusammenführungs-Phasen.
