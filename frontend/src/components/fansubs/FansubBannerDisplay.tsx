'use client'

import { ResponsiveImage } from '@/components/ui/ResponsiveImage'

import styles from './FansubBannerDisplay.module.css'

interface FansubBannerDisplayProps {
  bannerURL: string
  altText?: string
}

export function FansubBannerDisplay({ bannerURL, altText }: FansubBannerDisplayProps) {
  return (
    <div className={styles.bannerShell}>
      <div className={styles.bannerImage}>
        <ResponsiveImage
          src={bannerURL}
          alt={altText ?? ''}
          className={styles.bannerImageElement}
          width={1200}
          height={180}
          quality={85}
          priority
        />
      </div>
    </div>
  )
}
