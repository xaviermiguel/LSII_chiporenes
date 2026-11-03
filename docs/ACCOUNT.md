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
| GET | `/api/auth/profile` | Perfil privado del usuario actual |
| PATCH | `/api/auth/profile` | `displayName`, `email`, `description` |
| POST | `/api/auth/password` | `currentPassword`, `newPassword`, `confirmPassword`; 204 y logout |
| GET | `/api/videos/me?page=0&size=12` | Listado propio existente |
| GET | `/api/videos/:id/edit` | Título y descripción; exclusivo del propietario |
| PATCH | `/api/videos/:id` | Actualización existente, exclusiva del propietario |

Todas requieren sesión. Las escrituras requieren CSRF. Las respuestas del perfil
no incluyen hash ni contraseña. Los DTO se separan del modelo persistente.
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
