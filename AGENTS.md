# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. `App.tsx` contains the study interface, `main.tsx` is the browser entry point, `hooks/` holds React state logic, and `types.ts` defines shared models. JSON study collections live under `src/data/`. Tests sit beside application code (`src/App.test.tsx`), with shared setup in `src/test/setup.ts`. Static PWA icons belong in `public/`; generated `dist/` output should not be committed.

## Build, Test, and Development Commands

Use Node.js 20.19 or newer and install the locked dependency set with `npm ci`.

- `npm run dev` starts Vite on the local network with the `/tk/` base path.
- `npm run build` runs TypeScript project checks and creates the production bundle.
- `npm run lint` performs strict TypeScript validation.
- `npm test` runs the Vitest suite once in jsdom.
- `npm run preview` serves the completed production build locally.

Run `npm run lint && npm test && npm run build` before opening a pull request.

## Coding Style & Naming Conventions

Follow the existing TypeScript style: two-space indentation, single quotes, no semicolons, and trailing commas in multiline structures. Use `PascalCase` for components and types, `camelCase` for functions and variables, and `useX` names for hooks. Prefer semantic elements and stable role or label queries. Preserve strict typing; avoid `any`.

Collection and card IDs must be unique and use lowercase kebab-style identifiers such as `business-core-01` and `bc01-001`.

## Testing & Content Guidelines

Tests use Vitest, Testing Library, and `@testing-library/jest-dom`. Name files `*.test.ts` or `*.test.tsx`, and test visible behavior. Clear `localStorage` when a test changes progress.

Completed translation and excerpt collections must contain exactly 100 cards. Translation hints must occur in their answer text, and excerpt keywords must occur in the joined passage. Update or extend validation tests whenever the JSON schema or study flow changes.

## Commit & Pull Request Guidelines

The repository has only one terse historical commit, so no established message convention exists. Use short, imperative subjects such as `Add keyboard navigation tests`. Keep commits focused. Pull requests should explain the user-visible change, list verification commands, link relevant issues, and include screenshots for layout or styling changes. Note any collection-data or PWA behavior changes explicitly.

## Deployment & Configuration

Pushes to `main` deploy `dist/` through GitHub Pages. Keep Vite's `/tk/` base path and PWA asset references aligned with the deployed repository path.
