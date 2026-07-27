# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## Unreleased

### Fixed
- Persisted `servingTeam` to `Set.metadata` (previously only local React state), so a page reload/crash mid-match no longer loses track of who's serving. Also persists on manual toggle, on every rally completion, and restores it correctly on undo. Added a matching fix so `undoLastRallyWithLogic` also persists the restored rotation/lineup back to `Set.metadata`, instead of only updating local state.
- Fixed the test suite's Vitest environment (`node` → `jsdom`) so `@testing-library/react`'s `renderHook` can actually run — it was failing with `document is not defined` on every hook test before this.

## 2026-07-26

### Security
- Removed `.env` from git tracking and added it to `.gitignore`; added `.env.example` as a template.
- Rotated the exposed Turso database auth token and purged the old value from git history (force-pushed rewritten history).
- Updated Netlify environment variables with the new Turso credentials.

### Fixed
- Fixed TypeScript build errors blocking Netlify deploys: unsafe dynamic index into `Lineup` in `RallyEntryArea.tsx` (cast as `keyof Lineup`, matching the existing pattern in `RotationDisplay.tsx`), and a stray `outcome` prop passed to `RallyEntryArea` that it doesn't declare.
