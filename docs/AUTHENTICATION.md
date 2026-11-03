# Registro, login y sesiones — tareas 20 y 21

El backend utiliza Spring Security y sesiones HTTP en memoria. El registro crea
la cuenta en PostgreSQL, guarda únicamente el hash BCrypt de coste 12 y autentica
al usuario mediante el mismo mecanismo que el login. El frontend queda fuera de
estas tareas.

## Contrato HTTP

Swagger UI (`/swagger-ui/index.html`) y la documentación OpenAPI (`/v3/api-docs`)
permiten consultas GET sin iniciar sesión. Esto permite consultar los endpoints
desde el navegador; las operaciones de la API conservan sus requisitos de sesión
y CSRF. La sesión de Postman no se comparte con el navegador.

Todas las respuestas y errores de autenticación son JSON, salvo el logout
correcto, que no tiene cuerpo. No hay redirecciones a formularios HTML.

| Método | Ruta | Acceso | Respuesta correcta |
|---|---|---|---|
| POST | `/api/auth/register` | Público, con CSRF | `201` y usuario autenticado |
| POST | `/api/auth/login` | Público, con CSRF | `200` y usuario autenticado |
| GET | `/api/auth/me` | Sesión autenticada válida | `200` y usuario autenticado |
| POST | `/api/auth/logout` | Con CSRF, exista o no sesión autenticada | `204`, sin cuerpo |
| GET | `/api/auth/csrf` | Público | `200` y token CSRF |

### Registro

`RegisterRequest`:

```json
{
  "displayName": "Mi usuario",
  "email": "usuario@example.com",
  "password": "Mi clave segura!",
  "confirmPassword": "Mi clave segura!"
}
```

Los cuatro campos son obligatorios. Primero se comprueba su presencia y, después,
las validaciones en orden: nombre, email, contraseña y confirmación.

- **Nombre público:** eliminar espacios exteriores; entre 1 y 30 caracteres.
  Conservar espacios interiores. Puede repetirse entre cuentas. El límite se
  aplica en la API sin reducir la columna existente ni modificar usuarios previos.
- **Email:** eliminar espacios exteriores y normalizar a minúsculas mediante una
  regla independiente de la configuración regional. Máximo 254 caracteres,
  formato válido sin espacios interiores y único sin distinguir mayúsculas.
- **Contraseña:** entre 8 y 72 caracteres ASCII imprimibles (`U+0020`–`U+007E`).
  Se permiten letras, números, símbolos y espacios interiores. No se exigen
  combinaciones de tipos de caracteres. Se rechazan espacios exteriores,
  tabulaciones, saltos de línea, caracteres de control y caracteres fuera de
  ASCII, incluyendo acentos, `ñ` y emojis. Nunca se recorta ni transforma.
- **Confirmación:** coincidencia exacta con la contraseña; no se persiste.

El máximo de 72 caracteres ASCII equivale a los 72 bytes admitidos por BCrypt.
La restricción única de PostgreSQL sobre `lower(email)` garantiza que dos
solicitudes concurrentes no creen cuentas con el mismo email. Solo ese conflicto
se traduce a email duplicado; otros fallos de integridad no se presentan como tal.

### Login

`LoginRequest`:

```json
{
  "email": "usuario@example.com",
  "password": "Mi clave segura!"
}
```

Ambos campos son obligatorios. El email se normaliza igual que en el registro.
La contraseña se comprueba mediante BCrypt exactamente como se recibe.

Un email inexistente, una contraseña incorrecta y una cuenta desactivada reciben
el mismo error. Un intento fallido no crea una sesión autenticada. La sesión
técnica que guarda CSRF no concede acceso de usuario.

### Usuario autenticado

Registro, login y `/me` devuelven el mismo `AuthUserResponse`:

```json
{
  "id": 42,
  "displayName": "Mi usuario",
  "email": "usuario@example.com"
}
```

No se serializan entidades JPA ni se devuelven contraseñas o hashes. La sesión
contiene la identidad autenticada, no las credenciales originales.

## Sesión y cookie

La cookie identifica la sesión del servidor; el DTO JSON no mantiene el login.
La sesión y su cookie tienen un plazo de **7 días de inactividad**. Las peticiones
que utilizan una sesión autenticada válida renuevan ambos plazos. La cookie
persistente permite cerrar y reabrir el navegador conservando el acceso mientras
el servidor siga reconociendo la sesión.

