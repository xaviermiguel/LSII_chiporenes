# Layered API and PostgreSQL entities

## Tasks 20 and 21: registration and session authentication (2026-10-28)

**Approved on:** 2026-10-28
**Approved by:** The requesting user, through the reviewed contract and implementation request in this chat.
**Used for:** Backend registration, login, current user, logout, CSRF and automated tests; extends the approved layered API scope.

### Prompt

Implementa las tareas **20 — API de registro de usuarios** y **21 — API de inicio y cierre de sesión** de ProTube, siguiendo las instrucciones del repositorio y el siguiente contrato.

El alcance incluye únicamente **backend y pruebas automatizadas**. No incluye pantallas ni cambios del frontend.

## Autenticación compartida

Utiliza **Spring Security con sesiones HTTP** y reutiliza el `PasswordEncoder` BCrypt existente, de coste 12.

Registro y login deben compartir el mecanismo que establece y persiste la autenticación. Un registro correcto debe dejar al usuario autenticado automáticamente, conservando la autenticación en peticiones posteriores.

Respeta `User.enabled`: las cuentas desactivadas no pueden autenticarse.

Implementa primero la base mínima compartida, después el registro y sus pruebas, y finalmente login, consulta del usuario y logout con sus pruebas.

Mantén el manejo HTTP en controladores y la lógica de negocio en servicios.

## Endpoints

| Método | Ruta | Resultado correcto |
|---|---|---|
| POST | `/api/auth/register` | `201 Created` con `AuthUserResponse` y sesión autenticada |
| POST | `/api/auth/login` | `200 OK` con `AuthUserResponse` y sesión autenticada |
| GET | `/api/auth/me` | `200 OK` con `AuthUserResponse`; requiere autenticación |
| POST | `/api/auth/logout` | `204 No Content` |
| GET | `/api/auth/csrf` | `200 OK` con el token CSRF y el nombre de su cabecera |

Registro, login y obtención de CSRF son públicos. La protección CSRF se aplica a las operaciones de escritura, incluidos registro, login y logout.

## DTO y validaciones

### RegisterRequest

```json
{
  "displayName": "Mi usuario",
  "email": "usuario@example.com",
  "password": "Mi clave segura!",
  "confirmPassword": "Mi clave segura!"
}
```

Todos los campos son obligatorios.

- `displayName`: eliminar espacios exteriores y validar una longitud de entre 1 y 30 caracteres. Conservar espacios interiores. Puede repetirse entre cuentas.
- `email`: eliminar espacios exteriores, normalizar a minúsculas de forma independiente de la configuración regional y validar formato y longitud máxima de 254 caracteres. Rechazar espacios interiores y formatos incompatibles con las restricciones existentes de PostgreSQL.
- `password`: entre 8 y 72 caracteres ASCII imprimibles, rango `U+0020` a `U+007E`. Permitir espacios interiores y rechazar espacios exteriores. No recortar ni modificar la contraseña.
- Rechazar caracteres de control, tabulaciones, saltos de línea y caracteres fuera de ASCII.
- No exigir combinaciones de mayúsculas, números o símbolos.
- `confirmPassword`: debe coincidir exactamente con `password`. No se persiste.

### LoginRequest

```json
{
  "email": "usuario@example.com",
  "password": "Mi clave segura!"
}
```

Ambos campos son obligatorios. Normaliza el email igual que en el registro.

Comprueba la contraseña exactamente como se recibe mediante BCrypt, sin modificarla. Una cuenta desactivada debe recibir el mismo error que unas credenciales incorrectas.

### AuthUserResponse

```json
{
  "id": 42,
  "displayName": "Mi usuario",
  "email": "usuario@example.com"
}
```

Utiliza este DTO en registro, login y `/me`.

No serialices directamente entidades JPA ni expongas contraseñas, hashes o detalles internos.

## Persistencia y duplicados

- Guarda las cuentas en PostgreSQL mediante la persistencia existente.
- Guarda únicamente el hash BCrypt; nunca la contraseña en claro ni su confirmación.
- Mantén la unicidad del email sin distinguir mayúsculas.
- Utiliza la restricción única de PostgreSQL como garantía final frente a registros concurrentes. No dependas únicamente de una consulta previa.
- Traduce específicamente el conflicto de email a `409`, sin convertir cualquier error de integridad en un supuesto email duplicado.
- Un registro inválido o duplicado no debe crear una cuenta nueva.
- Reutiliza el esquema existente y no modifiques migraciones ya aplicadas.

## Sesiones y cookies

- Almacena las sesiones en memoria del backend.
- Configura **7 días de inactividad** como plazo de caducidad.
- Cada petición que utilice una sesión autenticada válida debe renovar tanto el plazo de sesión como el de su cookie.
- La cookie debe permitir conservar el acceso tras cerrar y volver a abrir el navegador mientras la sesión siga siendo válida.
- Configura `HttpOnly`, `SameSite=Lax` y `Secure` en producción mediante HTTPS.
- Permite el desarrollo local mediante HTTP con configuración diferenciada.
- Frontend y backend se consideran desplegados bajo el mismo sitio.
- Reiniciar el backend invalida las sesiones anteriores; las cuentas permanecen en PostgreSQL.
- No crees sesiones por consultar anónimamente catálogo, detalle o medios.
- Evita la fijación de sesión al autenticar.
- No guardes las credenciales originales en la sesión.

El logout debe invalidar la sesión y eliminar la cookie utilizando los atributos de ruta y dominio correspondientes. Los identificadores anteriores deben dejar de autorizar peticiones.

Devuelve `204` también si no hay sesión o ya estaba cerrada, siempre que la petición supere la comprobación CSRF.

## CORS y CSRF

- Mantén activa la protección CSRF de Spring Security.
- Permite únicamente orígenes configurados, incluyendo el frontend de desarrollo.
- Permite credenciales y las cabeceras necesarias para JSON y CSRF.
- No utilices orígenes comodín con credenciales.
- Haz compatible la configuración CORS de seguridad con la configuración MVC existente.
- Permite las peticiones de preflight CORS necesarias sin exigir autenticación.
- Implementa `/api/auth/csrf` con una respuesta explícita y documentada que incluya el token y el nombre de la cabecera.
- El cliente debe poder obtener el token antes del registro, login o logout y enviarlo en la cabecera indicada.
- Tras autenticar mediante registro o login, debe poder obtener un token nuevo.
- La obtención del token puede crear una sesión técnica anónima; esta no concede permisos de usuario autenticado.
- Devuelve errores JSON coherentes, evitando redirecciones a páginas HTML de login.

## Acceso a operaciones

Mantén públicos catálogo, detalle y reproducción de vídeos.

Exige autenticación para las operaciones existentes de consulta del usuario actual, subida de vídeos, comentarios y estadísticas propias.

Si existen operaciones de edición de vídeos o perfiles, comprueba también la propiedad. Las estadísticas deben limitarse a los datos del usuario autenticado.

Identifica las rutas existentes y aplica reglas explícitas. No implementes funcionalidades pendientes de subida, comentarios, perfiles o estadísticas únicamente para protegerlas. Conserva los contratos públicos ajenos a estas tareas.

## Errores

Utiliza el formato:

