# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## Unreleased

### Added
- Added a reusable `useFocusTrap` hook (`src/hooks/useFocusTrap.ts`) and wired it into all four live-match modals (`SubstitutionModal`, `NoteModal`, `TimeoutModal`, `MoreMenuModal`): traps Tab focus inside the modal while open, closes on Escape, restores focus to the triggering element on close, and adds `role="dialog"`/`aria-modal`/`aria-labelledby`. Also added `aria-label`s to icon-only buttons that previously had none (rotation position buttons, manual-rotate button, scoreboard +/- buttons, header back button, modal close buttons).

### Changed
- Narrowed `useUpdateSet`'s cache invalidation from the entire `['sets']` query key space down to the specific `['sets', 'active', matchId]` entry (the only `sets` query that exists), avoiding wider-than-necessary refetches on every lineup/rotation/score update during a live match. Falls back to the broad invalidation only if `matchId` isn't known.
- Enabled `"strict": true` in `tsconfig.app.json`. The codebase already compiled clean under it — no null-safety bugs were surfaced, but strict mode now guards against them going forward given how much of the live-match state (`activeSet`, `currentLineup`, etc.) is nullable.
- Replaced the two `as any` casts in `useRallies.ts` (rally insert payload, optimistic set-cache update) with an explicit `typeof rallyEventsTable.$inferInsert`-typed object and a properly typed `Set | null | undefined` cache updater, so Drizzle/TypeScript can actually catch shape mismatches again.

### Removed
- Deleted `src/utils/rotation.ts` (`rotateLineup`, `getPlayerInPosition`, `getCurrentServerPosition`) — dead code, unused anywhere in the app. `RotationDisplay.tsx` has its own working (and different) rotation math inline; having two independent implementations was a maintenance hazard.

### Changed
- Removed ~25 leftover debug `console.log` statements (and the render/state-change `useEffect`s that existed solely to log) from `main.tsx`, `MatchContext.tsx`, `useLiveMatchLogic.ts`, `LiveMatch.tsx`, `RotationDisplay.tsx`, and `useRallies.ts`. Added a `no-console` ESLint rule (allowing `warn`/`error`) to prevent recurrence.

### Fixed
- Added error handling to substitution/libero handlers (`handleSubstitution`, `handleLiberoSwap`, `handleSetLiberoServing`): failed saves now roll back the optimistic local lineup/libero state and surface an error toast, instead of silently leaving the UI showing a lineup change that was never persisted.
- Routed manual score +/- adjustments through the rally log instead of writing directly to `Set.ourScore`/`opponentScore`. They're now recorded as `RallyEvent`s with `classification: 'Neutral'` (excluded from earned/gifted stats), so the Undo button correctly undoes them and the rally history no longer silently drifts from the displayed score. Also added error handling/toast on failure, matching normal rally completion.
- Persisted `servingTeam` to `Set.metadata` (previously only local React state), so a page reload/crash mid-match no longer loses track of who's serving. Also persists on manual toggle, on every rally completion, and restores it correctly on undo. Added a matching fix so `undoLastRallyWithLogic` also persists the restored rotation/lineup back to `Set.metadata`, instead of only updating local state.
- Fixed the test suite's Vitest environment (`node` → `jsdom`) so `@testing-library/react`'s `renderHook` can actually run — it was failing with `document is not defined` on every hook test before this.

## 2026-07-26

### Security
- Removed `.env` from git tracking and added it to `.gitignore`; added `.env.example` as a template.
- Rotated the exposed Turso database auth token and purged the old value from git history (force-pushed rewritten history).
- Updated Netlify environment variables with the new Turso credentials.

### Fixed
- Fixed TypeScript build errors blocking Netlify deploys: unsafe dynamic index into `Lineup` in `RallyEntryArea.tsx` (cast as `keyof Lineup`, matching the existing pattern in `RotationDisplay.tsx`), and a stray `outcome` prop passed to `RallyEntryArea` that it doesn't declare.
