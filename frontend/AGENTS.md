# Frontend

Draft proposal pending team and professor review; not final.

React + TypeScript application built with Vite.

- Follow existing component, hook and naming conventions.
- Use `src/utils/Env.ts` for API and media URLs; do not hardcode addresses.
- Handle loading, error and empty states when fetching data.
- Use Jest and Testing Library for tests; mock API calls.

## Checks

Run from `frontend/`:
- `npm run build`
- `npm run lint`
- `npm run test -- --watchAll=false --ci`