La cookie es `HttpOnly`, `SameSite=Lax` y `Secure` en producción mediante HTTPS.
Frontend y backend deben desplegarse bajo el mismo sitio. En desarrollo local
puede utilizarse HTTP con la configuración de cookie segura desactivada.

Al autenticar se cambia el identificador de sesión para evitar su fijación. El
logout invalida la sesión y elimina la cookie con la misma ruta y dominio.
Reutilizar el identificador anterior no concede acceso. El logout con un token
CSRF válido devuelve `204` aunque la sesión ya estuviera cerrada o fuese anónima.

Las sesiones viven en memoria: reiniciar el backend cierra los accesos anteriores,
aunque el navegador conserve su cookie. Los usuarios siguen guardados en
PostgreSQL. No hay tokens JWT ni almacenamiento persistente de sesiones.

La navegación anónima por catálogo, detalle y archivos no crea sesiones. Obtener
CSRF sí puede crear una sesión anónima para guardar el token.

## CORS y CSRF

### Configuración

Los orígenes permitidos se configuran mediante `pro_tube.auth.allowed-origins`,
con la variable `ENV_PROTUBE_ALLOWED_ORIGINS` como entrada de despliegue y una
lista de orígenes separada por comas. El valor local predeterminado es
`http://localhost:5173`. Se autorizan únicamente orígenes explícitos y el envío
de credenciales. No se permite `*` junto con cookies. Las solicitudes preflight
de los orígenes autorizados no requieren autenticación.

`http://localhost:5173` y `http://localhost:8080` son orígenes distintos por el
puerto; el frontend de desarrollo necesita CORS aunque ambos usen localhost.
Un despliegue con frontend y backend bajo el mismo origen no necesita un permiso
CORS para sus propias peticiones.

La propiedad estándar `server.servlet.session.cookie.secure` controla si la cookie
requiere HTTPS: el perfil `prod` utiliza `true` y el desarrollo local y las
pruebas por HTTP utilizan `false`. No desactivar esta protección en un despliegue
público. El timeout y el máximo de edad de la cookie son siete días (604800
segundos); cada petición autenticada renueva su plazo.

### Flujo del cliente

1. Solicitar `GET /api/auth/csrf`, enviando y aceptando cookies.
2. Leer la respuesta:

   ```json
   {
     "token": "valor-del-token",
     "headerName": "X-CSRF-TOKEN"
   }
   ```

3. Enviar ese token en la cabecera indicada al realizar registro, login, logout
   u otras operaciones de escritura. Para cuerpos JSON, usar también
   `Content-Type: application/json`.
4. Tras un registro o login correcto, volver a obtener un token CSRF antes de la
   siguiente escritura. El token anterior deja de ser válido al autenticar.
5. En las peticiones posteriores enviar las cookies. En `fetch`, cuando frontend
   y backend son orígenes diferentes, utilizar `credentials: 'include'`.
6. Tras logout, obtener un token nuevo antes del siguiente registro o login.

Spring Security mantiene CSRF activo, incluyendo registro, login y logout. Una
petición de escritura sin token válido devuelve `403`, incluso si su JSON o sus
credenciales serían incorrectos. CORS no sustituye ni CSRF ni la autenticación.

## Acceso y rutas existentes

Catálogo (`GET /api/videos`), detalle (`GET /api/videos/{id}`), archivos
(`/media/**`), página inicial y recursos de la SPA permanecen públicos. El saludo
de prueba `GET /api/hello` no contiene datos privados.

El antiguo `POST /logout` del controlador de páginas también invalida la sesión
y elimina su cookie, conservando su respuesta HTML. Es público y exige CSRF,
igual que el logout de la API. Los clientes JSON deben utilizar
`POST /api/auth/logout`, que devuelve `204` sin cuerpo.

`GET /api/auth/me` exige una sesión autenticada. Las operaciones privadas de
subida, comentarios, estadísticas y edición no se crean como parte de estas
tareas. Cuando existan, deben requerir autenticación y, para editar vídeos o
perfiles y consultar estadísticas propias, comprobar la propiedad de los datos.

## Errores

Formato común:

```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "Email o contraseña incorrectos."
}
```

