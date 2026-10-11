'use client'

import { useState } from 'react'

import { Card, SectionHeader, UploadDropzone, UploadFileRow } from '@/components/ui'
import type { UploadFileRowProps } from '@/components/ui'

import styles from '../page.module.css'

interface DemoQueueItem {
  key: string
  file: File
  title: string
  caption: string
  status: UploadFileRowProps['status']
  progress: number | null
}

function demoKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function UploadPrimitivesShowcase() {
  const [queue, setQueue] = useState<DemoQueueItem[]>([])

  function handleFilesSelected(files: File[]) {
    setQueue((current) => {
      const seen = new Set(current.map((item) => item.key))
      const next = [...current]
      for (const file of files) {
        const key = demoKey(file)
        if (seen.has(key)) continue
        seen.add(key)
        next.push({ key, file, title: '', caption: '', status: 'idle', progress: null })
      }
      return next
    })
  }

  function handleChange(key: string, field: 'title' | 'caption', value: string) {
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)))
  }

  function handleRetry(key: string) {
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, status: 'idle', progress: null } : item)))
  }

  function handleRemove(key: string) {
    setQueue((current) => current.filter((item) => item.key !== key))
  }

  return (
    <Card variant="section">
      <SectionHeader
        eyebrow="09"
        title="Upload-Primitives Showcase"
        description="UploadDropzone und UploadFileRow sind rein darstellende Bausteine — keine Team4s-Fachlogik, keine API-Aufrufe. Diese Demo verwaltet nur lokalen Showcase-Zustand."
      />
      <div className={styles.stack}>
        <UploadDropzone onFilesSelected={handleFilesSelected} density="roomy" multiple />
        {queue.map((item) => (
          <UploadFileRow
            key={item.key}
            file={item.file}
            title={item.title}
            caption={item.caption}
            onChange={(field, value) => handleChange(item.key, field, value)}
            status={item.status}
            progress={item.progress}
            onRetry={() => handleRetry(item.key)}
            onRemove={() => handleRemove(item.key)}
          />
        ))}
      </div>
    </Card>
  )
}
