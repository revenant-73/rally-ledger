# Reports Page Brief

Objective: Build a real Rally Ledger application page for cumulative season reporting.

Target audience: Volleyball coaches reviewing team trends and player development from a phone after practice or from a laptop before planning the next training block.

Aesthetic direction: Match the existing Rally Ledger app: dark background, compact high-density stat cards, teal highlights for positive/primary data, green for earned/strong outcomes, amber for caution, red for leaks/errors. Avoid marketing-style hero sections.

Content structure:

- Header with a back/home action, title `Reports`, and compact season/team context.
- Team selector when more than one team exists.
- Top season snapshot: matches, record, sets, rallies, earned/gifted balance.
- Team skill cards: serve-in percentage, serve KO percentage, pass score, biggest weapon, biggest leak.
- Player leaderboards for serving and receiving.
- Match trend table with opponent, date, result, earned/gifted balance, serve percentage, KO percentage, and pass score.
- Empty states for no teams, no matches, and no rallies.

Technical constraints:

- Use React, TypeScript, Vite, existing Tailwind v4 brand classes, and lucide-react icons.
- Use existing hooks `useAuth` and `useMatch`.
- Fetch season data from `/.netlify/functions/matches` with `{ action: 'seasonReport', userId, teamIds }`.
- Normalize rallies with `normalizeRallies`.
- Calculate cumulative stats with `calculateSeasonReportStats`.
- Use `apiPost` for server calls.
- Keep the page mobile-first and readable at `320px` width.
- Do not add dependencies.

Output path: `src/pages/Reports.tsx`.
