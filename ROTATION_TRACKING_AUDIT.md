# Rotation tracking audit - October 1, 2026

## Convention

R1 is the base lineup, independent of whether the team starts serving or receiving. A serving win, serving loss, or receiving loss keeps the rotation. A receiving win advances R1 to R2 (and R6 to R1). Choose starting R1-R6 before each set for opponent matchups; keep the base lineup slots consistent rather than renumbering the lineup to match its starting court positions. Substitutes inherit the replaced player's slot.

## Findings and local fixes

- Sideout advancement already followed this convention.
- Next-set setup inherited the ending rotation and possession. New sets now default to R1 and serving; confirm serving/receiving before starting each set.
- During a service run, replay retained the previous rally's server even after a substitution. Current server selection now uses current slot personnel, while historical rally server IDs stay unchanged.
- Initial server selection could prefer an inconsistent initialServerId over the slot mapping. Slot personnel now takes priority.
- An unmapped slot could fall back to the initial server after sideout, falsely attributing another slot's serves. That fallback was removed.
- Live substitution selection previously swapped two on-court players. It now only permits replacing a slot with a bench player. Setup lineup editing still supports swaps.
- New rallies capture lineupSnapshot in addition to startRotation and serverId. Historical records without snapshots remain supported. No metadata key, database schema, or historical data was migrated.
- Setup now previews the first server after sideout when starting receiving and labels court personnel with their rotation slots as well as physical positions.

## Historical limits

Sunset set four records Baylee and Tiffany serving in R4, consistent with the coach's substitution account. Sets one through three contain within-set server/slot inconsistencies. These mechanisms can explain inaccurate attribution, but the old records lack the lineup history needed to prove the exact cause. Do not automatically rewrite those records or treat pooled historical R1-R6 statistics as consistent personnel configurations. Different base lineups still require care when combining rotation statistics across sets or matches.

## Verification

Full suite: 32 files, 134 tests passed before the additional UI regression test. Targeted model/UI suite: 39 tests passed after the UI test. ESLint and TypeScript/Vite/PWA production build passed. Authenticated browser/device and production verification remain outstanding; changes are local.
