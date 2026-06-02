# Phase 66: Claiming und Verifizierung - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 66-claiming-verifizierung
**Areas discussed:** Claim-Flows & Auffinden, Einladungslink-Mechanik, Verifizierung & Konflikte, noindex & verified-Anzeige

---

## Claim-Flows & Auffinden

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Richtungen | Beide / nur Leader-Einladung / nur Self-Service | **Beide Richtungen** |
| Auffinden | Suche nach Nick / Button auf Profil / beides | **Suche nach Nick** |
| Kein Treffer | Nur Hinweis / Neuanlage beantragen | **Neuanlage beantragen (Queue)** |

---

## Einladungslink-Mechanik

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Token-Speicher | Neue Tabelle (analog 0076) / member_claims erweitern | **Neue Tabelle member_claim_invitations** |
| Ablaufzeit | 7 Tage / 30 Tage / unbegrenzt | **7 Tage** |
| Versand | Link manuell teilen / per E-Mail / beides | **Link manuell teilen** |
| Einlösung | Eingeloggter App-User / Link erzeugt Account-Flow | **Account-Flow (Keycloak), inkl. Login-Fall** |

---

## Verifizierung & Konflikte

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| Bestätiger | Leader+Admins / nur Admins / nur Leader | **Leader + Admins** |
| Konflikt | Nur 1 verified / Leader entscheidet manuell / erster gewinnt | **Leader entscheidet manuell (Invariante: 1 verified)** |
| verification_method | invite_link+manual_review / generisch / feiner | **invite_link + manual_review** |

---

## noindex & verified-Anzeige

| Frage | Optionen | Auswahl |
|--------|-------------|----------|
| noindex-Ort | Toggle in me/profile / eigener Bereich | **Toggle in me/profile** |
| Default | true+freigeben / nach Verifizierung indexierbar | **Nach Verifizierung indexierbar** |
| Verified-UI | Häkchen-Badge / Statuszeile | **Häkchen-Badge am Namen** |
| noindex-Wirkung | Meta+Sitemap / nur Meta-Robots | **Nur Meta-Robots-Tag** |

---

## Claude's Discretion

- Genaues Schema von member_claim_invitations (analog 0076)
- Technische Keycloak-Anbindung des Account-Flows + „bereits eingeloggt"-Erkennung
- Ort von Claim-Queue und Neuanlage-Antrags-Queue im Frontend
- Nick-Suche: neuer Endpunkt vs. bestehende Member-Suche
- Handler/Repo-Aufteilung unter 450-Zeilen-Limit

## Deferred Ideas

- E-Mail-Versand des Einladungslinks — V1 manuelles Teilen
- Sitemap-Ausschluss bei noindex — V1 nur robots-Meta
- Todos profile-hub-redesign & contributor-owned-media — reviewed, nicht gefoldet
