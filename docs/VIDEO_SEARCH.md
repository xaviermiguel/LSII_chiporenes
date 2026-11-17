# Búsqueda pública de vídeos — US-08

Estado: nueva decisión técnica proporcionada el 2026-11-16 y posteriormente
**revisada y aprobada por el equipo**, según confirmación expresa del solicitante
en esta conversación. No es un acuerdo anterior a esta tarea.

`GET /api/videos/search?q=blue%20sky&page=0&size=12` permite acceso anónimo.
Reutiliza `VideoPage` y `VideoSummary` del catálogo:

```json
{
  "items": [{"id": 42, "title": "Blue sky", "user": "Autor", "duration": null, "thumbnailUrl": "/media/8701.webp"}],
  "page": 0,
  "size": 12,
  "hasNext": false
}
```

Se eliminan los espacios exteriores (`String.strip`) de `q` y se busca la frase
completa como subcadena literal del título o la descripción persistidos. No se
dividen palabras ni se normalizan espacios interiores. Se ignoran mayúsculas
con `Locale.ROOT` para la consulta y `lower` de la base para los campos.
Se conservan acentos: `cafe` no coincide con `café`. La conversión a minúsculas
de caracteres especiales depende también de la configuración regional de la base.

Relevancia: primero las coincidencias en título (incluidas las que coincidan
también en descripción), después las coincidencias solo en descripción. Dentro
de cada grupo se ordena por ID ascendente. No se duplica un vídeo que coincida
en ambos campos. No se puntúan frecuencia, posición ni coincidencias exactas.

La consulta JPA parametrizada aplica filtro, orden, límite y desplazamiento en
la base configurada, PostgreSQL en producción. `PageRequest` y `Slice` solicitan
un registro adicional para calcular `hasNext`, sin cargar el catálogo completo
ni contar el total. Para continuar, incrementar `page` conservando `q` y `size`.
El orden es determinista; la paginación no ofrece una instantánea frente a
ediciones o borrados concurrentes. `%`, `_` y `!` se escapan para `LIKE` y se
buscan literalmente; las comillas y demás entradas permanecen parametrizadas.

`page` es un entero no negativo (por defecto 0); `size` es un entero entre 1 y
50 (por defecto 12). Valores fuera de esos límites, texto o desbordamientos
producen `400` con el formato existente `{"code":"INVALID_PAGINATION","message":"..."}`.
El límite de 50 es exclusivo de búsqueda; el listado conserva su contrato.

Una consulta vacía o formada por espacios devuelve `200`, `items: []`,
`hasNext: false` y los metadatos solicitados, después de validar la paginación.
Omitir `q` equivale a una consulta vacía. Sin coincidencias o después del final
se devuelve la misma respuesta vacía. Las miniaturas usan la ruta persistida
codificada como en el catálogo. No se necesitan sesión, CSRF ni archivos locales
para buscar registros.

## Validación

`VideoSearchIntegrationTest` verifica HTTP anónimo a través de Spring Security,
servicio y datos persistidos en H2 aislado: frase, título, descripción, relevancia,
empates, paginación, vacíos, acentos, límites y entradas especiales.
`CatalogRepositoryTest` añade pruebas de búsqueda heredadas por
`CatalogPostgresTest`, habilitadas en CI con `RUN_CATALOG_POSTGRES_TESTS=true`
contra PostgreSQL dedicado. Véase [TESTING.md](TESTING.md).

Validación local del 2026-11-16:

- `mvn -o clean verify`: 197 pruebas contabilizadas, 174 ejecutadas y 23
  opcionales omitidas; cero fallos y todas las comprobaciones JaCoCo superadas.
- `mvn -o test -Dtest=CatalogPostgresTest`: 13 pruebas correctas, incluidas las
  dos de búsqueda, sobre PostgreSQL 18 temporal con migraciones Flyway reales.
  La instancia dedicada se detuvo al terminar; no se usó la base del equipo.
- Frontend sin cambios: build, 126 tests Jest, lint (una advertencia existente
  de Fast Refresh en `SessionContext.tsx`) y contraste correctos.
- La primera ejecución E2E produjo un fallo al esperar el mensaje de credenciales
  incorrectas en `auth.spec.ts:46` a 320 px: 17 correctas y 4 no ejecutadas.
  Las cuatro pruebas de autenticación pasaron en una copia aislada de main
  (`36ad24d4c1511ec9a37e5b00e64dfa7128be4ce1`). En la repetición completa
  sobre esta rama pasaron las 22 pruebas. El fallo no se reprodujo; no se ha
  determinado su causa ni se han cambiado funcionalidades ajenas a US-08.
- `git diff --check` correcto. CI remoto pendiente de publicar el PR.
  La aprobación del equipo del contrato y del prompt ha sido confirmada.

El registro del prompt aprobado está en
[10-video-search-api.md](../prompts/10-video-search-api.md),
conforme a las reglas de aprobación de `prompts/README.md`.
