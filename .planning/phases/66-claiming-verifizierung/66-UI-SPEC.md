---
phase: 66
slug: claiming-verifizierung
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-02
---

# Phase 66 — UI Design Contract: Claiming und Verifizierung

> Visueller und Interaktionsvertrag für Phase 66. Erzeugt von gsd-ui-researcher, verifiziert von gsd-ui-checker.

---

## Design System

| Eigenschaft | Wert |
|-------------|------|
| Tool | none — CSS Module (bestehend, projektweite Konvention) |
| Preset | not applicable |
| Component library | projektinterne UI-Komponenten (`@/components/ui`: Button, Card, Badge, EmptyState, ErrorState, LoadingState, SectionHeader, Table, Toolbar) |
| Icon library | lucide-react (bestehend) |
| Font | Inter, "Segoe UI", system-ui, sans-serif (aus `globals.css`) |

Quelle: `frontend/src/styles/globals.css`, `frontend/src/app/me/profile/page.module.css`, `frontend/src/components/profile/`

---

## Spacing Scale

Deklarierte Werte aus `globals.css` (`--space-*`), nur Vielfache von 4:

| Token | Wert | Verwendung |
|-------|------|------------|
| xs | 4px (`--space-1`) | Icon-Abstände, Inline-Padding |
| sm | 8px (`--space-2`) | Kompakte Element-Abstände, Chip-Gaps |
| md | 16px (`--space-4`) | Standard-Element-Abstände, Formular-Felder |
| lg | 24px (`--space-5`) | Abschnitt-Padding, Card-Innenabstand |
| xl | 32px (`--space-6`) | Layout-Gaps, Grid-Abstände |
| 2xl | 48px (`--space-7`) | Große Abschnittsumbrüche |
| 3xl | 64px (`--space-8`) | Seitenebene |

Ausnahmen:
- Claim-Karten in der Queue: internes Padding 12px (analog `.radioCard` in `page.module.css`)
- Hero-Panel: Padding 28px (analog bestehendes `.heroPanel`)
- Einladungslink-Anzeige (Kopieren-Bereich): Padding 12px 16px (analog `.errorBox`/`.successBox`)

---

## Typography

Aus `globals.css` (body: 16px / 1.5) und bestehendem `page.module.css`:

| Rolle | Größe | Gewicht | Zeilenhöhe |
|-------|-------|---------|------------|
| Body | 16px | 400 | 1.5 |
| Label / Metadaten | 14px | 700 | 1.4 |
| Muted / Hilfstext | 14px (0.88rem) | 400 | 1.4 |
| Section Heading (h3) | 16px (1rem) | 700 | 1.3 |
| Page Heading (h2) | 32px (2rem) | 700 | 1.1 |

Genau 2 Gewichte: `400` (Body, Muted, Hilfstext) und `700` (Labels, Metadaten, Section Headings h3, Page Headings h2).

Quelle: `page.module.css` (`.heroCopy h2`, `.activityPeriodHeader h3`, `.accountGrid span`, `.mutedText`)

---

## Color

Aus `globals.css`:

| Rolle | Wert | Verwendung |
|-------|------|------------|
| Dominant (60%) | `#f6f4ef` (`--surface-canvas`) | Seitenhintergrund, Canvas |
| Secondary (30%) | `#ffffff` (`--surface-card`) | Cards, Sidebar, Formular-Felder, Queue-Karten |
| Accent (10%) | `#5f84dd` (`--color-primary`) | Ausschließlich für Primär-CTA-Buttons, VerifiedBadge-Komponente und `claim_status = verified`-Status-Chip |
| Destructive | `#dc3545` (`--color-error`) | Ausschließlich Ablehnen-Aktion in der Claim-Queue und Claim-Einladung stornieren |

Accent reserviert für:
1. Primär-CTA-Buttons (Claim einreichen, Einladungslink generieren, Einladung annehmen)
2. `VerifiedBadge`-Komponente (Häkchen-Icon neben Member-Namen)
3. `claim_status = verified`-Badge in der Claim-Queue-Karte

