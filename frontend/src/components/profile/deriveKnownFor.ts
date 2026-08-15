/**
 * KnownForResult — reine Anzeige-/Prop-Shape fuer das "Bekannt fuer"-Highlight (Phase 132 D-06/D-07).
 *
 * Wird von MemberProfileHero/MemberProfileMemorialHero geteilt und aus dem serverautoritativen
 * `known_for`-Feld (PublicMemberKnownFor, backend-berechnet ueber das vollstaendige freigegebene
 * current-project-Set) befuellt -- nicht mehr client-seitig aus einer role_timeline abgeleitet.
 */

export interface KnownForResult {
  activeYears: string
  topRoles: string[]
  knownGroups: string[]
}
