'use client'

import { useEffect, useRef, useState } from 'react'

import { Button, Modal } from '@/components/ui'
import { useAuthSession } from '@/lib/useAuthSession'

export function ReleaseEpisodePlayer({ releaseVersionID, title }: { releaseVersionID: number; title: string }) {
  const session = useAuthSession()
  const [available, setAvailable] = useState(false)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasSession = session.hasAccessToken || session.hasRefreshToken

  useEffect(() => {
    if (!session.isClientInitialized || !hasSession) return
    const controller = new AbortController()
    void fetch(`/api/releases/${releaseVersionID}/playback-access`, { cache: 'no-store', signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<{ data?: { can_play?: boolean; stream_ready?: boolean } }> : null)
      .then(payload => setAvailable(Boolean(payload?.data?.can_play && payload.data.stream_ready)))
      .catch(() => { if (!controller.signal.aborted) setAvailable(false) })
    return () => controller.abort()
  }, [hasSession, releaseVersionID, session.isClientInitialized])

  function close() {
    const video = videoRef.current
    if (video) { video.pause(); video.removeAttribute('src'); video.load() }
    setOpen(false); setFailed(false)
  }

  if (!session.isClientInitialized || !hasSession || !available) return null
  return <>
    <Button variant="secondary" onClick={() => setOpen(true)}>Episode abspielen</Button>
    <Modal open={open} onClose={close} title={title} description="Vollständige Episode" size="lg">
      {failed ? <p role="alert">Die Episode konnte nicht abgespielt werden.</p> : <video ref={videoRef} src={`/api/releases/${releaseVersionID}/stream`} controls autoPlay onError={() => setFailed(true)} style={{ width: '100%', maxHeight: '70vh', background: '#000' }} />}
    </Modal>
  </>
}
