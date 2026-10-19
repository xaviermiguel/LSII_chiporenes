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

## Validation

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