"Link kopieren"-Button im Einladungslink-Bereich: `variant="secondary"` (neutral, kein Accent). Accent bleibt auf die drei oben genannten Elemente beschränkt.

Zusätzliche Semantikfarben:
- Erfolg/verifiziert: `#28a745` (`--color-success`) — Hintergrund der Erfolgsmeldung (`.successBox`), Status-Chip "Verifiziert"
- Warnung/ausstehend: `#ffc107` (`--color-warning`) — Status-Chip "Ausstehend" in der Queue
- Fehler: `#991b1b` (Text auf `rgba(254,226,226,0.72)`) — `.errorBox` — Fehlermeldungen

---

## Oberflächenspezifikationen

### 1. me/profile — noindex-Toggle + Claim-Status-Anzeige

**Platzierung:** Neue `ClaimStatusCard`-Komponente in der Side-Column (`styles.sideColumn`), unterhalb der bestehenden `VisibilityCard`.

**noindex-Toggle:**
```
[Card variant="section" title="Suchmaschinen-Sichtbarkeit"]
  <fieldset> (analog zu VisibilityCard.tsx)
    <legend>Suchmaschinen-Sichtbarkeit</legend>
    <label class={styles.checkboxControl}>
      <input type="checkbox" checked={!noindex} />
      Mein Profil von Suchmaschinen indexieren lassen
    </label>
    <p class={styles.mutedText}>
      Wenn deaktiviert, wird dein Profil mit "noindex,nofollow" markiert.
    </p>
  </fieldset>
```

Interaktion: Checkbox-Change → optimistisches Update → PATCH an Backend → bei Fehler zurücksetzen + `errorBox` anzeigen.

**Claim-Status-Anzeige:**
```
[Card variant="section" title="Verifizierter Member-Eintrag"]
  Wenn kein Claim vorhanden:
    <EmptyState />
    "Du bist noch keinem historischen Member-Eintrag zugeordnet."
    [Button variant="secondary"] "Historischen Eintrag beanspruchen"

  Wenn pending:
    <Badge variant="warning"> Ausstehend </Badge>
    "Dein Claim für [Nick] wartet auf Bestätigung durch den Leader."

  Wenn verified:
    <Badge variant="success"> Verifiziert </Badge>
    "Du bist als [Nick] verifiziert."
```

---

### 2. Self-Service-Claim-Bereich (me/claim oder eingebettet in me/profile)

**Trigger:** Button "Historischen Eintrag beanspruchen" aus der ClaimStatusCard öffnet eine Inline-Sektion oder navigiert zu `/me/claim`.

**Nick-Suche:**
```
[Card variant="section" title="Welcher historische Eintrag bist du?"]
  <label>Nick suchen</label>
  <input type="search" placeholder="Fansub-Nick eingeben..." />
  [Button variant="secondary" size="sm"] "Suchen"

  Suchergebnisse (max. 10):
    Karte je Treffer:
      [Nick]  [Gruppen-Kontext falls vorhanden]
      [Button variant="secondary"] "Das bin ich — beanspruchen"

  Kein Treffer:
    <EmptyState />
    "Kein passender Eintrag gefunden."
    [Button variant="secondary"] "Neuen Eintrag beantragen"
```

**Fehlerfall Nick-Suche:** `errorBox` "Suche fehlgeschlagen. Bitte versuche es erneut."

**Nach Claim-Einreichung:** `successBox` "Dein Claim wurde eingereicht und wartet auf Bestätigung durch den Leader."

**Neuanlage-Antrag:**
```
[Card variant="section" title="Neuen historischen Eintrag beantragen"]
  <label>Dein Fansub-Nick (damals)</label>
  <input type="text" placeholder="z. B. Subs4Ever_Riku" />
  <label>Anmerkung (optional)</label>
  <textarea placeholder="Gruppen-Zugehörigkeit, Zeitraum, Kontext..." />
  [Button] "Antrag einreichen"
```

