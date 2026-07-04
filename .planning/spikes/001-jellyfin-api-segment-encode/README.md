---
spike: 001
name: jellyfin-api-segment-encode
type: standard
validates: "Given a Jellyfin episode item, when Team4s reads stream and ASS subtitle data via API, then FFmpeg can render a short MP4 segment with video and audio."
verdict: VALIDATED
related: [phase-98]
tags: [jellyfin, ffmpeg, segments, kara, audio]
---

# Spike 001: Jellyfin API Segment Encode

## What This Validates

Given Viper's Creed EP01 in Jellyfin, when Team4s uses only Jellyfin API/HTTP access, then a server-side render process can create a short browser-playable segment with video and audio, and can include the ASS subtitle/Kara pipeline.

## Research

Existing Team4s code already knows how to call Jellyfin for metadata and stream proxying, but only fetches minimal episode metadata today. The spike checked the live Jellyfin API directly for one real release variant:

- Release version: Viper's Creed EP01, version 1, variant 1.
- Jellyfin item: stored in `release_streams.jellyfin_item_id`.
- Segment source: `theme_segment_playback_sources`, start `0`, end `80`.

Jellyfin returned:

- Video stream: H.264, 1280x720.
- Audio stream: AAC stereo.
- Subtitle stream: ASS, index `2`.
- Stream endpoint: `/Videos/{itemId}/stream` returns Matroska with byte-range support.
- Subtitle endpoint: `/Videos/{itemId}/{mediaSourceId}/Subtitles/2/Stream.ass` returns Aegisub/ASS text.

The current backend container does not have `ffmpeg` or `ffprobe`, so Phase 98 needs either a backend image change or a dedicated render worker image.

## How To Run

This spike used the local `.env` Jellyfin settings, then ran FFmpeg through a temporary Docker image with `libass` enabled.

High-level command shape:

```text
ffmpeg -ss 0 -t 20 -i "$JELLYFIN_STREAM_URL" \
  -vf "subtitles=/work/ep01-track2.ass" \
  -map 0:v:0 -map 0:a:0 -sn -dn -map_metadata -1 \
  -c:v libx264 -preset veryfast -crf 26 \
  -c:a aac -b:a 128k -movflags +faststart \
  /work/ep01-0-20-clean-ass-audio.mp4
```

Do not commit the generated media/subtitle files. They are ignored in this directory.

## What To Expect

The generated clean output should contain exactly:

- One H.264 video stream at 1280x720.
- One AAC stereo audio stream.
- About 20 seconds duration.
- No separate subtitle/data stream in the MP4; subtitles are part of the rendered picture path.

## Investigation Trail

1. Checked the real DB state for Viper's Creed release variants and streams.
2. Confirmed EP01 has a Jellyfin item ID and a segment playback source.
3. Queried Jellyfin item metadata with `MediaSources`, `MediaStreams`, `Path`, and `RunTimeTicks`.
4. Confirmed the episode stream supports HTTP range requests and returns `video/x-matroska`.
5. Confirmed Jellyfin exposes ASS subtitle stream index `2`.
6. Pulled `jrottenberg/ffmpeg:6.1-alpine`, which includes `libass`.
7. Rendered a 20-second segment from the Jellyfin HTTP stream plus downloaded ASS track.
8. Verified the first output had video and audio but still included an extra data/subtitle handler.
9. Re-rendered with `-sn -dn -map_metadata -1` to produce the clean video+audio-only MP4.
10. Verified a frame from the clean MP4 visually shows the OP/Kara/title output.

## Results

Verdict: VALIDATED.

Evidence:

- `ffprobe-clean-output.json` shows a 20.020 second MP4 with exactly two streams:
  - `video:h264`, 1280x720, duration 20.020 seconds.
  - `audio:aac`, stereo, duration 20.000 seconds.
- Local generated proof files:
  - `ep01-0-20-clean-ass-audio.mp4`
  - `ep01-clean-frame-10s.jpg`

Key constraints for Phase 98:

- Rendering is feasible through Jellyfin API/HTTP access.
- Audio works and must be explicitly mapped.
- ASS subtitle/Kara extraction works for this item.
- The backend image currently lacks FFmpeg, so rendering needs image/workflow support.
- Logs must be sanitized because FFmpeg prints input URLs that can include API keys.
