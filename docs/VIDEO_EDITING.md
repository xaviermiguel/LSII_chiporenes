# Edición de metadatos — US-07

Desde el detalle, «Editar vídeo» abre `#videos/:id/edit` únicamente si el ID
del usuario de `SessionProvider` coincide con `ownerId` del detalle real.
`ProtectedRoute` espera la restauración de sesión y dirige visitantes a `#login`.
Se conserva el flujo existente: tras login se vuelve al catálogo, sin retorno
automático. Al entrar directamente, el editor consulta el vídeo y comprueba su
propietario antes de mostrar el formulario. Un 404 no crea un formulario vacío.
La autorización definitiva sigue ejecutándose en backend en cada PATCH.

## API

`GET /api/videos/{id}` es público y devuelve el detalle existente, más:

```json
{"ownerId": 42, "category": {"id": 3, "name": "Music"}}
```

`category` es `null` si no hay clasificación. `tags` sigue siendo un array de
textos de `source_metadata.tags`. El ID de propietario no incluye email ni
credenciales. `GET /api/videos/categories`, público, devuelve un array de
`{id, name}`, ordenado por nombre e ID. Consulta las categorías ya persistidas;
no crea categorías ni añade datos al despliegue. Puede devolver `[]`.

`PATCH /api/videos/{id}`, `Content-Type: application/json`, con sesión y CSRF:

```json
{
  "title": "Título actualizado",
  "description": "Descripción actualizada",
  "tags": ["música", "directo"],
  "categoryId": 3
}
```

El PATCH continúa siendo parcial. Título y descripción omitidos o nulos no se
modifican. Título presente: no vacío/solo espacios, máximo 255 unidades UTF-16;
descripción presente: no vacía/solo espacios, sin límite adicional. Se guardan
los textos sin recortarlos. `tags` omitido o nulo conserva las etiquetas;
`[]` las elimina. Cada etiqueta debe ser un texto no nulo; se recortan espacios
ASCII exteriores y se omiten vacías y duplicadas exactas, conservando el orden.
No se impone cantidad o longitud máxima adicional. Los demás metadatos de
origen permanecen intactos.

`categoryId` omitido conserva la categoría; `null` la elimina. Si contiene un
valor debe ser un entero JSON representable como Long y corresponder a una
categoría existente. No se aceptan números fraccionarios ni IDs como texto.
Una petición sin ningún campo editable devuelve 400. La validación y la
actualización transcurren en una transacción; un error no guarda cambios parciales.

Éxito: `200` con el detalle actualizado completo (incluidos `id`, `title`,
`description`, `tags`, `ownerId`, `category`, URLs y comentarios). Se conservan
los campos de la respuesta anterior y se añaden los del detalle.

Errores con formato `{code, message}`:

| HTTP | Código | Significado |
| --- | --- | --- |
| 400 | INVALID_VIDEO_UPDATE | Validación de metadatos o categoría inexistente |
| 400 | INVALID_REQUEST | JSON o tipos incorrectos |
| 401 | AUTHENTICATION_REQUIRED | Sesión ausente o caducada, con CSRF válido |
| 403 | VIDEO_ACCESS_DENIED | Usuario distinto del propietario |
| 403 | INVALID_CSRF_TOKEN | Token ausente o inválido, comprobado antes del controlador |
| 404 | VIDEO_NOT_FOUND | Vídeo inexistente o archivo no disponible |

## Interfaz y conservación del borrador

El editor reutiliza clases de formulario, botones, mensajes y tokens compartidos.
Las etiquetas se editan una por línea para conservar etiquetas que contienen
comas. La categoría utiliza un select nativo con «Sin categoría» y las opciones
reales de la API. No hay nuevos paquetes ni sistema de autenticación.

La carga y el guardado se anuncian mediante `role=status`; errores mediante
`role=alert` con foco. Labels, errores asociados, controles nativos, foco visible
y anchura fluida siguen el estándar existente. Durante el guardado se deshabilitan
los controles y un bloqueo síncrono impide peticiones duplicadas.

Los fallos de validación, conexión y backend conservan los cuatro campos y
permiten reintentar. Un 403 de permisos o un 404 bloquea nuevos guardados y
conserva el borrador visible. CSRF inválido permite reintentar si la sesión sigue
válida, sin repetir automáticamente la escritura. Un 401 usa el flujo de login
existente. El borrador permanece en memoria de App, separado por usuario y vídeo,
y puede recuperarse al volver a la ruta con la misma cuenta. Una recarga completa
lo descarta; no se persiste en almacenamiento del navegador.

La confirmación muestra los cuatro valores devueltos realmente por PATCH.
«Ver vídeo actualizado» abre el detalle y consulta de nuevo la API. Cancelar
descarta el borrador y vuelve al detalle sin PATCH ni diálogos adicionales.

## Verificación

Jest cubre carga, propiedad, rutas privadas, validación, contrato, bloqueo,
errores, conservación del borrador tras caducidad, confirmación y cancelación.
Las pruebas de integración backend cubren persistencia de etiquetas/categoría,
PATCH parcial, vaciado, tipos inválidos, rollback y permisos con filtros reales.
Playwright comprueba edición con Spring real, cookies/CSRF, tabulación, foco,
cancelación, detalle actualizado, no propietario y 404 a 320 y 1440 px.
Usa H2, categorías y archivos sintéticos aislados; no acredita decodificación
multimedia ni accede a PostgreSQL o al almacén habitual del equipo.

Desde frontend: `npm run build`, `npm run lint`, `npm run test:ci`,
`npm run test:contrast`, `npx tsc -p tsconfig.e2e.json --noEmit` y
`npm run test:e2e`. Desde backend, con Java 21: `mvn clean verify`.
PostgreSQL opcional: seguir `VIDEO_MANAGEMENT_TESTS.md` usando una base exclusiva
de pruebas. CI remoto y revisión del equipo se comprueban en el Pull Request.
