# Live Gym Readability Plan

Last updated: 2026-08-26

## Problem

The live scoring view can be hard to read and use in a bright gym. The issue is not that the score needs to be larger. The score is reference information; the primary work area is the court view and the rally-entry controls.

## Direction

Improve the live match screen for gym use by making the interface more compact, higher contrast, and easier to tap while preserving the fast scoring workflow.

## Priorities

1. Compact scoreboard
   - Reduce scoreboard height.
   - Keep the score visible and high contrast.
   - Avoid giving the score more screen space than the entry workflow.

2. Larger working area
   - Give more vertical space to the court and rally-entry area.
   - Keep the court visible while entering most points.
   - Avoid burying key actions below the fold on phones.

3. Stronger contrast
   - Use less transparent gray on the live screen.
   - Strengthen borders and active states.
   - Use bright text for labels that must be read quickly.

4. Better tap confidence
   - Make serve, receive, winner, and outcome buttons easier to hit.
   - Make selected/active state visually obvious.
   - Keep destructive or corrective controls visually secondary.

5. Court readability
   - Increase jersey number readability where possible.
   - Keep server, libero, and substitution markers obvious.
   - Reduce reliance on tiny low-contrast labels.

## First Implementation Slice

- Compact the scoreboard and server indicator.
- Strengthen contrast on live header, court, rally-entry panels, and action buttons.
- Keep score smaller than before.
- Preserve current workflows and data model.

## Later Options

- Add a device-local Bright Gym Mode toggle.
- Add a more aggressive Coach Table Mode that hides lower-priority controls.
- Add wake-lock support while a match is active.
- Add responsive density presets for very small phones.
