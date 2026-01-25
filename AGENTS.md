# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, API routes, and global styles (`app/globals.css`).
- `src/`: Shared TypeScript UI logic (`components/`, `hooks/`, `lib/`, `types/`) plus Python-based analysis pipeline modules (e.g., `alerts/`, `analysis/`, `ingestion/`, `prediction/`).
- `public/`: Static assets served by Next.js.
- `tests/`: Python unittest suite.
- `scripts/`: Local developer scripts (e.g., port cleanup for Next dev server).

## Build, Test, and Development Commands
- `pnpm dev`: Run Next.js dev server on `0.0.0.0:3000` (override with `PORT`).
- `pnpm dev:clean`: Clears stale dev locks and frees the port, then starts dev server.
- `pnpm build`: Create a production build.
- `pnpm start`: Start the production server (defaults to `PORT=10000`).
- `pnpm lint`: Run ESLint against `app/` and `src/`.
- `pnpm type-check`: TypeScript type-check only.
- `pnpm analyze`: Bundle analyzer build.
- `python -m unittest discover -s tests`: Run Python unit tests (requires Python deps used in tests).

## Coding Style & Naming Conventions
- TypeScript/React uses 2-space indentation; follow existing formatting in nearby files.
- Component files are PascalCase (e.g., `DashboardClient.tsx`); hooks use `useX` naming.
- Linting is enforced via ESLint (`eslint.config.mjs`); fix lint before committing.
- Tailwind CSS is used for styling; prefer utility classes over ad-hoc CSS.

## Testing Guidelines
- Python tests live in `tests/` and use `unittest`.
- Name tests with `test_*.py` and test methods with `test_*`.
- Ensure tests cover new Python logic; front-end changes should include a quick manual UI check.

## Commit & Pull Request Guidelines
- No strict commit convention is established in recent history; use short, descriptive, imperative messages.
- PRs should include: a clear summary, rationale for changes, and screenshots for UI updates.
- Link related issues when applicable and note any config or env changes.

## Security & Configuration Tips
- Local secrets live in `.env.local` (e.g., `GOOGLE_GEMINI_API_KEY`).
- Do not commit `.env.local` or API keys; document required variables in PRs.
