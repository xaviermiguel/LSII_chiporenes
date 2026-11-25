# Cuenta y vídeos propios

`#profile` permite editar nombre, email y descripción. El nombre admite 1–30
puntos de código, el email sigue la validación del registro y la descripción
hasta 2000 caracteres. Un email ya utilizado devuelve 409. El usuario de la
cabecera se actualiza al guardar. No se permite editar IDs, roles ni contraseñas
mediante el formulario del perfil.

El formulario de contraseña solicita la actual, la nueva y su confirmación.
Se aplica la política del registro y se guarda únicamente el hash BCrypt.
Una contraseña actual incorrecta devuelve 400 y conserva la sesión para reintentar.
Al cambiarla correctamente se invalida la sesión de este navegador y se solicita
un nuevo login. No se afirma que se revoquen sesiones abiertas en otros navegadores.
Las entradas de contraseña se vacían tras la respuesta y al abandonar la pantalla.

`#my-videos` muestra exclusivamente los vídeos del usuario, con páginas de 12,
estados de carga/error/vacío, navegación al reproductor y enlace de edición.
`#videos/:id/edit` permite cambiar título (1–255 caracteres) y descripción no vacía.
El backend comprueba el propietario al recuperar el formulario y al guardar.
No incluye borrado ni cambios de archivos. Catálogo y reproducción siguen públicos.

## API

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/users/{id}` | Perfil público por ID de usuario. Devuelve 200 o 404 si la cuenta no existe. |
| PUT | `/api/auth/profile/avatar` | Cambia el avatar de la cuenta autenticada. Recibe `avatar` en `multipart/form-data` y devuelve 204 si se guarda. |
| GET | `/api/auth/profile` | Perfil privado del usuario actual |
| PATCH | `/api/auth/profile` | `displayName`, `email`, `description` |
| POST | `/api/auth/password` | `currentPassword`, `newPassword`, `confirmPassword`; 204 y logout |
| GET | `/api/videos/me?page=0&size=12` | Listado propio existente |
| GET | `/api/videos/:id/edit` | Título y descripción; exclusivo del propietario |
| PATCH | `/api/videos/:id` | Actualización existente, exclusiva del propietario |

`GET /api/users/{id}` admite consultas sin sesión. Devuelve `id`,
`displayName`, `description` y `avatarURL`. El perfil privado también incluye
el correo de la cuenta. Las respuestas de perfil excluyen la contraseña, su hash
y las credenciales de sesión. El resto de las rutas de la tabla requieren sesión
y las escrituras requieren un token CSRF válido.

Para cambiar el avatar, envía `PUT /api/auth/profile/avatar` con el campo
`avatar` de tipo archivo. La API acepta imágenes JPEG o PNG válidas de hasta
2 MiB y 4096 × 4096 píxeles. Guarda un PNG de hasta 256 × 256 píxeles con la
proporción original. Un archivo ausente o inválido devuelve 400. El límite
de 2 MiB del avatar devuelve 413 al superarse. Si se rechaza la subida, el
perfil conserva el avatar anterior.

Los comentarios muestran `authorId` cuando los firma una cuenta de ProTube.
El campo es nulo en los comentarios importados.

El detalle público de un vídeo incluye `authorId` para enlazar la cuenta del
autor mostrado. Si muestra un autor externo, `authorId` es nulo y `ownerId`
sigue identificando al propietario técnico. El detalle expone los metadatos
importados `viewCount`, `likeCount`, `channel` y `channelFollowerCount`.
Cada campo es nulo si falta el dato. El contador del canal en la interfaz usa
una sola cifra importada y añade los seguimientos registrados en el navegador.

La consulta pública devuelve la ruta relativa del avatar personalizado en
`avatarURL`. Las cuentas sin avatar personalizado reciben
`/assets/avatar-default.png`. PostgreSQL guarda la referencia y el archivo se
almacena en la subcarpeta `avatars` de `ENV_PROTUBE_STORE_DIR`.

Se reutiliza `useSession().request`, ampliado para admitir query strings de
paginación sin permitir orígenes externos ni fragmentos.

## Configuración local

Copiar `.run/protube-local.properties.example` a `.run/protube-local.properties`,
completar la conexión PostgreSQL y usar `ENV_PROTUBE_STORE_DIR=C:/ProTube/videos`.
El archivo real está ignorado por Git. Los vídeos requieren tanto los archivos
como los registros correspondientes en la base de datos. No basta con indicar
la carpeta. La configuración compartida de IntelliJ ya carga este archivo.

En HTTP local, usar `server.servlet.session.cookie.secure=false` en el archivo
privado. Para una base existente, validar el esquema y no importar ni migrar
sin revisar el procedimiento documentado de adopción de PostgreSQL.
Docker usa su propia base y no lee el archivo de IntelliJ.

## Comprobaciones

Pruebas unitarias y de integración: `mvn clean verify` desde backend y
`npm run test -- --ci --runInBand` desde frontend. Build y lint: `npm run build`
y `npm run lint`. Los recorridos `npm run test:e2e` verifican las pantallas de
cuenta a 320/1440 px, recarga, cambio de contraseña y nuevo login. El recorrido
de publicación también comprueba listado propio y edición persistente del vídeo.
Todas estas pruebas usan bases y archivos aislados.

Las pruebas de integración de consulta pública, edición con dos cuentas y
subida de avatar pasaron en Maven. La prueba del avatar cubre la subida
válida, los rechazos con 400 y 413 y la conservación del avatar anterior.

La descripción y la URL del avatar se conservaron en una comprobación manual
tras reiniciar el backend conectado a PostgreSQL. El trabajo `postgres-tests`
del PR #22 terminó correctamente. CI configura su propia base PostgreSQL de
pruebas y activa `RUN_POSTGRES_TESTS`. La validación de la tarea 32 se detalla
en el apartado siguiente.

## Tarea 32 — Perfiles públicos y personalización

Estado documentado el 17 de noviembre de 2026. Referencia funcional US-03.
La tarea 30 proporciona el contrato, la 31 la API de perfiles y avatares,
la 23 la sesión compartida y la 14 el estándar visual verde.

### Navegación y datos visibles

| Pantalla | Ruta del frontend | Contenido |
|---|---|---|
| Perfil de una cuenta | `#users/{id}` | Nombre, avatar, descripción, seguidores y vídeos publicados disponibles |
| Edición propia | `#profile` | Nombre, correo, descripción, avatar y cambio de contraseña |
| Canal importado | `#channels/name/{nombreCodificado}` | Nombre del autor externo, avatar de iniciales, descripción genérica, seguidores y vídeos del catálogo |
| Canal de Mark Ronson | `#channels/mark-ronson` | Misma ficha de canal con una descripción específica |
| Autor de un comentario importado | `#videos/{videoId}/comments/{commentId}/author` | Nombre, avatar genérico, descripción genérica y regreso al vídeo |

