# Quick Context

## Bug

On the segment editor for a shared segment, saving a per-episode time override succeeded but reopening the segment showed the base start time again (`00:00:00`).

## Root Cause

The segment assignment response exposed only `has_override`. It did not expose the persisted override start/end values, so the panel could not restore the saved start time and defaulted to `editingSegment.start_time`.

## Decision

Extend the existing assignment response with optional `override_start_time` and `override_end_time` fields. Keep the existing override endpoint and storage model; do not add a parallel request or client-side persistence mechanism.
