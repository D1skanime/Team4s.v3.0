import type { MemberProfileData } from '@/types/profile'

// Die einzig massgebliche Berechtigungsquelle ist das eigene Profil-Aggregat.
// has_member_profile allein reicht nie aus -- ein verifiziertes Mitglied ohne echte
// Projekt-/Beitrags-Zuordnung darf trotzdem nicht als berechtigt gelten (D-06/D-09). Dieselbe
// Funktion gilt sowohl fuer den bestehenden "Hinweis senden"-Knopf auf /me/contributions als
// auch fuer den kontextuellen "Fehler melden"-Einstiegspunkt auf oeffentlichen Projekt-/
// Release-Seiten (D-12, Plan 191-18) -- an genau dieser einen Stelle gebuendelt statt an jedem
// Einstiegspunkt lokal duplziert (191-UI-SPEC.md Component Contract D2, dieselbe "keine
// Kopie"-Linie wie die Gruppensuche aus D-02).
export function isEligibleForContributions(
  profile: Pick<MemberProfileData, 'has_member_profile' | 'has_project_assignments'> | null,
): boolean {
  return Boolean(profile?.has_member_profile && profile?.has_project_assignments)
}
