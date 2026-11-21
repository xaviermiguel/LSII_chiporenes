# Interfaz de likes en comentarios

**Approved on:** 2026-11-21
**Approved by:** El equipo, según confirmación del solicitante.
**Used for:** Interfaz de likes en comentarios (US-10).

## Prompt

OBJETIVO

Mostrar los likes de cada comentario y permitir que el usuario añada o retire su reacción.

CRITERIOS DE ACEPTACIÓN

- Mostrar el contador de likes, incluido el valor cero.
- Mostrar si el usuario autenticado ya ha dado like.
- Permitir añadir o retirar la reacción mediante la API real.
- Actualizar el contador y el estado visual con el resultado confirmado.
- Evitar envíos repetidos mientras se procesa la operación.
- Mantener el estado correcto si una petición falla.
- Mostrar un mensaje claro ante errores o caducidad de sesión.
- Solicitar inicio de sesión al visitante que intente reaccionar.
- Conservar el contador y el estado correctos después de recargar.
- Diferenciar el estado activo mediante un indicador accesible, además del color.
- Permitir accionar el control con teclado.
- Incluir pruebas de añadir, retirar, carga inicial, autenticación y errores.
- Funcionar integrada y superar revisión y CI.

DEPENDENCIAS

- Tarea 30: contrato para comenzar.
- Tarea 39: API de likes para integrar.
- Apartado visual de comentarios existente.
- Tarea 23: sesión del frontend.
- Coordinación con las tareas 36 y 38 para evitar cambios incompatibles.

REFERENCIA

Parte de US-10 — Responder a comentarios y darles likes.

## Notes

El contrato de la tarea 39 admite likes en comentarios principales.
