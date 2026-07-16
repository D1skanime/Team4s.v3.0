'use client'

import { useEffect, useRef, useState } from 'react'

import { Button, Modal } from '@/components/ui'
import { getReleasePlaybackAccess } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'

export function ReleaseEpisodePlayer({ releaseVersionID, title }: { releaseVersionID: number; title: string }) {
  const session = useAuthSession()
  const [available, setAvailable] = useState(false)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const [accessFailed, setAccessFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasSession = session.hasAccessToken || session.hasRefreshToken

  useEffect(() => {
    if (!session.isClientInitialized || !hasSession) return
    let cancelled = false
    void getReleasePlaybackAccess(releaseVersionID)
      .then(access => { if (!cancelled) { setAccessFailed(false); setAvailable(access.can_play && access.stream_ready) } })
      .catch(() => { if (!cancelled) { setAvailable(false); setAccessFailed(true) } })
    return () => { cancelled = true }
  }, [hasSession, releaseVersionID, session.isClientInitialized])

  function close() {
    const video = videoRef.current
    if (video) { video.pause(); video.removeAttribute('src'); video.load() }
    setOpen(false); setFailed(false)
  }

  if (!session.isClientInitialized || !hasSession || !available) return accessFailed ? <span hidden data-playback-access-error="true" /> : null
  return <>
    <Button variant="secondary" onClick={() => setOpen(true)}>Episode abspielen</Button>
    <Modal open={open} onClose={close} title={title} description="Vollständige Episode" size="lg">
      {failed ? <p role="alert">Die Episode konnte nicht abgespielt werden.</p> : <video ref={videoRef} src={`/api/releases/${releaseVersionID}/stream`} controls autoPlay onError={() => setFailed(true)} style={{ width: '100%', maxHeight: '70vh', background: '#000' }} />}
    </Modal>
  </>
}
