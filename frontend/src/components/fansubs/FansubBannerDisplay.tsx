'use client'

import Image from 'next/image'

import styles from './FansubBannerDisplay.module.css'

interface FansubBannerDisplayProps {
  bannerURL: string
  altText?: string
}

export function FansubBannerDisplay({ bannerURL, altText }: FansubBannerDisplayProps) {
  return (
    <div className={styles.bannerShell}>
      <div className={styles.bannerImage}>
        <Image
          src={bannerURL}
          alt={altText ?? ''}
          className={styles.bannerImageElement}
          width={1200}
          height={180}
          unoptimized
          priority
        />
      </div>
    </div>
  )
}
