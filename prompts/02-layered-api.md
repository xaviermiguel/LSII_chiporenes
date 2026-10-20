# Layered API and PostgreSQL entities

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
