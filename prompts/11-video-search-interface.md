# Interfaz de búsqueda de vídeos

**Approved on:** 2026-11-17
**Approved by:** El equipo, según confirmación del solicitante en esta conversación.
**Used for:** Tarea 34, interfaz pública de búsqueda de vídeos (US-08).

## Prompt

34- Completar la interfaz de búsqueda de vídeos

OBJETIVO

Permitir introducir una búsqueda, consultar sus resultados y abrir un vídeo.

CRITERIOS DE ACEPTACIÓN

- Proporcionar un campo de búsqueda accesible desde la navegación acordada.
- Permitir enviar la consulta mediante teclado y el control correspondiente.
- Conectar la búsqueda con la API de la tarea 33.
- Mostrar los resultados con título y miniatura, respetando el orden recibido.
- Permitir cargar resultados adicionales.
- Abrir la página de reproducción al seleccionar un resultado.
- Mostrar estados de carga, ausencia de coincidencias y error.
- Aplicar el comportamiento acordado para una búsqueda vacía.
- Evitar mezclar resultados de consultas diferentes o mostrar respuestas antiguas sobre una búsqueda más reciente.
- Permitir buscar sin iniciar sesión.
- Aplicar el estándar visual y funcionar con teclado, móvil y escritorio.
- Incluir pruebas de búsqueda, resultados, navegación, paginación y errores.
- Funcionar integrada y superar revisión y CI.

DEPENDENCIAS

- Tarea 30: contrato para comenzar.
- Tarea 33: API de búsqueda para integrar.
- Catálogo y página de reproducción existentes.
- Estándar visual de la tarea 14.

REFERENCIA

US-08 — Buscar vídeos.

## Notes

El contrato de la API está en [VIDEO_SEARCH.md](../docs/VIDEO_SEARCH.md).
El equipo aprobó registrar la solicitud como prompt el 2026-11-17.
