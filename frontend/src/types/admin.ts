// Barrel re-export: admin.ts was split into thematic files (quick-261018, CLAUDE.md
// 450-line limit) so no import site elsewhere in the repo needs to change.
// Keep this file as pure re-exports only -- add new admin types to one of the
// files below, never directly here.
export * from './admin-anime-core';
export * from './admin-jellyfin';
export * from './admin-theme-segment';
