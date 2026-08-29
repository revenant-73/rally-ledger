# Live Gym Readability Plan

Last updated: 2026-08-29

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
   - Optimize for tablets and large modern phones used at the scorer's table.

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

## Completed Follow-Up

- Add wake-lock support while a match is active so the screen is less likely to dim or sleep at the scorer's table. Browsers that do not support wake lock continue normally.
- Add a device-local Table Mode toggle in Match Actions to compact the live header and bottom controls when screen space is tight.
- Add a device-local Bright Gym Mode toggle in Match Actions for a lighter, higher-contrast live screen in bright gyms.
- Add a device-local Scorer Focus Mode toggle in Match Actions that keeps Undo visible while moving lower-priority actions and score corrections into Match Actions.
- Add a compact recent-rally audit strip so scorers can quickly confirm the last few points without opening reports.
- Tighten the recent-rally audit strip for tablet landscape layouts so it supports verification without stealing too much height from the court and rally-entry controls.

## Remaining Roadmap

- Validate live scoring at tablet and large modern phone sizes, not small-phone layouts.
- Confirm the court, rally-entry controls, recent-rally strip, Undo, and Match Actions remain visible and tappable in iPad portrait and landscape.
- Tune density only where real scorer-table use shows friction; avoid making the score larger at the expense of the working controls.
- Consider a stronger "game mode" visual treatment if bright-gym feedback still shows contrast problems after the current Bright Gym Mode pass.