---

### 3. Öffentliches Member-Profil (members/[slug]) — verified-Badge + robots-Meta-Tag

**VerifiedBadge-Komponente:**

Platzierung: In `MemberProfileHero` direkt hinter `<h2>{displayName}</h2>` im `.heroCopy`-Bereich.

```tsx
// Nur wenn is_verified = true
<span class={styles.verifiedBadge} aria-label="Verifiziertes Mitglied">
  <CheckCircle size={18} color="var(--color-success)" aria-hidden="true" />
  <span class={styles.verifiedLabel}>Verifiziert</span>
</span>
```

Visuell: Inline-Flex, gap 4px, font-size 14px, font-weight 700, color `--color-success` (#28a745). Kein eigener Hintergrund — nur Icon + Text neben dem Namen.

**Bedingung (historisch) vs. verifiziert:**
- `is_verified = true` → verified-Badge, kein `(historisch)`-Suffix
- `is_verified = false && status = 'historical'` → `(historisch)` bleibt (unverändert aus Phase 64)

**robots-Meta-Tag:** Kein sichtbares UI-Element. Serverseitig via `generateMetadata()` gesetzt. Keine Interaktion.

---

### 4. Leader-Bereich (manage/groups/[id]) — Einladungslink + Claim-Queue

Eingebettet in die bestehende Gruppendetail-Seite (`frontend/src/app/admin/my-groups/[id]/page.tsx`), als neue Tab-Sektion oder als Accordion-Bereich unterhalb bestehender Inhalte.

**Primärer visueller Eintrittspunkt:** Der `SectionHeader` mit Titel "Member-Claim-Einladungen" ist der primäre visuelle Anker des Erweiterungsbereichs. Er markiert den Beginn des Claim-bezogenen Workflows innerhalb der Gruppendetail-Seite und macht den Bereich für Leader sofort als eigenständige Funktionseinheit erkennbar. Ein zweiter `SectionHeader` "Offene Claims (N)" folgt darunter und signalisiert den Prüf-Workflow durch die angezeigte Claim-Anzahl.

**Einladungslink generieren:**
```
[SectionHeader title="Member-Claim-Einladungen"]

Je historischem Member-Eintrag in der Gruppe:
  <Toolbar>
    [Nick des historischen Members]
    [Button variant="secondary" leftIcon={<Link2 size={16} />}]
      "Einladungslink generieren"
  </Toolbar>

Nach Generierung:
  [Card variant="section"]
    <label>Einladungslink (7 Tage gültig)</label>
    <div class={styles.inviteLinkRow}>
      <input type="text" readOnly value="https://team4s.de/claim-invitations/accept?token=..." />
      [Button variant="secondary" leftIcon={<Copy size={16} />}] "Link kopieren"
    </div>
    <p class={styles.mutedText}>
      Teile diesen Link direkt mit dem Mitglied (z. B. via Discord).
      Der Link läuft in 7 Tagen ab.
    </p>
```

"Link kopieren"-Button: `variant="secondary"` (neutral). Kein Accent — Accent bleibt reserviert für Primär-CTA, VerifiedBadge und verified-Status-Chip.

Interaktion: "Link kopieren" → `navigator.clipboard.writeText()` → Button-Label wechselt kurz auf "Kopiert!" (1,5 Sek.), dann zurück.

**Claim-Queue (offene Claims):**
```
[SectionHeader title="Offene Claims (N)"]

[Table]
  [TableHead]
    App-User | Beanspruchter Nick | Notiz | Eingereicht am | Aktionen
  [TableBody]
    Je pending Claim eine Zeile:
      [avatar + display_name] | [member_nickname] | [note oder —] | [formatted date] |
      [Button variant="success" size="sm"] "Bestätigen"
      [Button variant="danger" size="sm"]  "Ablehnen"

Leer:
  <EmptyState description="Keine offenen Claims." />
```

Interaktion Bestätigen: Bestätigungs-Dialog ODER direkter POST bei einfacher Aktion (kein Confirm-Dialog notwendig — keine destruktive Aktion).
Interaktion Ablehnen: `window.confirm("Claim von [User] für [Nick] ablehnen?")` oder Inline-Bestätigung.

Konfliktfall (bereits verified für denselben Member): `errorBox` "Dieser Member-Eintrag ist bereits verifiziert. Der neue Claim kann nicht bestätigt werden."

**Neuanlage-Antrags-Queue:**
```
[SectionHeader title="Neuanlage-Anträge (N)"]

[Table]
  [TableHead]
    App-User | Gewünschter Nick | Anmerkung | Eingereicht am | Aktionen
  [TableBody]
    [Button variant="secondary" size="sm"] "Member anlegen & verknüpfen"
    [Button variant="danger" size="sm"]    "Ablehnen"

Leer:
  <EmptyState description="Keine Neuanlage-Anträge." />
```

---

### 5. Einlösungs-Flow (claim-invitations/accept)

Neue Seite `/claim-invitations/accept?token=...`, analog zu `frontend/src/app/invitations/accept/page.tsx`.

**Layout:** `max-width: 720px; margin: 0 auto; padding: 48px 20px;` (analog bestehende Accept-Seite).

```
Nicht eingeloggt:
  <h1>Member-Claim-Einladung annehmen</h1>
  <p>Du wurdest von einem Leader eingeladen, deinen historischen Member-Eintrag zu beanspruchen.</p>
  <p>Bitte melde dich zuerst an oder erstelle einen Account — du wirst danach automatisch zurückgeleitet.</p>
  [Button href="/login?return_to=/claim-invitations/accept?token=..."]
    "Anmelden oder registrieren"

Eingeloggt, Token vorhanden:
  <h1>Member-Claim-Einladung annehmen</h1>
  <p>Du nimmst die Einladung für den historischen Eintrag <strong>[Nick]</strong> an.</p>
  [Button] "Einladung annehmen"
  (loading während API-Call: "Einladung wird angenommen...")

Erfolg:
  successBox: "Dein Account ist jetzt als [Nick] verifiziert. Dein Profil ist ab sofort öffentlich indexierbar."
  [Button href="/me/profile" variant="secondary"] "Zum Profil"

Fehler (Token abgelaufen):
  errorBox: "Dieser Einladungslink ist abgelaufen. Bitte bitte deinen Leader, einen neuen Link zu erstellen."

Fehler (Token ungültig):
  errorBox: "Ungültiger Einladungslink. Bitte überprüfe den Link oder wende dich an deinen Leader."

Fehler (bereits verifiziert):
  errorBox: "Du bist bereits einem historischen Eintrag zugeordnet."

Kein Token im URL:
  errorBox: "Im Link fehlt ein gültiges Einladungs-Token."
```

Interaktion nach Erfolg: `router.replace('/me/profile')` ohne Token im URL (verhindert Token in Browser-History).

---

## Copywriting Contract

| Element | Textinhalt |
|---------|------------|
| Primär-CTA (Claim einreichen) | "Das bin ich — beanspruchen" |
| Primär-CTA (Einladungslink) | "Einladungslink generieren" |
| Primär-CTA (Einladung annehmen) | "Einladung annehmen" |
| Primär-CTA (Neuanlage-Antrag) | "Antrag einreichen" |
| Empty State (kein Claim) | "Du bist noch keinem historischen Member-Eintrag zugeordnet." |
| Empty State (keine Claims in Queue) | "Keine offenen Claims." |
| Empty State (Nick-Suche kein Treffer) | "Kein passender Eintrag gefunden." |
| Empty State (keine Neuanlage-Anträge) | "Keine Neuanlage-Anträge." |
| Erfolgsmeldung (Claim eingereicht) | "Dein Claim wurde eingereicht und wartet auf Bestätigung durch den Leader." |
| Erfolgsmeldung (Einladung angenommen) | "Dein Account ist jetzt als [Nick] verifiziert. Dein Profil ist ab sofort öffentlich indexierbar." |
| Erfolgsmeldung (Profil gespeichert) | "Profil wurde gespeichert." (bestehend) |
| Fehlermeldung (Token abgelaufen) | "Dieser Einladungslink ist abgelaufen. Bitte bitte deinen Leader, einen neuen Link zu erstellen." |
| Fehlermeldung (Token ungültig) | "Ungültiger Einladungslink. Bitte überprüfe den Link oder wende dich an deinen Leader." |
| Fehlermeldung (bereits verifiziert) | "Dieser Member-Eintrag ist bereits verifiziert." |
| Fehlermeldung (kein Token) | "Im Link fehlt ein gültiges Einladungs-Token." |
| Fehlermeldung (bereits eigener Claim) | "Du bist bereits einem historischen Eintrag zugeordnet." |
| Fehlermeldung (allgemein) | "Aktion konnte nicht durchgeführt werden. Bitte versuche es erneut." |
| Destruktiv: Claim ablehnen | Bestätigung: "Claim von [User] für [Nick] ablehnen?" — CTA: "Ablehnen" |
| Destruktiv: Neuanlage ablehnen | Bestätigung: "Antrag von [User] für Nick '[Nick]' ablehnen?" — CTA: "Ablehnen" |
| noindex-Toggle-Label | "Mein Profil von Suchmaschinen indexieren lassen" |
| noindex-Toggle-Hilfstext | "Wenn deaktiviert, wird dein Profil mit 'noindex,nofollow' markiert." |
| Claim-Status ausstehend | "Dein Claim für [Nick] wartet auf Bestätigung durch den Leader." |
| Claim-Status verifiziert | "Du bist als [Nick] verifiziert." |
| Einladungslink-Hilfstext | "Teile diesen Link direkt mit dem Mitglied (z. B. via Discord). Der Link läuft in 7 Tagen ab." |
| Kopierer-Button nach Kopieren | "Kopiert!" (1,5 Sek., dann zurück zu "Link kopieren") |

---

## Komponenteninventar

Neue Dateien:

| Datei | Zweck |
|-------|-------|
| `frontend/src/components/profile/VerifiedBadge.tsx` | Häkchen-Badge (CheckCircle + "Verifiziert"), inline neben Member-Namen |
| `frontend/src/app/me/profile/components/ClaimStatusCard.tsx` | noindex-Toggle + Claim-Status-Anzeige in me/profile Side-Column |
| `frontend/src/app/claim-invitations/accept/page.tsx` | Einlösungs-Seite (analog invitations/accept), Client Component |

Erweiterungen bestehender Dateien:

| Datei | Erweiterung |
|-------|-------------|
| `frontend/src/components/profile/MemberProfileHero.tsx` | `VerifiedBadge` einbinden wenn `is_verified = true` |
| `frontend/src/components/profile/MemberRoleTimeline.tsx` | `(historisch)` entfällt wenn `is_verified = true` (neues Prop nötig) |
| `frontend/src/app/members/[slug]/page.tsx` | `generateMetadata()` für robots-Meta-Tag hinzufügen |
| `frontend/src/app/me/profile/page.tsx` | `ClaimStatusCard` in Side-Column einbinden |
| `frontend/src/app/admin/my-groups/[id]/page.tsx` | Einladungslink-Sektion + Claim-Queue + Neuanlage-Queue hinzufügen |

---

## Icon-Auswahl (lucide-react)

| Icon | Verwendung |
|------|------------|
| `CheckCircle` (size=18) | VerifiedBadge neben Member-Namen |
| `Copy` (size=16) | "Link kopieren"-Button |
| `Link2` (size=16) | "Einladungslink generieren"-Button |
| `UserCheck` (size=16) | "Bestätigen"-Button in Claim-Queue (optional) |
| `UserX` (size=16) | "Ablehnen"-Button in Claim-Queue (optional) |
| `Search` (size=16) | Nick-Suche-Input (optional als trailing icon) |

---

## Interaktionsstatus-Matrix

| Zustand | Visual |
|---------|--------|
| Lade-Zustand (API-Call läuft) | Button `disabled + loading prop`, Text "[Aktion] wird durchgeführt..." |
| Erfolg | `successBox` — grüner Hintergrund `rgba(220,252,231,0.72)`, Textfarbe `#166534` |
| Fehler | `errorBox` — roter Hintergrund `rgba(254,226,226,0.72)`, Textfarbe `#991b1b` |
| Ausstehend (Claim) | `<Badge>` mit Hintergrund `rgba(255,193,7,0.18)`, Textfarbe `#92400e` |
| Verifiziert (Claim) | `<Badge>` mit Hintergrund `rgba(40,167,69,0.14)`, Textfarbe `#166534` |
| Abgelehnt (Claim) | `<Badge>` mit Hintergrund `rgba(220,53,69,0.12)`, Textfarbe `#991b1b` |
| Kopierbestätigung | Button-Label wechselt auf "Kopiert!" für 1.500 ms |

---

## Barrierefreiheit

- Alle interaktiven Elemente haben `aria-label` oder sichtbaren Text
- Checkbox-Toggle: `aria-describedby` verweist auf Hilfstext
- VerifiedBadge: `aria-label="Verifiziertes Mitglied"`, Icon mit `aria-hidden="true"`
- Claim-Queue-Aktions-Buttons: `aria-label="Claim von [User] für [Nick] bestätigen"` / `"... ablehnen"`
- Fehlermeldungen werden nach dem Submit-Fokus mit `role="alert"` für Screenreader ausgegeben
- Mindest-Touch-Target: 44px Höhe für alle Buttons (`--control-height-md`)
- Fokus-Outline: `var(--focus-outline)` = `rgba(255, 106, 61, 0.62)` (aus `globals.css`)

---

## Registry Safety

| Registry | Verwendete Blöcke | Safety Gate |
|----------|-------------------|-------------|
| shadcn official | keine — projektinterne UI-Komponenten | nicht zutreffend |
| Drittanbieter | keine | nicht zutreffend |

Keine neuen NPM-Pakete oder externe Registries in Phase 66. Alle Primitiven (`lucide-react`, CSS Module, bestehende UI-Komponenten) sind bereits im Projekt vorhanden.

---

## Pre-Population-Nachweis

| Quelle | Übernommene Entscheidungen |
|--------|---------------------------|
| CONTEXT.md | D-11: noindex-Toggle Label; D-12: Default noindex-Verhalten; D-13: verified-Badge statt (historisch); D-14: nur robots-Meta-Tag; D-15: Umlaut-Konvention |
| RESEARCH.md | Icon: CheckCircle; generateMetadata-Pattern; Einlösungs-Flow-Struktur analog invitations/accept; Klasse VerifiedBadge.tsx; ClaimStatusCard.tsx-Platzierung |
| CONTEXT.md `<specifics>` | Alle 5 UI-Sketch-Strukturen direkt übernommen |
| `frontend/src/app/me/profile/page.module.css` | Spacing-Werte (28px, 18px, 22px, 12px), errorBox/successBox-Farben, checkboxControl-Pattern |
| `frontend/src/styles/globals.css` | Alle CSS Custom Properties (Farben, Spacing, Typography) |
| `frontend/src/app/invitations/accept/page.tsx` | Einlösungs-Seiten-Struktur, Fehlertext-Muster |
| Revision (2026-06-02) | Typography auf 2 Gewichte normiert (400/700); Spacing 14px → 16px; visueller Anker Leader-Bereich deklariert; "Link kopieren" aus Accent-Reservierung entfernt |
| User input | keine Fragen gestellt (--auto Modus) |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
