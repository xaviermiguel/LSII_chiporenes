# Layered API and PostgreSQL entities

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
