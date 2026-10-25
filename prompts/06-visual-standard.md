# Tarea 15 — Unificar el diseño del frontend y definir el estándar visual

**Approved on:** 2026-10-25
**Approved by:** Team approval explicitly confirmed by the user in this chat: "Sí, está aprobado".
**Used for:** Shared green visual standard for the existing catalog, playback page and components; branch `visual-standard`.

## Prompt

15 - Unificar el diseño del frontend y definir el estándar visual

OBJETIVO
Mejorar las pantallas existentes y establecer una base visual reutilizable para las siguientes funcionalidades, utilizando el verde como color principal.

CRITERIOS DE ACEPTACIÓN

- Revisar el catálogo, la reproducción y los componentes compartidos para identificar inconsistencias.
- Definir una paleta con verde principal, variantes para interacción, colores neutros y colores de estado.
- Comprobar que los textos y controles mantienen un contraste legible.
- Centralizar colores, tipografía, espaciados, bordes y tamaños en variables o tokens de diseño.
- Definir reglas comunes de anchura de contenido y adaptación a móvil y escritorio.
- Unificar los componentes existentes, como cabecera, botones, tarjetas y mensajes de estado.
- Aplicar el estándar al catálogo y a la página de reproducción.
- Diferenciar visualmente los estados de interacción, incluido el foco de teclado.
- Mantener operativos el listado, la carga adicional, la reproducción y la visualización de comentarios.
- Documentar las reglas y ejemplos de uso en una guía accesible para el equipo.
- Revisar el resultado en móvil y escritorio con otro miembro(responsive).

ahora haz esta tarea. recuerda revisar previamente las pull request. llama a la rama visual standard

## User clarifications

- Team approval for the task prompt and AI use: "Sí, está aprobado".
- Joint mobile/desktop review: "Deja la revisión conjunta pendiente".
- Git branch names cannot contain spaces; use `visual-standard` as requested, without the default codex/ prefix.

## Notes

AI-assisted with Codex. Reviewed integrated PRs #7, #8 and #9 and the open Compose PR #10 before implementation. Start from origin/main, preserve the unrelated local `tooling/videoGrabber/vars.py` change and leave Compose untouched.

Scope: semantic CSS tokens, shared light/green layout, header/navigation, cards, buttons, messages, detail/comments, contrast verification and responsive regression tests. Retain API contracts, pagination logic, video sources and native controls. No external fonts, asset downloads or additional runtime dependency. Existing logo colors are preserved.

Use commit-ai-change for this completed change. No push, PR creation or merge was requested for this task. Team review on devices remains explicitly pending in docs/VISUAL_STANDARD.md.

## Validation

- TypeScript application/config and Playwright type checks passed.
- Vite production build, ESLint and targeted Prettier check passed.
- Jest: six suites, 26 tests and one snapshot passed. Coverage: 95.19% lines, 92.18% branches, 91.42% functions; existing thresholds retained.
- Playwright: 12 checks passed, including real API pagination, detail, comments, keyboard focus, 320/390/768/1440px layouts, long text, reduced motion and native playback of a valid Chromium-generated WebM at 390 and 1440px.
- Seventeen semantic contrast pairs passed the configured 4.5:1 text / 3:1 focus-control thresholds. Source references and exact usage are in the guide; no full accessibility certification is claimed.
- Inspected catalog and detail screenshots on mobile and desktop. Test thumbnail illustrations and media bytes are synthetic; no production media were modified.
- The default E2E port was occupied; used configurable E2E_API_PORT=18085 and E2E_WEB_PORT=15175 without stopping the existing service.
- Backend code and deployment files are unchanged. GitHub Actions execution and a joint review with a teammate are not claimed; the latter is explicitly deferred by the user.
