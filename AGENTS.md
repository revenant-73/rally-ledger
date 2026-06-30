# Repository Guidelines

Rally Ledger is a live volleyball match-tracking application designed for fast, real-time data entry and coaching decision support. It is built with React, TypeScript, Vite, and Drizzle ORM (using LibSQL).

## Project Structure & Module Organization

- **`.\src\db`**: Database layer using Drizzle ORM.
  - `.\src\db\schema.ts`: Defines the relational schema (Matches, Sets, Rallies, Players, etc.).
  - `.\src\db\client.ts`: Initializes the LibSQL client for local/remote data persistence.
- **`.\src\context`**: State management using React Context API (e.g., `.\src\context\MatchContext.tsx`).
- **`.\src\components`**: UI components. Layout-level components are stored directly here (e.g., `.\src\components\Layout.tsx`).
- **`.\src\pages`**: Application views corresponding to routing.
- **`.\src\utils`**: Pure helper functions and business logic.
- **`.\src\types`**: TypeScript interface and type definitions.

The application is a Progressive Web App (PWA) configured via `.\vite.config.ts`.

## Build, Test, and Development Commands

Commands are managed via `npm`:

- **Development**: `npm run dev` (Starts Vite dev server)
- **Build**: `npm run build` (Runs type checking with `tsc -b` and then `vite build`)
- **Lint**: `npm run lint` (Runs ESLint across the project)
- **Preview**: `npm run preview` (Local preview of the production build)

## Coding Style & Naming Conventions

- **Tooling**: Enforced via ESLint (`.\eslint.config.js`) and TypeScript (`.\tsconfig.json`).
- **React**: Functional components with Hooks. `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` are active.
- **TypeScript**: Strict mode features enabled in `.\tsconfig.app.json` (e.g., `noUnusedLocals`, `noUnusedParameters`).
- **Styling**: Tailwind CSS v4 is used via `@tailwindcss/vite`.
- **Imports**: Uses standard ES modules. `verbatimModuleSyntax` is enabled in TypeScript.

## Testing Guidelines

No automated testing framework (Vitest/Jest) is currently configured in `.\package.json`. Manual verification via `npm run dev` and `npm run lint` is the primary quality check.

## Database Guidelines

Schema changes should be reflected in `.\src\db\schema.ts`. Drizzle Kit is installed as a dev dependency for managing migrations.

### Flexible Schema Pattern
All major tables include a `metadata` column using `text(..., { mode: 'json' })`. This allows storing arbitrary, nested data without requiring schema migrations. 
- **Usage**: Access via `entity.metadata?.someField`. 
- **Storage**: Drizzle automatically handles serialization/deserialization.

### Roster Management Pattern
The application supports multiple teams/rosters.
- **`activeTeam`**: Managed in `MatchContext`. When a team is selected, `refreshData` filtered the players by `teamId`.
- **Roster Selection**: Always prefer selecting an existing roster from the dropdown in the "New Match" flow to ensure historical data consistency.
- **Player Sync**: Players are bound to a specific `teamId`.

### Live Match Persistence
The application uses a **DB-first persistence** strategy for live tracking.
- **`activeMatch` & `activeSet`**: These are automatically recovered from Turso if they exist with a `status: 'active'`.
- **Sync Status**: The `isSyncing` boolean in `MatchContext` tracks pending Turso operations and is displayed in the global `Layout`.

## Git & Contribution Guidelines

- **Repository**: Managed on GitHub at [revenant-73/rally-ledger](https://github.com/revenant-73/rally-ledger.git).
- **Branching**: The primary development branch is `main`.
- **Commits**: Use concise, descriptive commit messages.
