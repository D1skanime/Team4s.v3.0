---
status: complete
phase: 93
kind: quick
created_at: 2026-06-30
---

# Phase 93 Quick - Meine Projekte Responsive Polish

## Problem

`/me/contributions` war auf Desktop kuenstlich auf Mobile-Breite begrenzt. Der
Hinweis-Wizard verschwendete Desktop-Hoehe, musste innen zu frueh scrollen und
der globale `YearPicker` lag im Dialog durch seinen Dropdown-Z-Index hinter der
Modalebene. Zusaetzlich wirkten die Sichtbarkeits-Buttons in Projektrollen wie
unabhaengige Controls, obwohl mehrere Rollen denselben Contribution-Eintrag und
damit denselben Sichtbarkeitsstatus teilen koennen.

## Read First

- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `frontend/src/components/contributions/ProposalForm.tsx`
- `frontend/src/components/contributions/AnimeGroupCard.tsx`
- `frontend/src/components/contributions/VisibilityDropdown.tsx`
- `frontend/src/components/contributions/contributions.module.css`
- `frontend/src/components/ui/Drawer.tsx`
- `frontend/src/components/ui/YearPicker.tsx`
- `frontend/src/components/ui/ui.module.css`

## Umsetzung

1. Desktop-Layout von `/me/contributions` auf echte Desktop-Breite und zweispaltige
   Nutzung ab `980px` umstellen.
2. `responsiveSheet`-Drawer auf Desktop mit stabiler Dialoghoehe und Breite
   darstellen, Mobile-Bottom-Sheet-Verhalten beibehalten.
3. `YearPicker`-Panel ueber die Modalebene legen, damit Jahre im Wizard
   sichtbar und anklickbar bleiben.
4. Sichtbarkeit `Profil/Intern` als stabilen zweistufigen Slider statt als
   Button-Paar darstellen.
5. Mehrere Rollen desselben Contribution-Eintrags nur einmal mit einem
   Sichtbarkeits-Control ausstatten und die gemeinsame Sichtbarkeit sichtbar
   machen.

## Akzeptanz

- Desktop nutzt die verfuegbare Breite sinnvoll statt 430px-Mobile-Panel.
- Mobile bleibt ohne horizontales Scrollen.
- Wizard-Dialog nutzt Desktop-Hoehe besser; Header/Footer bleiben erreichbar.
- YearPicker ist im Dialog sichtbar und bedienbar.
- Sichtbarkeit hat keinen Layout-Shift beim Umschalten.
- Gleicher Contribution-Eintrag erzeugt nicht mehrere scheinbar unabhaengige
  Sichtbarkeits-Schalter.
