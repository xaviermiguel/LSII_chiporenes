# Publicación de comentarios desde la página de reproducción

**Approved on:** 2026-11-21
**Approved by:** El equipo, según confirmación del solicitante.
**Used for:** Tarea 36 (US-09), integración y verificación de la publicación de comentarios de primer nivel.

## Prompt

**Tarea 36 — Integrar la publicación de comentarios en la página de reproducción (US-09)**

Implementa el flujo completo para que un usuario autenticado pueda publicar un comentario de primer nivel en un vídeo y verlo junto a los comentarios existentes. Sigue `AGENTS.md`, los criterios de US-09 en `REQUIREMENT.md` y el contrato de la tarea 35 en `docs/sprint1-api.md`.

**Integración y comportamiento**

1. Integra el formulario en `VideoComments.tsx`, dentro de la página de reproducción que ya lo utiliza en `VideoDetail.tsx`. Conserva la lista, los autores, las respuestas anidadas, el contador y los estados de carga, error y ausencia de comentarios. El usuario autenticado debe poder publicar el primer comentario de un vídeo. Al visitante, muéstrale «Inicia sesión para comentar» con acceso al inicio de sesión.
2. Reutiliza de `ReplyForm.tsx` el comportamiento que corresponda para la validación, el envío, el foco y la recuperación de sesión. Mantén operativo el flujo de respuestas a comentarios. Aplica los estilos y patrones de accesibilidad existentes al campo, al botón y a los mensajes.
3. Valida el texto con las mismas reglas que `CommentService`: debe superar la comprobación equivalente a `String.isBlank()` de Java y tener como máximo **300 unidades UTF-16**. Cuenta los espacios iniciales y finales y envía el texto original. Contempla las diferencias entre Java y `trim()` de JavaScript para espacios Unicode.
4. Usa `useSession().request` con la ruta relativa `/videos/${videoId}/comments`, método `POST`, `Content-Type: application/json` y cuerpo `JSON.stringify({ text })`. El cliente existente añade `/api`, envía la cookie y obtiene el token CSRF. Mientras se procesa la petición, muestra «Publicando…» y bloquea cualquier segundo envío, incluso si el usuario pulsa dos veces antes de que se actualice la pantalla.
5. Tras recibir `201 Created`, muestra el comentario confirmado por el servidor una sola vez y con el autor devuelto en `user`. Respeta su `id`, `createdAt`, `parentId` y `authorId` cuando esté disponible. Mantén el orden por fecha ascendente e ID ascendente en caso de empate. Actualiza el contador, retira el mensaje de lista vacía cuando corresponda y limpia el borrador únicamente tras confirmar la publicación.
6. Si falla el envío, conserva el texto y la lista visible. Muestra un mensaje adecuado para `400 INVALID_COMMENT` o `INVALID_REQUEST`, `401 AUTHENTICATION_REQUIRED`, `403 INVALID_CSRF_TOKEN`, `404 VIDEO_NOT_FOUND` y fallos de red o servidor. Aprovecha la distinción que hace el cliente entre un rechazo CSRF y una sesión caducada. Permite volver a iniciar sesión y retomar el borrador en el mismo vídeo. Ante un fallo de red con resultado incierto, deja el reintento en manos del usuario.
7. Renderiza el contenido como texto de React. Una entrada como `<b>hola</b>` debe aparecer literalmente. Etiqueta el campo, conserva la navegación por teclado y haz que los avisos de validación, envío y error sean accesibles.

**Pruebas y verificación**

Añade pruebas automatizadas siguiendo los patrones de `VideoDetail.test.tsx` y las pruebas de sesión existentes. Cubre al visitante y al usuario autenticado, el vídeo sin comentarios y con comentarios previos, el texto vacío o en blanco, los espacios Unicode, los límites de 300 y 301 unidades con emojis y la conservación de espacios. Comprueba que dos intentos rápidos producen una sola petición, que el borrador sigue visible durante el envío y tras un fallo, que puede recuperarse después de iniciar sesión y que el `201` actualiza correctamente el autor, la lista y el contador. Incluye los errores del contrato y el renderizado literal de HTML. Verifica que la lectura y las respuestas anidadas siguen funcionando.

Ejecuta las comprobaciones aplicables del proyecto, incluidas compilación, pruebas, lint, contraste y pruebas de extremo a extremo. Verifica el flujo en un navegador contra el backend real de la tarea 35: publica con una cuenta distinta de la propietaria del vídeo, recarga la página y comprueba que el comentario aparece una sola vez, con el texto y el autor correctos. Corrige los fallos relacionados con la tarea y resume qué se ha implementado, qué pruebas han pasado y qué queda pendiente de revisión o CI remota.
