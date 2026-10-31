# Preparar las pruebas y los informes de cobertura

**Approved on:** 2026-10-20
**Approved by:** User authorization in this chat: "ahora si haz el commit". This records authorization to save and commit; it does not independently certify a team review.
**Used for:** Test tooling, coverage reports, PostgreSQL test execution, Playwright preparation and execution documentation on branch `testing`.

## Prompt

Tener funcionando las herramientas existentes de pruebas, los informes de frontend y backend y la comprobacion de cobertura superior al 50 % en cada aplicacion. Preparar la herramienta E2E y documentar como ejecutar las pruebas.

Dependencias: Proyecto ejecutable en desarrollo.

Follow-up scope instruction:

> desde la rama testing, revisa el primer prompt e implememtna esta tarea para el trabajo que ya hayan hecho mis compañeros. No acabes la aplicacion, solo centrate en preparar pruebas si no hay y lo que dice la tarea basicamente

The user initially requested leaving the changes uncommitted while approval was pending, then explicitly authorized the commit:

> ahora si haz el commit

## Notes

AI-assisted with Codex. Task: prepare tests and coverage reports for the existing increment. No production classes or application features changed. Use the `commit-ai-change` skill; no push or merge requested.

Retain existing 75% global coverage thresholds. Move JaCoCo reporting/checks to Maven verify. Separate Jest result output from Playwright output. Enable existing PostgreSQL tests in an isolated CI service and support configurable PostgreSQL ports and fresh-schema migration in the user repository test.

Prepare Playwright with an explicitly loaded test-only H2 configuration and synthetic SQL/media fixtures. Three checks call the real API; two browser checks simulate the existing UI contract. The frontend still expects string[] while the backend returns VideoPage; full browser-to-catalog integration remains pending and is documented rather than implemented here. Synthetic media bytes check HTTP Range, not video playback.

Validation performed during implementation on 2026-10-20: Jest 16 passed, line coverage 94.23%; Maven clean verify 45 passed and 10 optional tests skipped, line coverage 98.42%; PostgreSQL 16 isolated suite 54 passed and one local-store check skipped, line coverage 99.21%; Playwright 5 passed; TypeScript, Vite and ESLint passed. Test fixtures were absent from the production JAR. The temporary PostgreSQL container and its anonymous volume were removed. GitHub Actions execution itself has not been verified remotely.

Documentation: `docs/TESTING.md`. Only task changes and this prompt record belong in the commit.

## Pull request scope

User follow-up: "ya esta acabada la feature haz ahora la pull request solo de lo correspondiente a esta rama". Prepare `codex/testing-coverage-pr` from current `origin/main`, carrying only testing-related differences from `testing`; exclude Compose, deployment, video-grabber and production UI changes. The original `testing` branch remains intact.
