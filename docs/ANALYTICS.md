# Analytics de creador

`GET /api/videos/me/analytics` devuelve los totales de la cuenta autenticada y el detalle de sus vídeos, ordenados por ID descendente. Requiere la cookie de sesión y responde con `401` sin sesión. La identidad se obtiene en el servidor. La consulta es de solo lectura y su respuesta usa `Cache-Control: no-store`.

```json
{
  "views": 2,
  "comments": 3,
  "videos": [{ "id": 42, "title": "Mi vídeo", "thumbnailUrl": "/media/portada.webp", "views": 2, "comments": 3 }]
}
```

El parámetro opcional `period` acepta `DAY` (últimas 24 horas), `WEEK` (7 días), `MONTH` (30 días) y `ALL` (todo el historial, valor predeterminado). El servidor calcula la ventana hasta el instante de la consulta y filtra por `video_views.viewed_at` y `comments.created_at`. Los vídeos del creador sin actividad en la ventana aparecen con cero.

Una cuenta sin vídeos recibe `{"views":0,"comments":0,"videos":[]}`. Los comentarios incluyen respuestas y comentarios importados que estén guardados en ProTube. Las reproducciones proceden de `video_views`, creada en la migración V1. Los contadores importados de YouTube quedan fuera de estas métricas.

`POST /api/videos/{id}/views` registra una reproducción autenticada. Requiere sesión y el token CSRF habitual. Devuelve `204` al registrarla y `404` si el vídeo no existe. El reproductor envía un evento al empezar a reproducir cada vídeo en una visita al detalle. Pausar y reanudar dentro de esa visita no añade otra vista. Volver a abrir el detalle permite contar una nueva reproducción. El endpoint cuenta eventos recibidos y el navegador informa del inicio de reproducción. Estas cifras no representan espectadores únicos ni tiempo de visualización.
