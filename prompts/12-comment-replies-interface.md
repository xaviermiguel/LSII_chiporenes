# Interfaz de respuestas a comentarios

**Approved on:** 2026-11-17
**Approved by:** El equipo, según confirmación del solicitante.
**Used for:** Tarea 38, interfaz de respuestas a comentarios (US-10).

## Prompt

38- Completar la interfaz de respuestas a comentarios

OBJETIVO

Permitir responder desde la página del vídeo y mostrar las respuestas debajo del comentario original.

CRITERIOS DE ACEPTACIÓN

- Mostrar la acción de responder en los comentarios principales.
- Solicitar inicio de sesión al visitante que intente responder.
- Permitir escribir y enviar una respuesta al comentario seleccionado.
- Conectar el formulario con la API de la tarea 37.
- Validar el texto y mostrar el estado de envío.
- Evitar envíos repetidos mientras se procesa la petición.
- Mostrar la respuesta confirmada debajo del comentario correcto e identificar a su autor.
- Mantener las respuestas visibles después de recargar.
- Conservar el texto si falla la publicación.
- Gestionar errores y sesiones caducadas.
- Mostrar el contenido como texto sin ejecutar HTML o scripts.
- Aplicar el estándar visual y permitir el uso con teclado.
- Incluir pruebas de envío, asociación visual, autenticación y errores.
- Funcionar integrada y superar revisión y CI.

DEPENDENCIAS

- Tarea 30: contrato para comenzar.
- Tarea 37: API de respuestas para integrar.
- Apartado de comentarios existente y coordinación con la tarea 36.
- Tarea 23: sesión del frontend.

REFERENCIA

Parte de US-10 — Responder a comentarios y darles likes.

> ya he hecho update en main de los cambios de la tarea 37, actualiza esta rama y acaba de desarrollar en base a los cambios nuevos

## Notes

Contrato de integración en [sprint1-api.md](../docs/sprint1-api.md#responder-a-un-comentario-principal-us-10).
