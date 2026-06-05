/**
 * MemberProfileMemorialHero — würdevolle Sonder-Hero-Variante für Gedenkprofile (D-10).
 *
 * Wird von MemberProfileHero delegiert wenn profile_status === 'memorial'.
 * Zeigt Gedenk-Sprache anstelle von Aktivitätsmetriken.
 * Mengen-/Gamification-Badges sind ausgeblendet (D-10).
 * Contributions und Geschichte bleiben in den Folge-Sektionen sichtbar.
 */

import Image from 'next/image'

import { PageHeader } from '@/components/ui'
import type { PublicMemberProfileData } from '@/types/profile'

import { MemberStatusPill } from './MemberStatusPill'
import type { KnownForResult } from './deriveKnownFor'
import styles from './profile.module.css'

interface MemberProfileMemorialHeroProps {
  profile: PublicMemberProfileData
  avatarURL?: string
  backgroundImageURL?: string
  knownFor: KnownForResult
}

export function MemberProfileMemorialHero({
  profile,
  avatarURL = '',
  backgroundImageURL = '',
  knownFor,
}: MemberProfileMemorialHeroProps) {
  const displayName = profile.fansub_name || 'Profil'
  const avatarLabel = profile.fansub_name || 'Profil'

  return (
    <div className={styles.hero}>
      <PageHeader eyebrow="Fansub-Member" title={displayName} />

      <div
        className={styles.heroPanel}
        style={
          backgroundImageURL
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(31, 41, 55, 0.95), rgba(60, 60, 80, 0.85)), url("${backgroundImageURL}")`,
              }
            : undefined
        }
      >
        <div className={styles.heroAvatar}>
          {avatarURL ? (
            <Image
              src={avatarURL}
              alt={`${avatarLabel} Avatar`}
              width={132}
              height={132}
              unoptimized
            />
          ) : (
            <span aria-hidden="true">
              {(profile.fansub_name || '?').slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div className={styles.heroCopy}>
          <h2 className={styles.heroTitleRow}>
            <span>{displayName}</span>
            <MemberStatusPill status="memorial" />
          </h2>

          {/* Gedenktext — Pflicht-String laut D-10 und CLAUDE.md §Sprachqualität */}
          <p className={styles.memorialNotice}>
            Dieses Profil wird als historisches Gedenkprofil geführt.
          </p>

          {/* Kurzbeschreibung (falls vorhanden) — keine Aktivitätsmetriken oder Mengen-Badges */}
          {profile.bio ? (
            <p className={styles.memorialBio}>{profile.bio}</p>
          ) : null}

          {/* „Bekannt für"-Block (D-03 — read-only, kein Schreib-Flow) */}
          {knownFor.activeYears || knownFor.topRoles.length > 0 ? (
            <div className={styles.knownForBlock}>
              {knownFor.activeYears ? (
                <span className={styles.knownForItem}>
                  Aktiv: {knownFor.activeYears}
                </span>
              ) : null}
              {knownFor.topRoles.length > 0 ? (
                <span className={styles.knownForItem}>
                  Schwerpunkte: {knownFor.topRoles.join(', ')}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
