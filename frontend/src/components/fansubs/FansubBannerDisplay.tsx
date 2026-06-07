'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import styles from './FansubBannerDisplay.module.css'

type BannerEdgeFills = { left: string; right: string }
type BannerSideWidths = { left: number; right: number }

interface FansubBannerDisplayProps {
  bannerURL: string
  altText?: string
}

function createBannerEdgeFillDataURL(image: HTMLImageElement, side: 'left' | 'right'): string {
  const sourceWidth = image.naturalWidth || image.width || 1
  const sourceHeight = image.naturalHeight || image.height || 1
  const sampleWidth = Math.max(1, Math.min(3, sourceWidth))
  const sourceX = side === 'left' ? 0 : Math.max(0, sourceWidth - sampleWidth)
  const canvas = document.createElement('canvas')
  canvas.width = sampleWidth
  canvas.height = sourceHeight
  const context = canvas.getContext('2d')
  if (!context) return ''
  context.drawImage(image, sourceX, 0, sampleWidth, sourceHeight, 0, 0, sampleWidth, sourceHeight)
  return canvas.toDataURL('image/png')
}

async function loadBannerEdgeFills(imageURL: string): Promise<BannerEdgeFills | null> {
  if (!imageURL.trim()) return null
  return await new Promise<BannerEdgeFills | null>((resolve) => {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () =>
      resolve({
        left: createBannerEdgeFillDataURL(image, 'left'),
        right: createBannerEdgeFillDataURL(image, 'right'),
      })
    image.onerror = () => resolve(null)
    image.src = imageURL
  })
}

export function FansubBannerDisplay({ bannerURL, altText }: FansubBannerDisplayProps) {
  const [bannerEdgeFills, setBannerEdgeFills] = useState<BannerEdgeFills | null>(null)
  const [bannerSideWidths, setBannerSideWidths] = useState<BannerSideWidths>({ left: 0, right: 0 })

  const shellRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    let active = true
    if (!bannerURL) {
      setBannerEdgeFills(null)
      return () => {
        active = false
      }
    }

    void loadBannerEdgeFills(bannerURL).then((fills) => {
      if (!active) return
      setBannerEdgeFills(fills)
    })

    return () => {
      active = false
    }
  }, [bannerURL])

  useEffect(() => {
    const shell = shellRef.current
    const image = imageRef.current
    if (!shell || !image) {
      setBannerSideWidths({ left: 0, right: 0 })
      return
    }

    const measure = () => {
      const shellRect = shell.getBoundingClientRect()
      const imageRect = image.getBoundingClientRect()
      const left = Math.max(0, Math.round(imageRect.left - shellRect.left) + 8)
      const right = Math.max(0, Math.round(shellRect.right - imageRect.right) + 8)
      setBannerSideWidths((current) =>
        current.left === left && current.right === right ? current : { left, right },
      )
    }

    measure()

    const resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(shell)
    resizeObserver.observe(image)
    window.addEventListener('resize', measure)

    if (!image.complete) {
      image.addEventListener('load', measure)
    }

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', measure)
      image.removeEventListener('load', measure)
    }
  }, [bannerURL])

  const showBannerSideFills = bannerSideWidths.left > 12 || bannerSideWidths.right > 12

  return (
    <div className={styles.bannerShell} ref={shellRef}>
      {showBannerSideFills && bannerEdgeFills?.left ? (
        <div
          className={`${styles.bannerSideFill} ${styles.bannerSideFillLeft}`}
          style={{ backgroundImage: `url(${bannerEdgeFills.left})`, width: `${bannerSideWidths.left}px` }}
          aria-hidden="true"
        />
      ) : null}
      {showBannerSideFills && bannerEdgeFills?.right ? (
        <div
          className={`${styles.bannerSideFill} ${styles.bannerSideFillRight}`}
          style={{ backgroundImage: `url(${bannerEdgeFills.right})`, width: `${bannerSideWidths.right}px` }}
          aria-hidden="true"
        />
      ) : null}
      {showBannerSideFills ? (
        <div className={styles.bannerEdgeFade} aria-hidden="true" />
      ) : null}
      <div className={styles.bannerImage}>
        <Image
          ref={imageRef}
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
