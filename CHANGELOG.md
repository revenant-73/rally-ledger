# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## Unreleased

### Added
- Added a reporting roadmap (`docs/reporting-roadmap.md`) plus the first reporting implementation slice: shared report stat helpers, single-match copy/text/CSV exports, season copy/text/CSV exports, and a cumulative `/reports` page backed by a new `seasonReport` Netlify Function action.
- Added print/save-to-PDF report controls and print-specific styles for match and season reports.
- Expanded season downloads into a coach-ready CSV package with summary, match trends, player totals, serving, receiving, opponent breakdown, and practice plan files.
- Added cumulative report filters for date range, match type, opponent, and result, with filtered stats/export behavior and a clear-filters action.
- Added match deletion from History and match detail, with authorized server-side deletion of match sets and rallies.
- Added explicit match-finish actions so coaches can complete a match as a win or loss without needing a best-of-five set count.
- Added expandable all-player serving and receiving stat tables to the cumulative Reports page.
- Added kill reporting to match and season reports, including kills vs attack errors, kill/error net, all-player cumulative rows, and dedicated kill-report CSV exports.
- Added cumulative point earner and point gifter leaderboards across all attributed earned/gifted rallies, including a dedicated point-leaders CSV export.
- Added an earned/net sort toggle to the cumulative point earners report.
- Added a stats audit document covering source fields, formulas, live dashboard derivations, and report/export coverage.
- Added visible individual-match kill performance and match-trend kill/error columns to season reports.
- Added match format setup for best-of-three, best-of-five, two-set scrimmages, and single-set matches, including set target and deciding-set target tracking.
- Added per-set opponent earned/gifted splits to match reports and set CSV exports so point-source totals are easier to audit.
- Added a visible `SUB` marker on live court tiles when the current player differs from the starting player for that rotation slot.
- Added a live gym readability plan and tightened the live match view with a more compact scoreboard, stronger contrast, clearer court tiles, and larger rally-entry controls.
- Added screen wake-lock support while an active match set is open, with graceful fallback for unsupported browsers.
- Added a device-local Table Mode toggle in live Match Actions to compact the live header and bottom controls.
- Added a device-local Bright Gym Mode toggle in live Match Actions for a lighter, higher-contrast live screen in bright gyms.
- Added a device-local Scorer Focus Mode toggle that prioritizes the court and rally-entry controls while keeping lower-priority tools and score corrections in Match Actions.
- Added a team-level Gift Context report for match and season reports that groups unforced-error gifts by error type, serving state, score phase, score state, and rotation when available, with text/CSV export coverage.

### Fixed
- Fixed serve reporting for one-tap ACE/ERR entries by persisting inferred serve results on new rallies and inferring serve aces/errors from older outcome-only rally rows in reports and dashboards.
- Fixed serve/receive result helpers so stored quality metadata is ignored when it belongs to the wrong serving side.
- Fixed expanded serving reports so the `KO` count matches `KO%` by showing pressure serves as aces plus out-of-system serves, while preserving out-of-system as its own column.
- Fixed opponent serve-receive errors so opponent aces are saved as opponent earned points automatically instead of asking for a manual earned/gifted classification.
- Fixed match format defaults so League matches offer best-of-five set prep while Tournament matches default to best-of-three.
- Fixed the `react-hooks/set-state-in-effect` lint warning in `useLiveMatchLogic` by moving the activeSet-metadata sync out of a `useEffect` and into the render body, guarded by a `prevMetadata` comparison - React's documented pattern for "adjusting state when a prop changes," which avoids the extra commit-then-effect render pass.

### Security
- Replaced email-only "login" (anyone who knew a coach's email could sign in as them) with real password authentication. Added `users.password_hash` (bcrypt, via `bcryptjs`) and a Netlify Function (`netlify/functions/auth.ts`) that verifies credentials server-side rather than the browser querying the users table directly. Existing accounts created before this change (no password set yet) are claimed with the password given on next login rather than being locked out. `Login.tsx` now has a password field with a minimum length requirement.
- Dropped the orphaned `rally_events.rotation_number` column from the live DB (schema drift from a June refactor to metadata-based storage - the app never read this column since then; confirmed via inspection that only 6 old rows had it set, all with null metadata, i.e. not visible in any current UI/stats path).

### Added (offline reliability)
- Added an offline mutation queue so rally writes, score updates, and undos survive a lost gym-wifi connection or the app being killed mid-match, instead of silently rolling back with no persisted record they were ever attempted. Implementation: `PersistQueryClientProvider` (`@tanstack/react-query-persist-client`) with a custom IndexedDB persister (`src/db/queryPersister.ts`, via `idb-keyval`) persists the query/mutation cache; `addRally`/`updateSet`/`undoLastRally` mutation functions are registered as `queryClient` mutation defaults (keyed by `mutationKey`) so a paused mutation can be replayed on next launch without the original component closure; `resumePausedMutations()` runs after cache restore. Mutations also now retry (3x, exponential backoff) on transient failures instead of erroring immediately.

### Fixed
- Fixed 2 pre-existing failing tests in `useLiveMatchLogic.test.ts` caused by calling `completeRally` in the same `act()` block as the `setPointWinner`/`setOutcome` calls that fed it, so it read stale (null) state. Also wired up `src/test/setup.ts` (which imports `@testing-library/jest-dom`) into `vitest.config.ts` — it existed but was never referenced via `setupFiles`, so jest-dom matchers like `toBeInTheDocument` weren't available in any test.

### Added
- Added test coverage for previously-untested logic: substitution/libero-swap/libero-serving (including error-rollback paths), manual score adjustment (including zero-clamping), undo's metadata persistence, and `RotationDisplay`'s physical-zone-to-player rotation math (including the server-indicator logic).
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
