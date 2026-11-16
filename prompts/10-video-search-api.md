# Búsqueda backend US-08

**Approved on:** 2026-11-16.
**Approved by:** El equipo, según confirmación expresa del solicitante en esta conversación.
**Used for:** API pública de búsqueda por título o descripción, pruebas y documentación.

Reutiliza la orientación de capas y pruebas de `prompts/02-layered-api.md`.
La nueva especificación de búsqueda y este prompt fueron revisados y aprobados
por el equipo, según confirmó el solicitante el 2026-11-16.

## Prompt

Solicitud original: implementar la API de búsqueda de vídeos US-08 únicamente
en backend, tras revisar AGENTS.md, REQUIREMENT.md, documentación y catálogo;
crear rama exclusiva desde main actualizado sin perder cambios; reutilizar
persistencia, DTOs y paginación; no inventar contrato ni relevancia si faltan.
Cubrir título, descripción, relevancia, empates, paginación, vacíos, ausencia de
coincidencias, parámetros inválidos, máximo, acceso público y entradas maliciosas
con pruebas persistidas; ejecutar validaciones y CI aplicables; documentar el
contrato y registrar el prompt; usar commit-ai-change, commit con referencias a
US-08, IA y prompt, push y PR a main sin merge ni force push y sin otras tareas.

El solicitante aclaró que no existía acuerdo previo y proporcionó esta nueva
propuesta, pendiente de aprobación del equipo:

- `GET /api/videos/search`, parámetro `q`, público sin autenticación.
- `page=0`, `size=12`, máximo 50; respuesta existente `items/page/size/hasNext`,
  con identificador, título y miniatura como mínimo.
- Quitar espacios exteriores; buscar la frase como subcadena en título o
  descripción, sin distinguir mayúsculas, conservando distinción de acentos.
- Coincidencias en título primero; después solo descripción; ID ascendente
  para empates y sin duplicados al coincidir ambos campos.
- Consulta vacía o de espacios: HTTP 200, items vacío, hasNext false,
  metadatos de paginación correspondientes.
- Rechazar page negativo, size no positivo o mayor que 50; errores según
  convenciones existentes; consultas seguras y parametrizadas.
- Documentar como decisiones nuevas, no previamente aprobadas; comprobar
  revisión del equipo antes de registrar aprobación o completar el commit.
  Preparar trabajo y explicar la aprobación que falta; completar commit,
  push y PR una vez satisfechas las reglas, sin merge.

Última instrucción: continuar desde el estado existente, revisar repositorio y
cambios antes de continuar, sin repetir modificaciones ya completadas.

## Notes

Rama de trabajo: `feat/video-search-api`, creada desde main sincronizado con
origin/main y árbol limpio. La especificación completa de la propuesta está en
[VIDEO_SEARCH.md](../docs/VIDEO_SEARCH.md). La aprobación actual se registra arriba.

Confirmación del solicitante: «El equipo ha revisado y aprobado el contrato de búsqueda y el prompt correspondiente».