Los perfiles públicos funcionan sin sesión. El perfil de una cuenta muestra
«Editar mi perfil» únicamente a su titular y «Ver mi perfil público» permite
acceder desde Mi cuenta. Entrar directamente en la edición sin sesión conduce
al inicio de sesión. La API selecciona la cuenta editable a partir de la sesión.

El nombre del autor de un vídeo enlaza a su cuenta o a su ficha de canal
importado. Los nombres de los comentarios también son enlaces. Una cuenta
registrada utiliza su ID estable. La ficha de un comentarista importado se
identifica mediante el vídeo y el comentario, dado que el origen carece de un
ID de cuenta ProTube. Los canales importados se agrupan por el nombre mostrado.

Las cuentas sin avatar usan `/assets/avatar-default.png`. Una descripción
vacía muestra «Miembro de la comunidad de ProTube». Los comentarios de cuentas
registradas consultan el perfil público para mostrar su avatar actual, con una
consulta por autor distinto en el detalle del vídeo. Si la consulta o la imagen
fallan, aparece el avatar genérico. Los comentarios importados usan ese avatar.

### Edición y subida del avatar

El guardado de nombre, correo y descripción envía los tres campos a
`PATCH /api/auth/profile`. Muestra confirmación, actualiza la cabecera y conserva
los valores introducidos ante un rechazo de validación o un fallo de red
mientras el formulario permanece abierto.

La sección Avatar tiene su propio selector y botón «Guardar avatar». Admite
JPEG y PNG, valida el tipo y el límite de 2 MiB en el cliente y deja que el
backend valide el contenido y las dimensiones máximas de 4096 × 4096 píxeles.
La subida utiliza `useSession().request` con `FormData`, cookies y CSRF.
El navegador genera el encabezado multipart.

Tras recibir 204, se vuelve a consultar el perfil público y se muestra la nueva
`avatarURL`. Un archivo rechazado conserva la imagen anterior y la selección
para reintentar. Si la subida se guarda pero falla la consulta posterior, aparece
«Volver a cargar el avatar». Los botones se deshabilitan durante su operación
y se bloquean las solicitudes duplicadas.

### Metadatos importados y reacciones

Los campos `meta.view_count`, `meta.like_count`, `meta.channel` y
`meta.channel_follower_count` del JSON se conservan como metadatos de origen.
El detalle del vídeo los expone como `viewCount`, `likeCount`, `channel`
y `channelFollowerCount`. Las cifras corresponden a la importación.

Las visualizaciones aparecen junto al PNG proporcionado para esta tarea.
El botón «Me gusta» permite añadir o retirar una reacción con sesión iniciada.
«Seguir» y «Dejar de seguir» actualizan el contador del perfil o canal.
El perfil propio muestra el contador sin botón para seguirse a uno mismo.

