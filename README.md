# Century Matchbook

Century Matchbook is the production courtside volleyball scorer for Century teams. It is optimized for fast, tablet-friendly rally entry, live coaching context, and set-by-set match review.

## Primary application

The authenticated root route (`/`) is the active product. It provides:

- team roster and lineup management
- live terminal-event rally tracking with undo and correction
- derived score, serving state, rotation, and server context
- multi-set match storage and season reports
- match and player reports that can be scoped to an individual set

`/matchbook` redirects to the same application. The old `/prototype` URL remains only as a compatibility redirect.

## Repository layout

- `src/pages/CourtsideMatchbook.tsx` — primary courtside application
- `src/matchbook/` — rally model, derived statistics, and cloud document contract for the primary application
- `src/pages/` and `src/components/` — retained legacy workflow and shared UI; routes under `/app` are not the primary scorer
- `docs/courtside-matchbook-product-brief.md` — product behavior and scoring principles
- `docs/courtside-matchbook-ux.md` — courtside UX direction

The primary app retains the existing `matchbookPrototypeV1` metadata and local-storage keys for compatibility with saved team data. Those names are implementation history, not product status; do not change them without a data migration.

## Development

```bash
npm run dev
npm run lint
npm run test -- --run
npm run build
```

For the detailed product and technical model, see [rally-ledger-technical-guide.md](rally-ledger-technical-guide.md).
