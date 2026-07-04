# Spike Manifest

## Idea

Validate risky technical assumptions before planning Phase 98 segment playback. The current focus is whether Team4s can use Jellyfin API access to obtain an anime episode stream and render a safe OP/ED/Kara segment with video, audio, and subtitle/Kara handling.

## Requirements

- Segment rendering must include audio, not only video.
- Jellyfin API keys must never be written into committed spike artifacts.
- Generated anime clips, frames, and subtitle files are local evidence only and must not be committed.
- Phase 98 planning must account for FFmpeg availability because the current backend image does not include `ffmpeg`/`ffprobe`.

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | jellyfin-api-segment-encode | standard | Given a Jellyfin episode item, when Team4s reads stream and ASS subtitle data via API, then FFmpeg can render a short MP4 segment with video and audio. | VALIDATED | jellyfin, ffmpeg, segments, kara, audio |
