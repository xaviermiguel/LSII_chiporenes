# Sprint 1 task 11: Docker Compose startup

**Approved on:** 2026-10-19
**Approved by:** Team approval explicitly confirmed by the user in this chat.
**Used for:** Package the integrated increment with PostgreSQL, embedded frontend,
automatic initialization, existing task 4 media and persistent data/files.

## Prompt

## 11- Preparar el arranque con Docker Compose

Arrancar el incremento con una base de datos real y el frontend incluido en el backend de producción. Automatizar la preparación inicial, permitir el acceso a los vídeos y conservar datos y archivos al reiniciar. Conseguir que funcione en un entorno limpio con Docker sin pasos manuales adicionales.

**Dependencias:** Configuración de la tarea 3 y datos de la tarea 4. Se verifica con las funciones integradas.

## User clarification

¿El equipo ha aprobado este prompt para la tarea 11?

Sí, está aprobado.

Para un entorno limpio, ¿cómo deben llegar los vídeos de la tarea 4 al despliegue?

Se entrega la carpeta de vídeos junto al proyecto y Compose la monta.

## Scope

Reuse the existing catalog, Flyway and importer; preserve unrelated local changes
and original media. Do not implement unrelated frontend features. Record real
build, startup and restart test results and report any unavailable Docker runtime.
Use the commit-ai-change skill. No push or merge requested.

## Validation before scope reduction (historical)

Compose configuration, shell/Python syntax, clean-source TypeScript/Vite production
build and executable Maven production packaging passed. A temporary H2 smoke test
confirmed the packaged React root, API and real media HTTP Range, with import off.
A temporary PostgreSQL-image container confirmed random secret generation, stable
repeat, mismatch rejection and UID 10001/400 permissions without displaying secrets.

Full clean-context Compose verification was stopped during image downloads when C:
had about 100 MiB free and Docker stopped responding normally. Only this task's
verification processes and reproducible temporary JARs were removed; no Docker
images, volumes, user data or original videos were deleted. Added a disk-space
preflight to the verifier. Actual integrated startup, PostgreSQL import and
container recreation/persistence remain pending until space is available.

## Scope adjustment requested by the user (2026-10-20)

> te he parado porque me he dado cuenta de que estabas haciendo de mas ya que la implementacion de las clases es algo correspondiente al backend que haran mis compañeros. Para no solaparnos ni crear merges conflicts, deshaz las partes correspondientes a frontend y backend y deja solo lo necesario o generico para el docker compose. seguiremos con esta implementacion cuando haga pull de las partes implementadas por mis compañeros.

Withdraw the provisional task 3/4 backend implementation from the current branch,
including its tests, migrations and Flyway dependencies. Preserve pre-existing
local changes in both applications and the original task 4 Python preparation.
Keep generic Docker packaging, PostgreSQL, secret initialization and read-only
media mounting. Remove importer-specific Compose options and the verifier tied
to provisional database tables. Retain credential sanitization to avoid restoring
versioned secrets. Preserve history and approved prompts for traceability.

The integrated task remains pending until the teammates' implementations are
pulled. Previous catalog test results describe withdrawn code and do not certify
the reduced current version. Do not resume full application verification now.

Reduced-scope checks on 2026-10-20: Compose configuration and both deployment
shell scripts passed syntax validation. No application build or startup was run
after the scope reduction. The task-specific builder is stopped; original media,
existing database storage and unrelated staged/unstaged changes are preserved.

## Resume after pulling the team implementation (2026-10-25)

> ya puedes seguir con la implementacion del compose. primero es INDISPENSABLE que hagas un pull de las novedades del proyecto. Una vez lo hagas, si hay algun conflicto de merge SIEMPRE acepta los cambios que vienen por parte del pull, ignora las implementaciones que hayamos hecho nosotros, imprescindible aceptar todos los cambios que vengan nuevos

Ran `git pull --no-rebase -X theirs origin main` on `codex/compose-startup` before
implementation. Incoming main is `cebd8bc`; merge commit `5986c06`. No unresolved
conflicts remain. Backend and frontend match incoming main exactly. Reuse the
approved task 11 prompt and commit-ai-change skill. Limit changes to deployment,
verification and documentation; integrate the importer, Flyway and paginated API
now supplied by main without modifying either application.

Validation on 2026-10-25: full multi-stage Docker production build passed with the
incoming backend/frontend unchanged. Fresh isolated Compose project initialized
generated credentials and PostgreSQL 16.15, applied Flyway and imported 21 real
videos plus 154 comments. Deployment verifier passed paginated catalog, all
details, empty-comments case, packaged assets, thumbnail and HTTP Range; recreated
containers without deleting volumes and confirmed identical rows/credentials and
all 63 original file hashes. Chromium smoke passed catalog, load-more, playback
and both comment cases without page errors. Maven packaging skips unit tests;
these results describe real deployment tests, not the full application unit suites.
No local PostgreSQL installation or original media was modified. Test project
protube-check-20261025 remains on http://127.0.0.1:18080. No push or merge into main.
