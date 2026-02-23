export function shouldRenderEnableAudioButton(
  showThemeVideo: boolean,
  activeThemeVideoUrl: string | null,
  isThemeVideoMuted: boolean,
): boolean {
  if (!showThemeVideo) return false
  if (!activeThemeVideoUrl) return false
  return isThemeVideoMuted
}
