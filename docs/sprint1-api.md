# Propuesta de API de vídeos

## Objetivo y alcance

Acordar la comunicación entre frontend y backend para listar vídeos, consultar su detalle y acceder a sus miniaturas y archivos de vídeo. Se utilizarán los metadatos generados por VideoGrabber.

Este documento es una propuesta pendiente de aprobación por el equipo. Las rutas de medios deberán confirmarse con la configuración del backend.

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

Por ejemplo: `GET /api/videos/0`.

Respuesta `200 OK`:

```json
{
  "id": 0,
  "title": "Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars",
  "user": "Mark Ronson",
  "duration": 79.0,
  "description": "Descripción del vídeo",
  "thumbnailUrl": "/media/0.webp",
  "videoUrl": "/media/0.mp4"
}
```

Los datos proceden del JSON de VideoGrabber. `description` se obtiene de `meta.description`; el texto del ejemplo está abreviado. El backend añade las direcciones de los archivos.

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
| `404` | `VIDEO_NOT_FOUND` | El vídeo solicitado no existe |
| `500` | `INTERNAL_ERROR` | Se produce un fallo interno inesperado |

El frontend mostrará los estados de carga, lista vacía y error, y permitirá reintentar las cargas fallidas. Si falla una página posterior, conservará los vídeos ya visibles. También informará de problemas de conexión o reproducción.

Los errores al acceder directamente a los archivos multimedia se gestionarán mediante el estado HTTP y el reproductor; no necesitan devolver este formato JSON.