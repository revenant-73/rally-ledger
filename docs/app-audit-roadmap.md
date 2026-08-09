# Rally Ledger App Audit Roadmap

Last updated: 2026-08-09

## Current Health

- `npm run lint` passes.
- `npm run test -- --run` passes.
- `npm run build` passes.
- Vite reports a large client chunk, so code splitting is worth addressing after core reliability work.

## Highest Priority Changes

1. Move database writes behind server APIs.
   - The browser currently imports the LibSQL client and uses `VITE_TURSO_AUTH_TOKEN`.
   - Turso credentials should be server-only.
   - Netlify functions should enforce ownership and team/match authorization for reads and writes.
   - Settings reset, roster management, match creation, set updates, and rally entry should eventually go through server functions.

2. Make rally + score + live-state writes atomic.
   - Rally creation, set score update, and serving/rotation metadata should not be able to partially succeed.
   - Short-term improvement: use LibSQL batch writes for the rally insert and set update.
   - Longer-term improvement: move the full scoring command to a server function that validates ownership and writes all related state together.

3. Sort rallies explicitly before "latest rally" behavior.
   - Undo, recent trend calculations, and history views depend on rally order.
   - Queries should order rallies by `rallyNumber` and use `createdAt` as a tie-breaker where useful.

4. Hydrate rally metadata consistently.
   - Live queries map `serveResult`, `receiveResult`, and `receivePlayerId` out of `rally.metadata`.
   - Historical match details should use the same mapping so post-match serve and receive stats are accurate.

## Security Upgrades

- Replace localStorage-only auth with a real session token or cookie-backed session.
- Add rate limiting and signup controls to the auth function.
- Avoid returning or trusting mutable client-side user records as authority.
- Keep destructive operations, especially reset/delete flows, behind server authorization.

## Product And UX Upgrades

- Add a visible pending/offline queue count during live matches.
- Disable or debounce rapid repeated scoring taps while a point write is pending.
- Add clearer recovery messaging when a rally fails to save.
- Add export/share flows for post-match reports.
- Add match-level setup for best-of format, target scores, and deciding-set target.

## Analytics Upgrades

- Extract shared stat helpers for live dashboard and match detail pages.
- Add set-aware summaries using actual set records, not inferred rally order.
- Add tests for out-of-order rally rows, multi-set summaries, and historical metadata hydration.
- Track more context for first-ball side-out instead of approximating from outcome type alone.

## Performance Upgrades

- Code-split route-level pages, especially dashboard/history/report views.
- Avoid mutating arrays during render by copying before sorting.
- Consider memoized player lookup maps where dashboard calculations repeatedly call `players.find`.

## Suggested Implementation Order

1. Deterministic rally ordering and shared rally normalization.
2. Transaction-style rally + score persistence.
3. Rollback-safe live-state updates on failed rally saves.
4. Server API boundary for scoring and destructive writes.
5. Auth/session hardening.
6. Analytics cleanup and report upgrades.
7. Bundle/code-splitting pass.

## Implementation Notes

- Done: deterministic rally ordering and shared rally normalization.
- Done: live and historical rally reads hydrate metadata consistently.
- Done: live rally save and undo use one atomic write batch.
- Done: scoring and undo are moved behind a Netlify function.
- Done: match creation, match updates, set creation, and set updates are moved behind Netlify functions.
- Remaining: full credential hardening still requires moving remaining client-side database reads/writes and replacing localStorage-only auth with a real session.