```json
{
  "code": "CODIGO_DEL_ERROR",
  "message": "Mensaje comprensible para el usuario."
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

Reglas:

- Los campos ausentes, nulos o vacíos y los formatos de solicitud incorrectos devuelven `INVALID_REQUEST`.
- Los campos presentes y no vacíos que incumplan sus reglas devuelven el error específico.
- Un nombre o email formado únicamente por espacios queda vacío después de normalizarlo.
- Para errores de validación simultáneos en el registro, utiliza el orden: nombre, email, contraseña y confirmación.
- Un login con campos vacíos devuelve `400`; unas credenciales completas pero incorrectas devuelven `401`.
- Una cuenta desactivada recibe `INVALID_CREDENTIALS`.
- Una sesión ausente, inválida o caducada no autoriza operaciones protegidas.
- La ausencia o invalidez del token CSRF devuelve `403` cuando proceda, aunque no exista una sesión autenticada.
- No expongas contraseñas, hashes, consultas SQL, trazas ni detalles internos en respuestas o registros de aplicación.

## Pruebas

Incluye pruebas significativas de:

- Registro correcto y autenticación conservada en una petición posterior a `/me`.
- Campos obligatorios, normalización y límites de nombre, email y contraseña.
- Contraseñas con símbolos y espacios interiores.
- Rechazo de espacios exteriores, caracteres de control y caracteres fuera de ASCII.
- Confirmación de contraseña.
- Email duplicado, diferencias de mayúsculas y garantía de unicidad ante concurrencia.
- Persistencia real en PostgreSQL y comprobación del hash con BCrypt.
- Login correcto, incorrecto y con cuenta desactivada.
- Credenciales incorrectas que no produzcan una sesión autenticada.
- Consulta del usuario actual sin datos sensibles.
- Logout con y sin sesión, y rechazo del identificador cerrado.
- Caducidad de sesión simulada sin esperar siete días.
- Renovación del plazo de sesión y cookie, y atributos de la cookie.
- Ausencia de sesiones nuevas durante navegación pública ordinaria.
- Rutas públicas, acceso sin autenticación y permisos de propiedad aplicables.
- Flujo CSRF completo, tokens ausentes o incorrectos y obtención de un token nuevo tras autenticar.
- CORS para orígenes permitidos y no permitidos, incluyendo preflight.
- Ausencia de credenciales y hashes en las respuestas.

Utiliza las convenciones de pruebas existentes y PostgreSQL aislado para comprobar sus restricciones reales. Las pruebas H2 no sustituyen la comprobación de persistencia en PostgreSQL.

Ejecuta las comprobaciones requeridas por el repositorio y verifica que la configuración de seguridad mantiene la navegación pública. Las pruebas que escriban datos deben utilizar bases aisladas, nunca la base habitual del equipo.

### Notes

The user explicitly authorized implementation, verification and a commit after reviewing this contract. Required fields are checked before ordered field validations. The CSRF response is {token, headerName}. Preserve unrelated local run configuration and frontend lockfile changes. No push or PR requested. Session expiry and PostgreSQL writes are tested only in isolated fixtures.

Validation: Java 21, `mvn --offline --batch-mode clean verify` against a disposable
PostgreSQL 16.15 container: 132 tests, 131 passed, one optional local-store test
skipped, zero failures/errors. All JaCoCo checks passed; 494/504 lines covered
(98.02%). Real HTTP tests verify cookies, CSRF rotation, session fixation,
rolling inactivity, expiry, logout and old-cookie rejection. PostgreSQL tests
force concurrent registrations past the precheck to exercise the unique index.
Existing restart/migration tests passed. The isolated container was removed;
the team's usual database was not accessed and no migrations were changed.
Frontend build, 26 unit tests, lint, contrast and 12 Playwright E2E tests passed.
Only backend E2E origin configuration changed; frontend sources remain unchanged.
The legacy HTML logout now delegates to the same session invalidation mechanism.
Peer review by a team member and remote CI remain pending.



## Task 19 user persistence and video ownership (2026-10-28)

Reuses the approved User/JPA, service, DTO and PostgreSQL testing scope below.
The user authorized the implementation, tests and a commit including the earlier
pending task changes. This is the task prompt, preserved verbatim:

> He preparado BCrypt, el campo `enabled` de los usuarios, la relación obligatoria entre vídeos y propietarios y una migración V2 que crea la cuenta interna ProTube Demo y le asigna los vídeos existentes sin propietario. El importador asigna esta cuenta a los vídeos nuevos y conserva los propietarios existentes.
> Revisa estos cambios y adapta las pruebas al modelo actual. Comprueba BCrypt, emails duplicados, relaciones de propiedad, rechazo de vídeos sin propietario o con propietarios inexistentes, asignación de ProTube Demo y conservación de propietarios existentes. Verifica también que las respuestas de la API no exponen contraseñas ni hashes. Actualiza los datos de prueba de E2E que lo necesiten.
> Ajusta `VideoService` para que los vídeos cuyo propietario sea ProTube Demo (`demo@protube.invalid`) muestren `external_author` como autor original. Los vídeos de otros usuarios deben seguir mostrando el nombre de su propietario. Añade las pruebas correspondientes.
> Valida la migración y la conservación de usuarios, vídeos, metadatos y relaciones después de reiniciar utilizando exclusivamente una base PostgreSQL de pruebas. No ejecutes la migración sobre mi base habitual. Si alguna comprobación no puede ejecutarse, explica qué queda pendiente. En el commit inclute todas las clases que tengan cambios, tanto las que vayas a cambiar tu como las que he cambiado yo.

Earlier implementation instructions for this task:

> vamos a usar bcrypt, crea la clase pero no hagas commit
> Vale, añade el campo enabled a User.java con valor true por defecto, pero no hagas commit ni toques todavía la base de datos.
> Vale, crea la migración V2 para añadir enabled, crear ProTube Demo y asignarle los vídeos sin propietario, pero no la ejecutes, no hagas commit ni toques prompts.
> Vale, añade la búsqueda por email en UserRepository y adapta VideoImportService para asignar ProTube Demo a los vídeos nuevos, sin cambiar propietarios existentes. No ejecutes la migración, no hagas commit ni toques prompts.

The current instruction supersedes the earlier no-commit restriction. The user
also explicitly lifted the restriction on recording prompts for this request.
Keep unrelated run configuration and frontend lockfile changes out of the commit.
No push or migration of the user's usual database is authorized.

Validation: Java 21, `mvn --offline --batch-mode clean verify` against a newly
created PostgreSQL 16 Docker container on an isolated random localhost port:
72 tests, 71 passed, no failures/errors, one optional local-store reader skipped.
All JaCoCo checks passed. This includes V1-to-V2 migration with existing data,
duplicate email checks, required/valid owners, import ownership, public DTOs and
committed user/hash/ownership persistence across two Spring application contexts.
Playwright: 12 E2E tests passed with separate H2 fixtures and Flyway disabled.
The temporary PostgreSQL container and its test data were removed afterwards.
No usual database was accessed. Peer review and remote CI remain pending.

## Task 10 merge integration checkpoint (2026-10-20)

Reuses the approved API/service/DTO and frontend-consumer scope recorded below.
User implemented the changes incrementally with AI review and examples.

User prompts for this checkpoint included:

> entonces como puedo arreglar estos errores del test ?
> bien no generes codigo, y vayamos paso a paso
> he hecho las modificaciones, puedes ver errores, haz un repaso
> escribeme el codigo porfavor
> no entiendo, como ha de quedar este metodo
> esto, no veo nada en localhost:5173
> como quedaria el codigo ?
> hecho puedes revisarlo
> haz un pull request
> priemro haz un commit

Result: integrate main's paginated catalog, encoded media URLs, registered
authors, missing-file checks and JSON 404 handling while preserving detail tags.
Align comment DTO and React consumer with user, ISO createdAt and parentId.
Adapt unit/integration/restart tests and remove unused VideoSummaryResponse.
The catalog consumer reads items from the first page only.

Validation: user supplied IntelliJ Maven verify output ending BUILD SUCCESS
at 18:48:21: 59 tests, zero failures/errors, 10 skipped; all JaCoCo checks met.
User confirmed catalog rendering and real comment text/dates in the browser.
Frontend build TypeScript stage completed, but Vite build and Jest could not
complete in the agent sandbox (spawn EPERM); escalation attempt was interrupted
when the user requested the commit first. Frontend lint has formatting failures.
Dedicated detail UI-state tests, further-page loading and full frontend checks
remain pending. This is a checkpoint, not completion of all task 10 criteria.
Commit only at this step; push and draft PR deferred to the next step.

## Backend playback checkpoint (2026-10-20)

Reuse the approved DTO, service, controller and catalog-consumer scope for
Sprint 1 playback details. This checkpoint contains only backend changes;
frontend integration remains pending.

User prompts used in this incremental, user-written implementation:

> puedes revisar videoService.java ?
> bien , enonces como empiezo ?
> puedes revisar y decirme que deberia escribir ?
> perfecto como puedo hacer eso ?
> puedes revisar, dice que tengo realted problems con los tests
> okay antes de tocar front end quiero hacer un commit, y puedes guardar bien esta vez el run edit configurations, no se porque cada vez que hago commit lo pierdo

Result: catalog summary DTOs, video detail with imported tags and comments,
404 for a missing video, updated contract tests and a nonempty description
fallback for imported metadata. Preserve the existing database schema.
Keep the IntelliJ run configuration versioned while storing private values in
an ignored local properties file. No frontend changes or push requested.

The user confirmed a successful PostgreSQL import, catalog response and detail
response with tags and comments. Validation: `mvn clean verify` passed with
43 tests (33 passed, 10 skipped) and all default JaCoCo checks met. The documented
`coverage` profile does not exist in this POM; JaCoCo runs in the default build.
A temporary Spring configuration probe confirmed that the private properties
resolve the database URL/password and disable import, without connecting to the
database or printing credentials. Opt-in integration tests remain skipped.

## Frontend catalog and detail follow-up (2026-10-20)

Reuse the approved frontend-consumer scope above for the existing playback
prototype documented in `04-frontend-playback-prototype.md`.

User prompts:

> bien, ahora quiero preseguir con el frontend
> si , tengo el listado de muchas canciones
> si pero sale todo junto :
> no puedes ahcer lso cambios de VideoDetail.tsx ?

The user applied the incremental examples: fetch the catalog and detail through
Env.ts, cancel abandoned requests, display loading/error/empty states, imported
tags/comments and playback failures. The user confirmed the real detail data
in React, then added CSS for description blocks, tag chips and comment cards.
Apply the matching class names in VideoDetail.tsx and preserve those edits.

Validation: production build passed; the existing 11 tests and one snapshot
passed before the final CSS-class-only edit. ESLint passed for the four changed
TypeScript files and again for VideoDetail.tsx after that edit. Repository-wide
lint still reports formatting errors in other files. Existing tests do not
establish dedicated coverage of the new catalog/detail request states.
No backend, private run configuration or push changes requested.

**Approved on:** 2026-10-14
**Approved by:** Xavier and Joan, confirmed by Xavier in the previous conversation.
**Used for:** Create the agreed layered API foundation and JPA model, in separately reviewed phases.

## Prompt

perfecto, podrias crear estas clases ?

Approved scope: create JPA entities for the agreed model, repositories, DTO,
mappers, services, controllers and error handling; connect the video listing to
PostgreSQL, adapt its frontend consumer and verify the changes with tests.

Context: database protube-chiporenes, schema public, PostgreSQL 18. Tables:
users, videos, categories, tags, video_tags, comments, comment_likes, video_views.
Each video has zero or one category and multiple tags through video_tags.
Comments support replies through parent_id. Duplicate video/tag assignments
and duplicate likes by the same user on a comment must be prevented.
Video and thumbnail files stay in the configured store; the database stores paths.
Preserve existing tables, data, credentials and unrelated local changes.

Approval response:
Si, yo Xavier y Joan lo confirmamos, puedes registrarlo

## Notes

This restores the previously approved prompt record deleted with the broad implementation.
Current phase: User, UserRepository and an isolated persistence test only.
The user's current instruction is: "podrias hacer ahora solo una fase de las que mencionamos?"
Reuse the previous User mapping; do not implement other entities or API layers.
Preserve .run configuration, AGENTS.md and skills. Wait for review before the next phase.
No live database schema changes. H2 is used only for the isolated test;
PostgreSQL compatibility and persistent storage across restarts remain to be verified.

Phase 2 reuses the approved DTO/mapper scope, limited to UserResponse and UserMapper.
User instruction: "perfecto, para la segunda fase podrias hacer las clases y los minimos, pero con #TODO para hacer ?"
Provide the minimal public profile mapping and TODO comments for pending mapping
and serialization tests. Do not add services or controllers. Wait for review.

PostgreSQL verification reuses the approved User repository testing scope.
User instruction: "Perfecto, podriamos hacer la prueba en User repository ?"
Add an opt-in integration test against the configured PostgreSQL database,
validate the existing schema without changing it, and roll back test inserts.
Keep the isolated H2 test and unrelated local changes. This verifies repository
read/write behavior, not committed persistence across application restarts.

Follow-up instruction: "que tengo que hacer en este test ? pudes poner TODOS ?"
Add TODO comments explaining the manual PostgreSQL test setup, execution and
expected result; preserve the implemented test behavior and credential privacy.

Mapper verification reuses the approved phase 2 DTO/mapper testing scope.
User instruction: "podrias hacer el test ?"
Complete UserMapperTest to check public profile fields, a null avatar and
serialization without email or password hash. Run backend verification and
coverage without changing thresholds or accessing live PostgreSQL.


## Catalog integration follow-up (2026-10-19)

Reuse the approved JPA/repository/service scope. The user now explicitly authorizes
completing the pending Sprint 1 task 3 integration on a separate branch, preserving
all existing data and the documented SQL schema. Add Video and Comment mappings,
repositories, database-backed catalog reads without expanding the API, migrations,
environment-based PostgreSQL configuration and persistence/restart tests. Remove
versioned credentials, update setup/test documentation and run available checks.
Do not change frontend files, merge into main or implement task 4 import. Do not
claim PostgreSQL or restart verification if the database is unavailable.

User request:
Vamos a completar la integración pendiente de la tarea 3 del Sprint 1 de ProTuve
para poder continuar con mi tarea 4.

Objetivo: conseguir que Spring Boot pueda guardar y recuperar vídeos y comentarios
en PostgreSQL utilizando el esquema SQL ya existente.

Instrucciones del usuario (continuación literal):

### Instrucciones

1. Revisa el esquema SQL documentado y reutiliza sus tablas, columnas, claves y relaciones.
2. Implementa las entidades JPA necesarias para vídeos y comentarios, respetando los nombres y tipos del esquema.
3. Crea los repositorios Spring Data JPA correspondientes.
4. Integra la lectura del catálogo con los repositorios existentes, sin ampliar innecesariamente el alcance de la API.
5. Configura las migraciones del esquema existente, si todavía no están preparadas, utilizando las herramientas y convenciones del proyecto.
6. Sustituye las credenciales versionadas por variables de entorno. No incluyas contraseñas reales ni valores sensibles en el repositorio.
7. Configura la conexión con PostgreSQL.
8. Añade pruebas para verificar el guardado y recuperación de vídeos y comentarios.
9. Comprueba la persistencia después de reiniciar la aplicación.
10. Actualiza la documentación para explicar cómo preparar PostgreSQL y ejecutar las pruebas.

### Restricciones

- No crees un esquema de base de datos paralelo.
- No elimines tablas ni datos existentes.
- No sobrescribas funcionalidades de otros compañeros.
- No modifiques el frontend.
- No implementes todavía la importación de la tarea 4.
- No realices cambios destructivos.
- Trabaja en una rama propia y no fusiones directamente en main.

### Verificación

Ejecuta las pruebas que permita el entorno y comprueba que:

- Spring Boot compila.
- Las entidades corresponden al esquema SQL existente.
- PostgreSQL acepta los registros.
- Los datos se recuperan correctamente.
- Los registros sobreviven a un reinicio.
- Las credenciales no están versionadas.

Si no tienes PostgreSQL disponible, no afirmes que la persistencia funciona: indica qué verificaciones quedan pendientes.

Al terminar, muéstrame los archivos modificados, los resultados de las pruebas y cualquier problema pendiente.

**Después de completar esta integración, continuaremos con la tarea 4 utilizando los archivos de `C:\ProTube\videos`.**

Validation of this follow-up: Java 21.0.9, `mvn clean verify` passed, 22 tests
reported (14 passed, 8 PostgreSQL tests skipped), all coverage checks passed.
No PostgreSQL server was reachable and Docker was unavailable; PostgreSQL
migration, committed writes and application restart tests remain unverified.
No frontend or task 4 import implementation. Shared IDE credential values removed;
prior Git history is preserved and any previously valid password needs owner rotation.

## Video detail follow-up (2026-10-19, task 9)

Reuses the approved DTO/repository/service/controller and error handling scope.
The user explicitly authorized committing the next implementation using the
project rules. Preserve the exact task below as the record of this follow-up;
the existing team approval above is not a new approval of the resulting change.
Keep unrelated local IDE and frontend lockfile changes out of the commit.

User request:

Implementa la tarea 9: completar la API de detalle de vídeos y el acceso
a sus archivos.

OBJETIVO
Obtener la información y los comentarios existentes de un vídeo y permitir
acceder al archivo para reproducirlo, sin necesidad de iniciar sesión.

CONTEXTO
Lee las instrucciones del repositorio, REQUIREMENT.md y la documentación
existente de la API, persistencia e importación de vídeos.

Inspecciona el código antes de modificarlo. Reutiliza los modelos,
repositorios, servicios, importador y configuración de medios existentes.
Modifica únicamente lo necesario y preserva los cambios locales ajenos.

IMPLEMENTACIÓN
1. Completa GET /api/videos/{id}, siguiendo la API existente, para devolver
   el título, la descripción, los comentarios y los datos necesarios
   para acceder al archivo de vídeo.

2. Obtén únicamente los comentarios asociados al vídeo solicitado,
   utilizando su ID persistido y manteniendo un orden estable.

3. Devuelve comments: [] cuando el vídeo no tenga comentarios.

4. Utiliza DTOs para las respuestas y evita serializar directamente
   las entidades JPA.

5. Construye las URLs de medios a partir de las rutas persistidas.
   El ID del vídeo en PostgreSQL puede ser distinto del nombre del archivo.

6. Reutiliza la configuración de /media/** para servir los archivos.
   Comprueba que permite peticiones parciales HTTP Range para reproducción.

7. Permite consultar el detalle y los archivos sin iniciar sesión.

8. Cuando el vídeo no exista, devuelve 404 con el formato de error definido
   en la API existente.

9. Cuando el archivo no esté disponible, devuelve una respuesta HTTP
   controlada, sin errores internos inesperados.

10. Conserva el comportamiento actual del listado GET /api/videos.

No implementes frontend, subida de vídeos, creación de comentarios
ni paginación.

ENTORNO Y DATOS
- Utiliza ENV_PROTUBE_STORE_DIR y las variables ENV_PROTUBE_DB_*.
- No hardcodees rutas ni credenciales.
- No descargues vídeos, importes datos ni arranques infraestructura.
- No borres ni reinicialices bases, tablas, volúmenes o archivos.
- Usa datos y archivos temporales para las pruebas.
- Las pruebas que escriban en PostgreSQL deben utilizar una base
  exclusiva de pruebas.

PRUEBAS
Reutiliza y amplía las pruebas existentes para verificar:
- Título, descripción y datos correctos del vídeo solicitado.
- Comentarios asociados al vídeo correcto, sin incluir los de otro.
- Lista vacía cuando no existan comentarios.
- Respuesta controlada para un vídeo inexistente.
- Acceso al detalle sin iniciar sesión.
- Acceso público al archivo y entrega de su contenido correcto.
- Tipo de contenido del vídeo y soporte de HTTP Range.
- Respuesta controlada para un archivo inexistente, incluyendo
  un vídeo registrado cuyo archivo físico falte.

Ejecuta las comprobaciones del backend indicadas por el repositorio.
No consideres superadas las pruebas omitidas o las verificaciones
que no hayas podido ejecutar.

ENTREGA
Deja la implementación terminada y preparada para revisión.

Explica al finalizar:
- Qué has implementado.
- Qué archivos has modificado.
- Qué pruebas has ejecutado y sus resultados.
- Qué verificaciones han quedado pendientes y por qué.
- Cómo comprobar manualmente el detalle y el acceso al vídeo.

Task 9 validation: Java 21.0.12.1, Maven 3.9.6, `mvn clean verify -Pcoverage`
passed (51 reported, 41 passed, 9 PostgreSQL and 1 local-store tests skipped;
no failures/errors). JaCoCo checks passed, 236/240 lines covered. The named
coverage profile does not exist; the existing lifecycle still runs report/check.
An initial test exposed numeric Instant serialization in the MVC configuration;
the comment DTO now explicitly serializes createdAt as an ISO string and the
full suite passed after the fix. Tests use isolated H2 and temporary synthetic
files. PostgreSQL compatibility and real browser playback remain unverified.
No original media, live data, infrastructure or unrelated local changes touched.

## Catalog listing follow-up (2026-10-20)

Reuses the approved database-backed catalog/repository/DTO/service/controller
scope recorded in this file, including connecting the video listing to PostgreSQL.
References: REQUIREMENT.md US-04 and NFR-07, prompts/README.md (reuse an approved
prompt for a covered task type), docs/sprint1-api.md and AGENTS.md.
The historical approval above is unchanged; this follow-up does not claim a new
team approval of the resulting implementation or of these task instructions.

### User request (verbatim)

Quiero que completes la API del listado de vídeos del proyecto.

OBJETIVO

Proporcionar los datos necesarios para mostrar el catálogo de vídeos y permitir cargar más resultados.

REQUISITOS FUNCIONALES

La API debe:

- Devolver los vídeos guardados en la base de datos real.
- Incluir en cada resultado, como mínimo:
  - identificador,
  - título,
  - referencia a la miniatura.
- Implementar paginación o carga progresiva usando el enfoque ya existente o acordado en el proyecto.
- Mantener un orden estable y consistente entre páginas o bloques de resultados.
- Permitir saber si quedan más resultados por cargar.
- Devolver una respuesta válida cuando el catálogo esté vacío.
- Poder consultarse sin iniciar sesión.

PRUEBAS REQUERIDAS

Añade o adapta pruebas para cubrir como mínimo:

1. Catálogo con contenido:
   - devuelve vídeos persistidos;
   - incluye id, título y miniatura;
   - respeta el orden esperado.

2. Catálogo vacío:
   - devuelve una respuesta válida;
   - devuelve una colección vacía;
   - indica correctamente que no quedan más resultados.

3. Carga de resultados adicionales:
   - existen suficientes vídeos para más de una página o bloque;
   - se pueden obtener los siguientes resultados;
   - no hay duplicados causados por un orden inestable;
   - el indicador de si quedan más resultados funciona correctamente.

4. Acceso sin autenticación:
   - el listado puede consultarse sin iniciar sesión.

ANTES DE MODIFICAR CÓDIGO

Inspecciona el repositorio y reutiliza lo que ya exista relacionado con:

- entidades/modelos de vídeo,
- repositories,
- services,
- controllers,
- DTOs,
- persistencia,
- configuración de seguridad,
- tests,
- convenciones de respuesta de la API.

Respeta AGENTS.md, README.md, REQUIREMENT.md, DEVELOPMENT.md y cualquier documentación existente del repositorio.

No asumas que hay que crear componentes nuevos si ya existe una estructura para vídeos.

RESTRICCIONES

Haz únicamente los cambios necesarios para cumplir estos requisitos.

No:

- implementes frontend;
- hagas refactors generales;
- cambies arquitectura existente sin necesidad;
- dupliques services, repositories, DTOs o endpoints que ya existan;
- modifiques funcionalidades no relacionadas;
- hagas públicos otros endpoints que deban seguir protegidos;
- cargues todos los vídeos en memoria para paginar si la base de datos puede hacerlo;
- añadas dependencias nuevas salvo que sean realmente necesarias;
- hagas commits ni operaciones Git destructivas.

Mantén compatibilidad con el código existente siempre que sea razonable.

IMPLEMENTACIÓN

Usa la persistencia real existente.

Si el proyecto ya utiliza Spring Data, Pageable, Page, Slice u otra abstracción equivalente para paginación, reutilízala.

El orden debe ser determinista para evitar resultados duplicados o inconsistentes entre páginas.

La respuesta no debe exponer campos internos innecesarios de las entidades.

VALIDACIÓN

Al terminar:

1. Ejecuta los tests específicos de esta funcionalidad.
2. Ejecuta la suite completa del backend.
3. Corrige cualquier fallo provocado por tus cambios.
4. Revisa el diff final.
5. Comprueba uno por uno todos los requisitos anteriores.

Al final, dame un resumen conciso indicando:

- qué código relacionado ya existía;
- qué has modificado;
- endpoint final;
- parámetros de paginación;
- estructura de la respuesta;
- criterio de ordenación;
- cómo se indica si quedan más resultados;
- cómo se permite el acceso sin autenticación;
- archivos modificados;
- tests añadidos o modificados;
- comandos ejecutados;
- resultado de los tests.

Si existe alguna ambigüedad real que no pueda resolverse inspeccionando el repositorio, pregúntame antes de inventar una decisión.

### Validation notes

Validation: focused 17/17 passed; full `mvn clean verify -Pcoverage` succeeded,
55 reported / 45 passed / 10 skipped, no failures/errors, JaCoCo checks passed
(248/252 lines). PostgreSQL tests remain opt-in and were skipped. The initial
focused run passed its tests but failed global coverage; rerunning that selection
with `-Djacoco.skip=true` succeeded. Full-suite coverage was not disabled.
The named coverage profile does not exist; normal lifecycle runs JaCoCo.
No frontend changes, commits, destructive Git operations or live DB writes.

## Catalog documentation and Git workflow follow-up (2026-10-20)

This is the documentation/traceability review of the catalog work above. It reuses
this prompt record, preserves the original approval metadata and changes no AI or
Git policies. The user request is retained below, following the existing follow-up
structure in this file and the preservation rule in REQUIREMENT.md NFR-07.

### User request (verbatim)

Quiero que hagas una corrección final sobre la implementación anterior.

IMPORTANTE:
No reviertas ni cambies la lógica funcional de la API que ya has implementado.
No toques código Java, tests ni comportamiento de la API salvo que sea estrictamente necesario para cumplir las reglas del repositorio.

Quiero revisar únicamente dos cosas:
1. documentación `.md` modificada durante esta implementación y registro del prompt;
2. workflow Git basado en rama y Pull Request.

ANTES DE HACER NADA

Revisa TODA la documentación existente del repositorio que pueda definir reglas, convenciones o decisiones relacionadas con:

- uso de IA;
- conservación de prompts;
- formato y ubicación de prompts;
- documentación técnica;
- ramas;
- commits;
- Pull Requests;
- workflow Git;
- convenciones de nombres;
- skills o instrucciones para agentes.

No te limites únicamente a los archivos que ya conoces.

Busca y revisa toda la documentación relevante existente en el repositorio, incluyendo como mínimo:

- AGENTS.md
- cualquier AGENTS.md dentro de subdirectorios
- README.md
- DEVELOPMENT.md
- REQUIREMENT.md
- prompts/README.md
- todos los archivos existentes dentro de prompts/
- documentación dentro de docs/
- documentación específica del backend
- cualquier archivo que defina workflow, Git, ramas, commits o Pull Requests
- cualquier skill o instrucción dentro de .agents/
- cualquier otro archivo `.md` relevante que encuentres.

Las decisiones que tomes a continuación deben basarse en esa documentación existente.
No inventes reglas nuevas si ya existe una convención definida en el repositorio.

DOCUMENTACIÓN Y PROMPT DE IA

He visto que durante la implementación modificaste varios archivos `.md` existentes.

Quiero que revises esos cambios teniendo en cuenta TODA la documentación existente del proyecto.

Determina cuáles de esos cambios `.md` eran realmente necesarios para la implementación de la API y cuáles se hicieron únicamente para registrar o explicar el prompt utilizado.

Si alguno de esos cambios en archivos `.md` existentes se hizo únicamente para registrar, explicar o adaptar el uso del prompt de IA de esta implementación y, según las reglas existentes, esa información debería estar dentro de `prompts/`, reviértelo.

En ese caso:
- deja el archivo `.md` existente como estaba antes de esta implementación;
- no modifiques políticas generales del repositorio;
- no cambies reglas existentes de IA/prompts;
- no añadas excepciones o reglas nuevas para justificar esta implementación;
- mueve o conserva la información específica del prompt en el archivo correspondiente dentro de `prompts/`.

Mantén únicamente los cambios `.md` que, después de revisar toda la documentación existente, sean realmente necesarios para documentar el contrato o comportamiento de la API implementada.

REGISTRO DEL PROMPT

Después de revisar toda la documentación relevante y todos los archivos existentes dentro de `prompts/`, determina si este trabajo debe:

- reutilizar un prompt existente, o
- crear un nuevo archivo dentro de `prompts/`.

No tomes esta decisión sin haber revisado primero todos los prompts existentes y las reglas de `prompts/README.md`.

Si corresponde crear un archivo nuevo:
- créalo siguiendo exactamente la convención de nombres existente;
- utiliza la misma estructura y formato que los prompts existentes;
- incluye las referencias que exija la documentación;
- conserva el prompt realmente utilizado para esta implementación;
- no inventes un formato nuevo.

Si corresponde reutilizar uno existente:
- indica exactamente cuál;
- explica qué regla o documentación existente justifica reutilizarlo;
- verifica que realmente cubre este tipo de implementación.

WORKFLOW GIT, RAMAS Y PULL REQUEST

Antes de tocar Git, revisa TODA la documentación existente relacionada con:

- ramas;
- nombres de ramas;
- commits;
- conventional commits;
- uso de IA en commits;
- Pull Requests;
- protección de main;
- revisiones;
- skills de Git o commits;
- cualquier workflow definido por el proyecto.

No asumas un workflow genérico de GitHub.
Debes seguir exactamente el workflow que ya tenga documentado este repositorio.

Después comprueba:
- rama actual;
- git status;
- cambios locales;
- si existen cambios previos ajenos a esta implementación;
- si existe una convención concreta de nombres de ramas.

Todo este trabajo debe quedar en una rama de trabajo adecuada y posteriormente integrarse mediante Pull Request según las reglas existentes.

Si actualmente estás en main y los cambios todavía no están committeados:
- crea una rama nueva siguiendo la convención encontrada en la documentación;
- conserva todos los cambios válidos actuales en esa rama;
- no pierdas ni reviertas la implementación ya realizada.

No inventes el nombre de la rama si existe una convención documentada.

No uses operaciones Git destructivas:
- no reset --hard;
- no clean;
- no checkout/restore que pueda eliminar trabajo válido sin comprobarlo;
- no reescribas trabajo previo;
- no hagas merge a main.

COMMITS

Revisa también TODA la documentación existente relacionada con commits antes de preparar ninguno.

Si existe una skill específica para commits o cambios generados con IA:
- léela completa;
- sigue sus instrucciones.

Comprueba si el commit debe:
- usar conventional commits;
- incluir una referencia a la tarea;
- indicar el uso de IA;
- referenciar el archivo de prompt utilizado;
- seguir cualquier otra convención existente.

Antes de hacer cualquier commit:
- verifica que estás en la rama correcta;
- verifica que el prompt está correctamente registrado;
- comprueba que no quedan cambios innecesarios en documentación `.md`;
- revisa qué archivos pertenecen realmente a esta implementación;
- no incluyas cambios ajenos.

No hagas el commit todavía si las reglas existentes requieren confirmación o si existe alguna duda sobre los cambios que deben incluirse.

REVISIÓN FINAL

Al terminar:

1. Revisa el diff completo.
2. Confirma que la implementación funcional anterior se mantiene intacta.
3. Revisa todos los cambios `.md`:
   - cuáles eran realmente necesarios;
   - cuáles has revertido;
   - por qué, según la documentación existente.
4. Confirma cómo queda registrado el prompt.
5. Confirma que el trabajo está en una rama adecuada según las reglas del proyecto.
6. Confirma que el estado final está preparado para continuar con el workflow de Pull Request existente.
7. No hagas cambios funcionales adicionales en la API.

Después dame un resumen indicando:

- qué documentación has revisado para tomar estas decisiones;
- rama inicial;
- rama final;
- si has tenido que crear una rama;
- nombre de la rama;
- qué documentación o convención justifica ese nombre;
- qué archivos `.md` habías modificado;
- cuáles has revertido y por qué;
- cuáles mantienes y por qué;
- qué archivo de `prompts/` se utiliza finalmente;
- si ese archivo ya existía o se ha creado ahora;
- qué documentación justifica esa decisión;
- qué archivos quedan modificados finalmente;
- git status final;
- cuál sería el mensaje de commit correcto según las reglas existentes;
- qué pasos quedarían para abrir el Pull Request siguiendo el workflow documentado.

No hagas cambios adicionales fuera de este alcance.

### Review notes

Reviewed all repository Markdown (root, scoped AGENTS, prompts, docs, backend,
frontend and videoGrabber), .agents/skills/commit-ai-change/SKILL.md and the CI
workflow. No mandatory branch naming convention was found. README.md,
DEVELOPMENT.md and docs/GITHUB_SETUP.md require a work branch and a PR to main,
passing CI, at least one teammate approval and resolution of Copilot comments.
The existing history includes the PR title "Feat/layered api (#3)"; it does not
establish an exact branch naming rule. feat/video-catalog is a descriptive choice
for the work branch required by the documentation, not a newly imposed convention.

Initial branch: main, with the catalog implementation uncommitted. Created
feat/video-catalog using git switch -c, preserving all local changes. No staged
changes or unrelated local files were identified. No commit, push, PR or merge
was performed; the implementation request explicitly prohibited commits.

Retained the contract corrections in docs/CATALOG_PERSISTENCE.md,
docs/VIDEO_DETAIL.md and docs/sprint1-api.md. Those changes remove stale claims
that the current listing returns only titles; they do not record AI prompts.
Kept docs/VIDEO_CATALOG.md for contract, pagination, access and validation commands;
removed its execution narrative, already retained in this prompt record.
Replaced the catalog task summary with the actual request above. Approval metadata
and all prior prompt sections remain unchanged; no new prompt file or policy.
No Java, tests or API behavior changed during this review. Validation is a full
diff review, whitespace checks and before/after backend source hash comparison;
backend tests were not rerun for this Markdown-only correction.

## Catalog commit, push and PR authorization (2026-10-20)

Reuses this task's prompt record and the commit-ai-change skill. The following
instruction supersedes the earlier prohibition on commits for this contribution.
It does not authorize merging or changing unrelated frontend/configuration files.

### User request (verbatim)

Quiero que continúes con el commit, push y Pull Request si el fallo detectado no está causado por los cambios de esta contribución.

No quiero que corrijas problemas ajenos a este trabajo.

Antes de continuar, verifica únicamente que:

- `git diff main -- frontend` sigue vacío;
- el fallo de `npm run lint` corresponde a archivos que esta contribución no modifica;
- los 14 archivos de esta contribución son los únicos cambios que deben incluirse;
- la implementación y tests del backend siguen siendo los ya validados;
- no hay cambios ajenos preparados para commit.

Si esas condiciones se cumplen, considera el fallo de lint como un problema preexistente/local ajeno a esta contribución y NO lo uses como bloqueo.

No modifiques:
- frontend;
- configuración de Prettier/ESLint;
- `.gitattributes`;
- configuración Git;
- archivos que no pertenecen a esta implementación.

Después:

1. Sigue exactamente `.agents/skills/commit-ai-change/SKILL.md`.
2. Prepara únicamente los archivos pertenecientes a esta contribución.
3. Haz el commit siguiendo las convenciones del repositorio.
4. Haz push de `feat/video-catalog`.
5. Abre el Pull Request contra `main`.
6. Usa la plantilla de PR existente si la hay.
7. Deja constancia en el PR de que `npm run lint` falla localmente por un problema ajeno a esta contribución, si las reglas del proyecto consideran relevante documentarlo.
8. No hagas merge.

Solo vuelve a detenerte si detectas que el fallo afecta a alguno de los archivos modificados por esta contribución o si existe algún otro problema directamente causado por estos cambios.

Al terminar, dame:
- hash y mensaje del commit;
- archivos incluidos;
- resultado del push;
- URL del PR;
- título del PR;
- estado inicial de CI;
- cualquier validación pendiente;
- `git status` final.

### Pre-commit verification

Confirmed feat/video-catalog, exactly the 14 catalog files, no staged unrelated
changes, an empty diff against main for frontend, and identical hashes for all
backend/src files compared with the previously validated implementation/tests.
Previously passed: 17 focused backend tests and full backend verification
(45 passed, 10 skipped; coverage checks passed). Frontend npm ci and build passed;
all 11 frontend tests and the snapshot passed. Local lint reports 414 Prettier
CRLF errors exclusively in unchanged frontend files. Git reports index LF and
working-tree CRLF with core.autocrlf=true. The user explicitly authorizes proceeding
with this unrelated local failure documented in the PR; no configuration or
frontend corrections are made. CI, teammate approval and Copilot review remain
required before any merge. No installed PR template exists; use the template
documented in docs/GITHUB_SETUP.md.

## Complete frontend video catalog (US-04, 2026-10-20)

Reuses the approved frontend-consumer scope of this prompt, including the existing
catalog/detail integration recorded above. References: REQUIREMENT.md US-04 and
NFR-07, prompts/README.md, frontend/AGENTS.md, docs/VIDEO_CATALOG.md and
docs/TESTING.md. No new prompt file or approval claim is introduced.

### User request (verbatim)

Quiero que completes la página del listado de vídeos del proyecto.

OBJETIVO

Permitir que cualquier visitante consulte el catálogo de vídeos y pueda seleccionar uno para abrir su detalle.

CRITERIOS DE ACEPTACIÓN

La interfaz debe:

- Mostrar el título y la miniatura de cada vídeo.
- Permitir cargar más resultados.
- Indicar claramente cuándo no quedan más resultados.
- Abrir la ruta/página de detalle correspondiente al seleccionar un vídeo.
- Mostrar correctamente los estados de:
  - carga,
  - catálogo vacío,
  - error.
- Poder utilizarse sin iniciar sesión.
- Obtener los datos de la API real del backend.
- Incluir pruebas de interfaz para los comportamientos anteriores.

IMPORTANTE

Esta tarea es principalmente de FRONTEND.

El backend relacionado con el catálogo ya está implementado y debe utilizarse como fuente de verdad para conocer el contrato real de la API.

No rediseñes ni vuelvas a implementar el backend.

Solo modifica backend si descubres un bloqueo real que impida cumplir estos criterios y que no pueda resolverse correctamente desde frontend. En ese caso, detente y explícame el problema antes de modificarlo.

==================================================
FASE 0 — REVISAR TODO EL CONTEXTO DEL REPOSITORIO
==================================================

ANTES de escribir código, revisa exhaustivamente toda la documentación existente del repositorio.

No te limites a los documentos principales.

Busca y lee TODOS los archivos `.md` relevantes del repositorio para entender:

- arquitectura;
- frontend;
- backend;
- contrato de API;
- rutas;
- testing;
- convenciones de código;
- flujo Git;
- ramas;
- commits;
- Pull Requests;
- uso de IA;
- conservación de prompts;
- skills disponibles;
- CI;
- cualquier decisión técnica ya documentada.

Incluye como mínimo, si existen:

- todos los `AGENTS.md`, incluidos los de subdirectorios;
- `README.md`;
- `DEVELOPMENT.md`;
- `REQUIREMENT.md`;
- todos los `.md` dentro de `docs/`;
- todos los `.md` dentro de `prompts/`;
- `prompts/README.md`;
- documentación específica de frontend;
- documentación específica de backend;
- documentación de Git/GitHub;
- `.agents/skills/**/SKILL.md`;
- cualquier otro `.md` relevante que encuentres.

No empieces a implementar hasta haber entendido esas instrucciones.

Si una documentación más específica contradice una general, aplica las reglas de alcance indicadas por el propio repositorio.

No inventes convenciones si ya existen.

==================================================
FASE 1 — INSPECCIONAR LA IMPLEMENTACIÓN EXISTENTE
==================================================

Después de leer la documentación, inspecciona el código existente.

FRONTEND

Revisa completamente lo que ya existe relacionado con:

- `App`;
- componentes de vídeo;
- hooks;
- utilidades de API;
- `Env.ts`;
- rutas o navegación;
- estilos relevantes;
- estados de carga/error;
- tests;
- mocks existentes;
- configuración Jest/Testing Library;
- cualquier implementación previa del catálogo.

No asumas que hay que crear todo desde cero.

Reutiliza componentes, hooks, tipos, estilos y convenciones existentes cuando corresponda.

BACKEND

Aunque esta es una tarea de frontend, revisa la parte del backend necesaria para conocer exactamente el contrato real de la API.

Inspecciona como mínimo:

- `VideosController`;
- DTOs relacionados con catálogo;
- `VideoService`;
- repositorio si ayuda a entender paginación/orden;
- configuración de rutas;
- configuración de seguridad;
- acceso a `/media/**`;
- tests del endpoint;
- documentación del contrato.

Determina a partir del código REAL:

- endpoint del catálogo;
- método HTTP;
- parámetros de paginación;
- valores por defecto;
- estructura exacta de la respuesta;
- nombre de los campos;
- referencia de miniaturas;
- cómo se indica `hasNext` o equivalente;
- posibles errores;
- acceso anónimo.

No inventes el contrato y no uses datos mock como implementación final.

La aplicación debe consumir la API real existente.

==================================================
FASE 2 — PLAN MÍNIMO DE IMPLEMENTACIÓN
==================================================

Antes de modificar archivos, determina cuál es el cambio mínimo necesario para cumplir todos los criterios.

Respeta la arquitectura existente.

NO:

- hagas refactors generales;
- cambies arquitectura sin necesidad;
- introduzcas una librería nueva si no hace falta;
- implementes funcionalidades futuras;
- añadas búsqueda;
- añadas autenticación;
- implementes upload;
- implementes comentarios;
- cambies el backend por comodidad;
- hagas mejoras visuales ajenas a los criterios;
- dupliques hooks/componentes/utilidades que ya existen.

Haz únicamente lo necesario para completar correctamente el listado de vídeos.

==================================================
FASE 3 — IMPLEMENTACIÓN DEL CATÁLOGO
==================================================

Implementa la página/listado utilizando la API real.

Debe cubrir:

1. LISTADO

Mostrar por cada vídeo, como mínimo:

- título;
- miniatura.

Utiliza la referencia de miniatura proporcionada por la API y las utilidades/configuración de media ya existentes.

No hardcodees hosts o URLs si el proyecto ya tiene una abstracción para ello.

2. CARGAR MÁS

Utiliza el mecanismo de paginación/carga progresiva que exponga la API real.

La primera carga debe obtener el primer bloque de vídeos.

Al solicitar más resultados:

- pide el siguiente bloque;
- conserva los resultados anteriores;
- añade los nuevos;
- evita duplicados producidos por errores de estado;
- evita peticiones simultáneas innecesarias.

3. FIN DEL CATÁLOGO

Utiliza la información proporcionada por la API (`hasNext` o equivalente).

Cuando no queden resultados:

- no permitas realizar peticiones adicionales innecesarias;
- muestra el estado/indicación esperado según las convenciones existentes de interfaz.

4. SELECCIÓN DE VÍDEO

Al seleccionar un vídeo:

- abre la ruta de detalle existente/acordada;
- utiliza su identificador real;
- reutiliza el sistema de navegación/routing existente.

No implementes la página de detalle si pertenece a otra funcionalidad ya existente o separada.

Solo realiza la navegación necesaria.

5. ESTADO DE CARGA

Debe existir un estado visible durante la carga inicial.

La carga adicional también debe evitar que el usuario pueda provocar peticiones duplicadas mientras está en curso.

6. CATÁLOGO VACÍO

Si la API devuelve correctamente un catálogo sin vídeos:

- no debe tratarse como error;
- debe mostrarse un estado vacío apropiado.

7. ERROR

Si falla la petición:

- muestra el estado de error siguiendo las convenciones existentes;
- no muestres el error como catálogo vacío;
- evita dejar la interfaz en un estado inconsistente.

Si tiene sentido según la implementación existente, permite reintentar sin crear arquitectura adicional innecesaria.

8. ACCESO ANÓNIMO

La página debe funcionar sin iniciar sesión.

No añadas protecciones de autenticación al catálogo.

==================================================
FASE 4 — PRUEBAS DE INTERFAZ
==================================================

Añade o adapta pruebas utilizando las herramientas ya configuradas en frontend.

No introduzcas un framework de testing nuevo.

Las pruebas deben cubrir como mínimo:

1. LISTADO CON CONTENIDO

Comprueba que:

- se realiza la petición;
- aparecen los títulos;
- aparecen las miniaturas;
- se utilizan los datos de la respuesta de API.

2. CARGA INICIAL

Comprueba el estado de carga antes de recibir los datos.

3. CATÁLOGO VACÍO

Comprueba que:

- una respuesta válida con `items` vacío no provoca error;
- se muestra el estado vacío apropiado.

4. ERROR

Comprueba que un fallo de API muestra el estado de error correspondiente.

5. CARGAR MÁS

Comprueba que:

- se carga la primera página;
- al solicitar más se pide la página/bloque siguiente;
- los resultados nuevos se añaden a los anteriores;
- los anteriores no desaparecen;
- no se duplican resultados;
- el estado de `hasNext` o equivalente se respeta.

6. FIN DE RESULTADOS

Comprueba que cuando no quedan más resultados:

- se indica correctamente;
- no se realizan solicitudes adicionales innecesarias.

7. SELECCIÓN

Comprueba que seleccionar un vídeo lleva a la ruta de detalle correcta utilizando su ID.

8. ACCESO ANÓNIMO

Si la arquitectura actual dispone de una protección/routing que pueda afectar a este caso, comprueba que el catálogo no requiere sesión.

No hagas tests artificiales de detalles internos.

Prioriza comportamiento observable por el usuario.

==================================================
FASE 5 — VALIDACIÓN
==================================================

Cuando termines la implementación:

Ejecuta las validaciones indicadas por la documentación del proyecto.

Como mínimo, si corresponde:

- tests específicos del frontend;
- suite completa de frontend;
- build;
- lint;
- format/check correspondiente;
- `git diff --check`;
- cualquier otra validación obligatoria indicada por AGENTS.md, DEVELOPMENT.md, CI o documentación específica.

Si una validación falla:

- comprueba primero si el fallo ha sido causado por esta contribución.

Si el fallo ESTÁ causado por esta contribución:
- corrígelo antes de continuar.

Si el fallo NO está causado por esta contribución:
- no modifiques archivos ajenos para solucionarlo;
- verifica que es realmente preexistente/ajeno;
- documenta el problema;
- no permitas que un fallo ajeno bloquee el commit/PR si las reglas del repositorio permiten continuar.

No hagas cambios masivos de formato o finales de línea sobre archivos que no pertenecen a esta tarea.

==================================================
FASE 6 — DOCUMENTACIÓN Y PROMPT DE IA
==================================================

Revisa otra vez TODA la documentación relevante antes de decidir qué archivos `.md` modificar.

No modifiques documentación solo por modificarla.

Solo actualiza documentación si es necesaria para reflejar el comportamiento implementado.

Para el uso de IA:

- revisa completamente `prompts/README.md`;
- revisa todos los prompts existentes;
- reutiliza uno existente si las reglas indican que cubre este tipo de trabajo;
- crea uno nuevo únicamente si corresponde según las convenciones existentes.

No modifiques políticas generales de IA/prompts simplemente para registrar esta tarea.

Si debes crear un prompt nuevo:
- usa la convención de nombres existente;
- usa la estructura existente;
- conserva el prompt realmente utilizado.

==================================================
FASE 7 — BRANCH / GIT
==================================================

Esta contribución debe realizarse en su propia rama siguiendo el workflow documentado del proyecto.

ANTES DE MODIFICAR CÓDIGO, comprueba:

- rama actual;
- `git status`;
- cambios locales;
- estado respecto a `main`;
- documentación sobre ramas y PR.

No mezcles esta tarea con cambios de una tarea anterior.

Si hay cambios locales pendientes ajenos a esta nueva tarea:
- no los sobrescribas;
- no los incluyas;
- detente si impiden crear una rama limpia de forma segura.

La nueva rama debe partir del punto correcto según el workflow del repositorio.

Revisa si existe una convención obligatoria para nombres de ramas.

Si existe:
- síguela.

Si no existe:
- utiliza un nombre descriptivo apropiado para completar el listado de vídeos del frontend.

No uses operaciones Git destructivas.

No uses:
- `reset --hard`;
- `clean`;
- force push;
- comandos que descarten trabajo local.

==================================================
FASE 8 — REVISIÓN FINAL
==================================================

Antes del commit:

1. Revisa todo el diff.
2. Comprueba uno por uno los criterios de aceptación.
3. Confirma que no has implementado funcionalidades fuera del alcance.
4. Confirma que no has modificado backend salvo que hubiese sido estrictamente necesario y autorizado.
5. Confirma que no hay archivos ajenos incluidos.
6. Comprueba que el prompt está registrado correctamente.
7. Comprueba que estás en la rama correcta.

==================================================
FASE 9 — COMMIT
==================================================

Si todo es correcto, realiza el commit siguiendo TODAS las instrucciones existentes del repositorio.

Revisa de nuevo:

- AGENTS.md;
- documentación Git;
- conventional commits;
- reglas de IA;
- `.agents/skills/commit-ai-change/SKILL.md`.

Si la skill `commit-ai-change` aplica, úsala exactamente como está documentada.

El commit debe:

- incluir únicamente archivos pertenecientes a esta contribución;
- utilizar el formato indicado por el proyecto;
- incluir referencias a la tarea/requisito si corresponde;
- indicar asistencia de IA si corresponde;
- referenciar el prompt utilizado según las reglas existentes.

No inventes el mensaje antes de leer las convenciones.

==================================================
RESUMEN FINAL
==================================================

Cuando termines, dame un resumen con:

- toda la documentación relevante que revisaste;
- qué implementación frontend ya existía;
- qué contrato backend encontraste;
- endpoint consumido;
- estructura de respuesta utilizada;
- archivos modificados;
- archivos nuevos;
- comportamiento implementado;
- tests añadidos/modificados;
- comandos de validación ejecutados;
- resultados;
- cualquier fallo ajeno detectado;
- rama inicial;
- rama creada/utilizada;
- estado Git antes y después;
- prompt utilizado y ubicación;
- hash del commit;
- mensaje final del commit;

No implementes nada fuera de los criterios de aceptación descritos.

### Implementation notes

Started from clean main at f6726a9, matching origin/main. Created the descriptive
work branch feat/frontend-video-catalog; no mandatory naming rule is documented.
Reused App, useAllVideos, VideoSummary/VideoListResponse, Env.ts, existing fixtures
and the existing VideoDetail page selected by state. No router or URL route exists;
selection keeps that navigation and passes the persisted ID, with no detail rewrite.
No backend changes, new dependencies, authentication, search, uploads or comments.

Read all repository Markdown, including all scoped AGENTS, docs, prompts, testing
and CI instructions, the commit skill and .run/README.md. Only VIDEO_CATALOG.md
and TESTING.md need technical updates: their old UI-contract/integration claims
are superseded by this implementation. General policies remain unchanged.

### Validation and final review

Commands: npm ci; npm test -- --runInBand src/components/__tests__/app.test.tsx
--coverage=false (10 passed); npm run test:ci (21 passed and one snapshot);
npm run build; npm run lint; npx prettier --check on the seven modified frontend
files; mvn clean verify (59 reported, 49 passed, 10 optional tests skipped);
npx playwright install chromium; npm run test:e2e (6 passed); git diff --check.
Frontend coverage: 91.66% lines, 89.74% statements, 87.87% functions, 75% branches.
Backend coverage: 273/278 lines; all checks passed without changing thresholds.
Local tools: Node 24.22.0, npm 11.19.1, Java Corretto 21.0.12, Maven 3.9.11.

The first build lacked the already-declared Playwright dependency; npm ci resolved
it without changing the lockfile. Initial navigation tests exposed the old Jest
mock's non-URL media domain; the catalog test now supplies a valid configured
media server. A formatting error in the new test was fixed with scoped Prettier.
No failing validations remain. No unrelated code, formatting or configuration
was changed. PostgreSQL tests remain optional and were skipped; the browser tests
use the actual Spring API with isolated H2 fixtures, not the development database.

Acceptance review: API titles/thumbnails, first and subsequent pages, retained
results and ID deduplication, in-flight lock, visible end state, existing detail
selection by persisted ID, initial loading, empty state, errors and retry,
anonymous access, cancellation and real browser/API integration are covered.
The detail component is unchanged; there is no new router, detail feature,
backend change, dependency, auth, search, upload or comment implementation.
Only the ten task files are committed. No push, PR or merge is requested for
this frontend task; those operations remain separate from its authorized commit.

## Video upload service test correction (2026-10-28)

Reuses the existing approved service and testing scope of this prompt.
User request: "me ayudas a corregirlo ?", referring to VideoUploadServiceTest.
Replace the mixed TestNG/JUnit skeleton with JUnit 5 and mocked repositories.
Verify saved owner and metadata, generated relative paths and file bytes; verify
cleanup after database failure and partial thumbnail write failure, preserving
unrelated catalog files and the original failure cause. Use temporary storage
only. Preserve the user's pending VideoUploadService implementation.
Validation: Maven offline test -Dtest=VideoUploadServiceTest with Java 21:
3 tests passed, no failures, errors or skips. No database or real store accessed.
The tests exercise the user's pending service changes, which are not included
in this test-only commit. File bytes are synthetic fixtures, not media decoding
or format validation tests.
