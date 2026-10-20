# Propuesta de API de vídeos

## Objetivo y alcance

Acordar la comunicación entre frontend y backend para listar vídeos, consultar su detalle y acceder a sus miniaturas y archivos de vídeo. Se utilizarán los metadatos generados por VideoGrabber.

Este documento es una propuesta pendiente de aprobación por el equipo. Las rutas de medios deberán confirmarse con la configuración del backend.

Estado de la tarea 9: el detalle y `/media/**` están implementados como se describe
abajo. El listado paginado está implementado con el contrato `items/page/size/hasNext`
descrito aquí. Véase [VIDEO_CATALOG.md](VIDEO_CATALOG.md) para validación y límites.

## Listado de vídeos

`GET /api/videos?page=0&size=12`

Cada petición devuelve hasta 12 vídeos. page=0 solicita el primer grupo y page=1, el siguiente. Los vídeos se mostrarán en una cuadrícula de 3 filas y 4 columnas, o de 4 filas y 3 columnas.

Respuesta `200 OK`. Ejemplo simplificado con un único vídeo:

```json
{
  "items": [
    {
      "id": 0,
      "title": "Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars",
      "user": "Mark Ronson",
      "duration": 79.0,
      "thumbnailUrl": "/media/0.webp"
    }
  ],
  "page": 0,
  "size": 12,
  "hasNext": true
}
```

El backend devolverá los vídeos ordenados por `id` ascendente y calculará `hasNext` para indicar si quedan más resultados. `duration` se expresa en segundos.

Cuando el usuario se acerque al final del listado, el frontend solicitará el siguiente grupo y añadirá los vídeos debajo, evitando peticiones duplicadas. Si `hasNext` es `false`, dejará de solicitar más.

Si no hay resultados, se devolverá `200 OK` con `items: []` y `hasNext: false`.

## Ver un vídeo

`GET /api/videos/{id}`

El parámetro es el ID persistido en PostgreSQL, que puede ser distinto del nombre
del archivo de VideoGrabber. Por ejemplo: `GET /api/videos/42`.

Respuesta `200 OK`:

```json
{
  "id": 42,
  "title": "Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars",
  "user": "Mark Ronson",
  "duration": 79.0,
  "description": "Descripción del vídeo",
  "thumbnailUrl": "/media/0.webp",
  "videoUrl": "/media/0.mp4",
  "comments": [
    {
      "id": 15,
      "text": "Comentario existente",
      "user": "Autor del comentario",
      "createdAt": "2026-10-19T10:00:00Z",
      "parentId": null
    }
  ]
}
```

Los datos se consultan en las tablas existentes. En los vídeos importados,
`description` procede originalmente de `meta.description`; el texto del ejemplo
está abreviado. `user` es el nombre público del usuario registrado, o el autor
externo si no existe esa relación. No se serializan entidades JPA, credenciales
ni metadatos internos.

`comments` contiene únicamente los comentarios del ID persistido solicitado,
ordenados por `createdAt` ascendente e `id` ascendente para resolver empates.
Es una lista plana: `parentId` conserva las respuestas existentes sin añadir
operaciones de escritura. Si no hay comentarios, devuelve `comments: []`.

`videoUrl` y `thumbnailUrl` se construyen con las rutas persistidas, con caracteres
especiales codificados para URL. No se deducen a partir de `id`. El detalle y los
archivos se pueden consultar sin sesión. La configuración de `/media/**` utiliza
`ENV_PROTUBE_STORE_DIR`; el acceso parcial devuelve `206 Partial Content` con
`Content-Range`, y un rango fuera del archivo devuelve `416`.

Si el registro no existe, el detalle devuelve `404` con `VIDEO_NOT_FOUND` y el
mensaje del ejemplo de errores. Si existe pero su archivo de vídeo falta, no es
legible o está fuera del almacén, devuelve `404` con el mismo código y el mensaje
`El archivo del vídeo no está disponible.`. La ausencia de una miniatura no impide
consultar ni reproducir un vídeo cuyo archivo esté disponible.

El frontend mostrará la información y utilizará `videoUrl` para reproducir el vídeo. Las rutas relativas se resolverán contra el dominio de medios configurado. El servidor permitirá las peticiones parciales necesarias para avanzar y retroceder durante la reproducción.

## Errores

Los errores de la API tendrán un formato común:

```json
{
  "code": "VIDEO_NOT_FOUND",
  "message": "El vídeo solicitado no existe."
}
```

| Estado HTTP | Código | Situación |
|---|---|---|
| `400` | `INVALID_PAGINATION` | `page` no es un entero mayor o igual que 0, o `size` no es un entero positivo |
| `404` | `VIDEO_NOT_FOUND` | El vídeo solicitado no existe o su archivo de vídeo no está disponible |
| `500` | `INTERNAL_ERROR` | Se produce un fallo interno inesperado |

El frontend mostrará los estados de carga, lista vacía y error, y permitirá reintentar las cargas fallidas. Si falla una página posterior, conservará los vídeos ya visibles. También informará de problemas de conexión o reproducción.

Los errores al acceder directamente a los archivos multimedia se gestionarán mediante el estado HTTP y el reproductor; no necesitan devolver este formato JSON.
Un archivo inexistente en `/media/**` devuelve `404`, incluido el caso en que
su registro de vídeo exista. Ver [comprobación del detalle y medios](VIDEO_DETAIL.md).