| HTTP | Código | Mensaje |
|---|---|---|
| `400` | `INVALID_DISPLAY_NAME` | El nombre de usuario debe tener entre 1 y 30 caracteres. |
| `400` | `INVALID_EMAIL` | Introduce un email válido de hasta 254 caracteres. |
| `400` | `INVALID_PASSWORD` | La contraseña debe tener entre 8 y 72 caracteres ASCII imprimibles, sin espacios al principio ni al final. |
| `400` | `PASSWORD_MISMATCH` | Las contraseñas no coinciden. |
| `400` | `INVALID_REQUEST` | La solicitud contiene campos obligatorios ausentes o un formato incorrecto. |
| `409` | `EMAIL_ALREADY_REGISTERED` | El email ya está registrado. |
| `401` | `INVALID_CREDENTIALS` | Email o contraseña incorrectos. |
| `401` | `AUTHENTICATION_REQUIRED` | Debes iniciar sesión para realizar esta operación. |
| `403` | `ACCESS_DENIED` | No tienes permiso para realizar esta operación. |
| `403` | `INVALID_CSRF_TOKEN` | El token de seguridad falta o no es válido. |
| `500` | `INTERNAL_ERROR` | Se ha producido un error interno. |

Campos ausentes, nulos o vacíos y JSON incorrecto producen `INVALID_REQUEST`.
Los campos de entrada deben ser cadenas JSON: no se convierten números,
booleanos, arrays u objetos a texto y esos tipos incorrectos también producen
`INVALID_REQUEST`.
Los campos presentes y no vacíos que incumplen una regla reciben el error
específico. Un nombre o email formado solo por espacios queda vacío tras
normalizarlo. Un login con campos vacíos devuelve `400`; credenciales completas
pero incorrectas devuelven `401`.

Una sesión ausente, inválida o caducada no autoriza operaciones privadas. Un
usuario autenticado sin permiso sobre el recurso recibe `403 ACCESS_DENIED`.
Los errores no incluyen credenciales, consultas SQL ni trazas internas.

## Pruebas

Desde `backend/`, con Java 21:

```sh
mvn clean verify
```

La suite normal utiliza bases H2 y almacenes sintéticos aislados para verificar
el contrato y los flujos HTTP, cookies, CSRF y CORS. No utiliza la base habitual
del equipo. La caducidad se simula en pruebas sin esperar siete días.

`AuthPostgresTest` se habilita con `RUN_POSTGRES_TESTS=true` y las variables
`ENV_PROTUBE_DB_HOST`, `ENV_PROTUBE_DB_PORT`, `ENV_PROTUBE_DB`,
`ENV_PROTUBE_DB_USER` y `ENV_PROTUBE_DB_PASS`. Utilizar exclusivamente un servidor
y una base dedicados a pruebas, como en [TESTING.md](TESTING.md).

Estas pruebas aplican las migraciones existentes a esa base de pruebas,
confirman registros mediante el servicio, leen las filas confirmadas desde JDBC,
comprueban BCrypt y normalización, permiten nombres públicos repetidos y
verifican duplicados y registros concurrentes contra el índice real de
PostgreSQL. Eliminan únicamente sus propios usuarios con emails UUID. Las
pruebas H2 no sustituyen estas comprobaciones de PostgreSQL.

La revisión de otro miembro y el CI remoto deben verificarse por separado. Este
documento no acredita por sí mismo que esas comprobaciones estén superadas.

### Verificación local del 28 de octubre de 2026

Con Java 21 y un contenedor PostgreSQL 16.15 temporal, `mvn --offline
--batch-mode clean verify` completó 132 pruebas: 131 correctas, ninguna fallida
y una prueba opcional del almacén local omitida. Los cuatro casos de
`AuthPostgresTest` se ejecutaron, incluida la carrera forzada después de ambas
consultas previas para comprobar el índice único real. También pasaron las
pruebas existentes de migración y conservación de datos tras reiniciar Spring.

JaCoCo alcanzó 494 de 504 líneas cubiertas (98,02 %) y superó todos los umbrales
existentes. La navegación pública sigue cubierta por los tests de catálogo,
detalle y medios. El contenedor temporal se eliminó después de verificarlo;
no se accedió a la base habitual del equipo.

El build del frontend existente, sus 26 pruebas unitarias, lint y contraste
también pasaron, sin modificar sus fuentes. Las 12 pruebas Playwright pasaron
contra el backend real y fixtures H2 aislados, incluyendo reproducción y rangos
HTTP. Su configuración backend permite explícitamente el origen del frontend
de pruebas, sin ampliar los orígenes del despliegue.