Las reacciones se guardan por ID de cuenta en `localStorage` del origen del
frontend. Se conservan al recargar y dependen del navegador y del origen
utilizados. Su sincronización y persistencia compartida requieren una API de
backend pendiente. Las cuentas parten de cero seguidores locales. Un canal
importado toma una cifra de seguidores disponible en sus vídeos y añade los
seguimientos locales. Cuando falta el dato importado, se indica «en este
navegador». Los seguidores de varios vídeos del mismo canal se cuentan una vez.

### Comprobación de criterios de aceptación

| Criterio | Estado y evidencia |
|---|---|
| Campos públicos y privacidad | Verificado con consulta anónima y comprobación de los cuatro campos del perfil |
| Avatar alternativo | Verificado para cuentas sin foto y comentaristas importados |
| Edición exclusiva del titular | Verificado con dos cuentas y pruebas de navegación |
| Acceso directo sin sesión | Verificada la redirección al login y el uso de la cuenta de sesión en la API |
| Carga y modificación de valores | Verificado contra Spring con nombre, correo y descripción |
| Consulta y guardado reales | Verificados PATCH de perfil y PUT multipart del avatar |
| Carga, validación y confirmación | Estados implementados y pruebas de correo duplicado e imagen inválida |
| Bloqueo de envíos repetidos | Verificado mediante pruebas del formulario y de la subida |
| Conservación del borrador | Parcial, se conserva ante 409 y fallos con el formulario abierto. Véase la incidencia de sesión |
| Actualización tras guardar | Verificada en cabecera, perfil público y avatar de los comentarios |
| Usuario inexistente | Verificado el mensaje «Perfil no encontrado» ante 404 |
| Visual verde y accesibilidad | Recorridos con teclado a 320 y 1440 px y comprobación de contraste |
| Pruebas de consulta, edición y restricciones | Cubiertas por Jest y comprobaciones de navegador contra Spring |
| Revisión y CI de la tarea 32 | Pendientes para la versión actual de los cambios |

### Evidencia de validación

Resultados de las comprobaciones realizadas durante la implementación del
17 de noviembre de 2026.

- Frontend con `npm run build` correcto y 146 pruebas Jest correctas en 16 suites.
- ESLint con cero errores y un aviso existente de Fast Refresh en `SessionContext.tsx`.
- `npm run test:contrast` correcto.
- Maven con 22 pruebas correctas de `VideoServiceTest`,
  `VideosControllerTest` y `VideoDetailIntegrationTest` tras los cambios
  del contrato de comentarios y metadatos.
- Chromium contra Spring con consulta anónima, 404, dos cuentas, edición por
  teclado, conflicto de correo 409 que conserva los campos y actualización
  visible a 320 y 1440 px.
- Subida real de PNG y JPEG con respuesta 204, rechazo de imagen inválida con
  400, conservación del avatar anterior y consulta pública de la nueva URL.
- Navegación desde autores de vídeos y comentarios, apertura de fichas
  importadas y visualización del avatar personalizado en comentarios.
- Reacciones locales comprobadas con teclado y sesión simulada en navegador.

Los recorridos adicionales de Chromium se ejecutaron mediante scripts puntuales.
La suite E2E completa y un `mvn clean verify` completo de la versión actual
quedan pendientes. El resultado del backend de la tarea 31 está registrado en
el [PR #22 integrado](https://github.com/xaviermiguel/LSII_chiporenes/pull/22) y
en el [trabajo postgres-tests correcto](https://github.com/xaviermiguel/LSII_chiporenes/actions/runs/43411059801/job/131837294530).
El frontend de la tarea 32 requiere su propia revisión y ejecución de CI.

### Incidencia pendiente del borrador al perder la sesión

Pasos reproducidos contra Spring.

1. Iniciar sesión y abrir Mi cuenta.
2. Modificar la descripción sin guardar.
3. Invalidar o cerrar la sesión antes del guardado.
4. Pulsar «Guardar perfil».
5. Volver a iniciar sesión y abrir Mi cuenta.

El acceso al formulario redirige correctamente al login. Al volver, aparece el
último valor guardado en el servidor y se pierde el texto pendiente.
El estado del borrador vive dentro de `AccountProfile` y se descarta al
desmontarse el formulario.

Queda pendiente conservar el borrador asociado a la cuenta durante ese recorrido
y añadir una prueba de recuperación tras volver a iniciar sesión.

### Preparación de la entrega

Quedan pendientes el registro y la revisión por el equipo de los prompts de
esta ampliación, el commit de los cambios, la revisión del PR y el CI de la
tarea 32. El procedimiento de registro de IA está en
[`prompts/README.md`](../prompts/README.md).
