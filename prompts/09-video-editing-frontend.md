# Edición de metadatos de vídeos desde frontend

**Approved on:** 2026-11-03
**Approved by:** Equipo, confirmado por el usuario: «Sí, el equipo aprueba este prompt».
**Used for:** US-07, interfaz de edición y ampliación mínima autorizada del contrato backend; rama feat/frontend-video-editing.

## Prompt

Quiero que completes la interfaz de edición de vídeos del proyecto.

OBJETIVO

Permitir que un usuario edite desde la interfaz los metadatos de sus propios vídeos y vea reflejados los cambios guardados.

CRITERIOS DE ACEPTACIÓN

La funcionalidad debe:

- Mostrar la opción de edición únicamente cuando el usuario autenticado sea propietario del vídeo.
- Gestionar correctamente el acceso directo a la ruta de edición cuando:
  - el usuario no tenga sesión;
  - el usuario tenga sesión pero no sea propietario;
  - el vídeo no exista.
- Cargar los valores actuales de:
  - título;
  - descripción;
  - etiquetas;
  - categoría.
- Aplicar el estándar visual existente y reutilizar los componentes compartidos de formulario.
- Permitir guardar cambios válidos mediante la API real de edición ya implementada en backend.
- Mostrar estados claros de:
  - carga inicial;
  - guardado.
- Evitar envíos repetidos mientras se está guardando.
- Mostrar errores claros de:
  - validación;
  - falta de permisos;
  - vídeo inexistente;
  - conexión/backend cuando corresponda.
- Conservar los cambios introducidos por el usuario cuando falle el guardado.
- Confirmar el guardado correcto.
- Actualizar la información visible del vídeo después de guardar.
- Permitir cancelar la edición sin enviar modificaciones.
- Funcionar correctamente en móvil y escritorio.
- Poder utilizarse con teclado.
- Incluir pruebas de:
  - visualización;
  - permisos;
  - validación;
  - guardado;
  - errores.
- Funcionar integrada con el backend real.
- Superar las comprobaciones de CI.

IMPORTANTE

Esta tarea es principalmente de FRONTEND.

La API de edición ya está implementada en backend y debe utilizarse como fuente de verdad para:

- contrato;
- permisos;
- campos editables;
- validaciones;
- respuestas;
- errores.

No rediseñes ni vuelvas a implementar el backend.

Solo modifica backend si encuentras un bloqueo real directamente relacionado con esta funcionalidad que no pueda resolverse correctamente desde frontend.

Si ocurre, detente antes de modificarlo y explícame exactamente el problema.

==================================================
FASE 0 — REVISAR TODO EL CONTEXTO DEL REPOSITORIO
==================================================

ANTES de modificar código, revisa exhaustivamente TODA la documentación existente del repositorio.

No te limites a los documentos principales.

Busca y lee todos los archivos `.md` relevantes para entender completamente:

- arquitectura;
- frontend;
- backend;
- autenticación;
- autorización;
- propiedad de vídeos;
- edición de metadatos;
- API;
- validaciones;
- categorías;
- etiquetas;
- routing;
- componentes compartidos;
- estándar visual;
- accesibilidad;
- responsive;
- testing;
- CI;
- Git;
- ramas;
- commits;
- Pull Requests;
- uso de IA;
- conservación de prompts;
- skills para agentes.

Incluye como mínimo, si existen:

- todos los `AGENTS.md`, incluidos los que existan dentro de subdirectorios;
- `README.md`;
- `DEVELOPMENT.md`;
- `REQUIREMENT.md`;
- todos los `.md` dentro de `docs/`;
- todos los `.md` dentro de `prompts/`;
- `prompts/README.md`;
- documentación específica del frontend;
- documentación específica del backend;
- documentación de autenticación/autorización;
- documentación de vídeos;
- documentación de API;
- documentación Git/GitHub;
- `.agents/skills/**/SKILL.md`;
- cualquier otro `.md` relevante que encuentres.

No empieces a implementar hasta haber entendido las reglas, convenciones y decisiones ya existentes.

No inventes convenciones si ya están definidas.

==================================================
FASE 1 — REVISAR ESTADO GIT Y CREAR RAMA DE TRABAJO
==================================================

ANTES DE MODIFICAR CÓDIGO:

- comprueba la rama actual;
- ejecuta `git status`;
- revisa los cambios locales;
- revisa las diferencias respecto a `main`;
- comprueba si existen commits o cambios de otra funcionalidad pendientes;
- revisa TODA la documentación relacionada con ramas, Git y Pull Requests.

Esta funcionalidad debe realizarse en una rama propia.

No reutilices una rama correspondiente a otra tarea ya terminada.

No mezcles esta funcionalidad con cambios de otra contribución.

Si existe una convención obligatoria para nombres de rama:

- síguela.

Si no existe:

- utiliza un nombre descriptivo relacionado con edición de vídeos.

La rama debe partir del punto correcto según el workflow existente del repositorio.

Si existen cambios locales ajenos:

- no los sobrescribas;
- no los incluyas;
- no los descartes;
- no uses operaciones destructivas.

No uses:

- `git reset --hard`;
- `git clean`;
- force push;
- comandos que puedan eliminar trabajo válido.

==================================================
FASE 2 — INSPECCIONAR LA IMPLEMENTACIÓN EXISTENTE
==================================================

Después de revisar documentación y preparar correctamente la rama, inspecciona el código existente.

FRONTEND

Revisa completamente todo lo relacionado con:

- App;
- routing;
- página de detalle del vídeo;
- catálogo;
- autenticación;
- sesión;
- usuario actual;
- información de propietario/autor;
- protección de rutas;
- navegación;
- componentes de formularios;
- inputs;
- textareas;
- selects;
- componentes para tags/etiquetas;
- categorías;
- botones;
- estados de loading;
- mensajes de error;
- notificaciones/confirmaciones;
- componentes compartidos;
- estilos;
- responsive;
- hooks;
- utilidades HTTP/API;
- `Env.ts`;
- tests;
- mocks;
- configuración Jest/Testing Library.

No asumas que necesitas crear componentes nuevos si ya existen componentes compartidos adecuados.

Reutiliza:

- componentes;
- hooks;
- tipos;
- utilidades;
- estilos;
- routing;
- manejo de errores;
- patrones de autenticación;
- convenciones de testing.

BACKEND

Aunque esta tarea sea frontend, revisa el backend relacionado con edición para conocer exactamente el contrato real.

Inspecciona como mínimo:

- endpoint de detalle del vídeo;
- endpoint de edición;
- controllers;
- DTOs;
- entidades/modelos relevantes;
- services;
- autorización/ownership;
- security;
- repositories si ayudan a entender los datos;
- validaciones;
- etiquetas;
- categorías;
- `ApiError` o estructura equivalente;
- códigos HTTP;
- tests del endpoint de edición;
- tests de permisos;
- tests de vídeo inexistente;
- documentación relacionada.

Determina directamente a partir del backend real:

- endpoint de lectura utilizado para cargar los valores actuales;
- endpoint de actualización;
- método HTTP;
- Content-Type;
- estructura exacta de request;
- estructura exacta de response;
- campos editables;
- formato de etiquetas;
- formato de categoría;
- campos obligatorios;
- límites de longitud;
- validaciones;
- comportamiento si el usuario es propietario;
- comportamiento si no es propietario;
- comportamiento sin sesión;
- comportamiento si el vídeo no existe;
- códigos HTTP y cuerpos de error.

No inventes el contrato.

El backend es la fuente definitiva para permisos y validaciones.

==================================================
FASE 3 — CAMBIO MÍNIMO NECESARIO
==================================================

Antes de escribir código, determina el conjunto mínimo de cambios necesario para cumplir los criterios.

NO:

- hagas refactors generales;
- cambies arquitectura;
- añadas librerías nuevas sin necesidad;
- reimplementes autenticación;
- reimplementes autorización;
- modifiques backend por comodidad;
- añadas nuevas funcionalidades;
- implementes eliminación de vídeos;
- implementes subida de vídeos;
- modifiques catálogo sin necesidad;
- modifiques reproducción sin necesidad;
- añadas funcionalidades de administración;
- hagas rediseños generales;
- dupliques componentes que ya existan.

Haz únicamente lo necesario para completar la edición de metadatos.

==================================================
FASE 4 — VISIBILIDAD DE LA OPCIÓN DE EDICIÓN
==================================================

La opción para editar un vídeo debe mostrarse únicamente cuando:

- exista una sesión válida;
- el usuario actual sea propietario del vídeo.

Utiliza la información y patrones ya existentes en frontend/backend.

No bases la seguridad únicamente en ocultar el botón.

El backend sigue siendo la autoridad definitiva para permisos.

Comprueba que un usuario que no sea propietario:

- no vea la opción de edición desde la interfaz normal.

No añadas el botón a usuarios no autorizados para luego depender únicamente del backend.

==================================================
FASE 5 — ACCESO DIRECTO A LA RUTA DE EDICIÓN
==================================================

Gestiona correctamente el acceso manual/directo a la URL de edición.

CASO SIN SESIÓN

Si un visitante sin sesión intenta acceder:

- utiliza el sistema existente de autenticación;
- redirígelo al login si ese es el comportamiento establecido;
- conserva el mecanismo existente de retorno si ya existe.

CASO SIN PERMISOS

Si un usuario autenticado intenta editar un vídeo que no es suyo:

- no muestres el formulario editable;
- aplica el comportamiento ya establecido por el proyecto;
- muestra/redirige de forma coherente;
- utiliza la respuesta backend definitiva si es necesario.

CASO VÍDEO INEXISTENTE

Si el vídeo no existe:

- muestra el estado de no encontrado existente o equivalente;
- no muestres un formulario vacío como si el vídeo fuera válido.

No inventes un sistema nuevo si estos estados ya tienen patrones existentes.

==================================================
FASE 6 — CARGA DEL FORMULARIO
==================================================

Al entrar en la edición:

- carga los datos actuales del vídeo desde la API real;
- muestra un estado visible de carga;
- no muestres valores falsos o placeholders como datos reales.

El formulario debe inicializarse con los valores reales de:

- título;
- descripción;
- etiquetas;
- categoría.

Respeta exactamente los formatos utilizados por la API.

Si etiquetas o categoría tienen componentes compartidos:

- reutilízalos.

==================================================
FASE 7 — FORMULARIO Y ESTÁNDAR VISUAL
==================================================

Aplica los componentes y estándar visual ya existentes.

Reutiliza siempre que sea posible:

- inputs;
- textarea;
- select;
- tags;
- botones;
- mensajes de validación;
- layouts de formularios;
- estados de loading;
- componentes de error.

No introduzcas estilos independientes si ya existen patrones compartidos.

El formulario debe funcionar correctamente en:

- móvil;
- escritorio.

Debe ser usable completamente con teclado.

Revisa:

- labels;
- foco;
- orden de tabulación;
- botones;
- selects;
- edición de etiquetas;
- mensajes de error;
- controles deshabilitados.

==================================================
FASE 8 — VALIDACIÓN FRONTEND
==================================================

Valida antes del envío únicamente lo que tenga sentido validar en frontend.

Según el contrato real, comprueba:

- título;
- descripción;
- etiquetas;
- categoría;
- campos obligatorios;
- límites de longitud;
- formatos o restricciones aplicables.

La validación frontend mejora la experiencia.

NO sustituye a la validación backend.

El backend sigue siendo la comprobación definitiva.

No inventes restricciones que no existan en el contrato.

Muestra errores claros asociados al campo correspondiente siempre que sea posible.

==================================================
FASE 9 — GUARDADO
==================================================

Conecta el formulario con la API real de edición.

Durante el guardado:

- muestra un estado visible;
- evita envíos repetidos;
- deshabilita la acción de guardar mientras la petición está activa;
- no pierdas los valores introducidos.

Utiliza las utilidades API existentes.

No hardcodees URLs si el proyecto ya centraliza configuración.

Envía exactamente la estructura que espera backend.

==================================================
FASE 10 — MANEJO DE ERRORES
==================================================

Gestiona claramente al menos:

- validación;
- falta de permisos;
- vídeo inexistente;
- sesión inválida/expirada;
- conexión;
- errores backend inesperados cuando corresponda.

VALIDACIÓN

Si backend devuelve errores de validación:

- muéstralos de forma comprensible;
- conserva todos los cambios introducidos.

PERMISOS

Si backend devuelve falta de permisos:

- no pierdas la información innecesariamente;
- muestra/aplica el comportamiento definido por el proyecto;
- no permitas continuar guardando como si el usuario tuviera permisos.

VÍDEO INEXISTENTE

Si el vídeo deja de existir:

- muestra el estado correspondiente;
- no trates el error como una validación normal del formulario.

SESIÓN

Si la sesión expira:

- utiliza el flujo existente de autenticación;
- no inventes otro mecanismo.

CONEXIÓN

Si falla la conexión:

- muestra un mensaje claro;
- conserva título, descripción, etiquetas y categoría introducidos.

==================================================
FASE 11 — CONSERVAR CAMBIOS TRAS ERROR
==================================================

Cuando falle el guardado:

- NO restaures automáticamente los valores originales;
- conserva las modificaciones introducidas por el usuario;
- permite corregir el problema y volver a intentar.

Solo sustituye los datos del formulario por datos del servidor si existe una razón real y está respaldada por el comportamiento existente.

==================================================
FASE 12 — CONFIRMACIÓN Y ACTUALIZACIÓN
==================================================

Cuando el guardado termine correctamente:

- muestra una confirmación clara;
- utiliza la respuesta real del backend;
- actualiza la información visible del vídeo.

Después del guardado, el usuario debe poder comprobar que:

- el título actualizado se muestra;
- la descripción actualizada se muestra;
- las etiquetas actualizadas se muestran;
- la categoría actualizada se muestra.

Esto puede hacerse mediante:

- actualización del estado existente;
- invalidación/refetch;
- navegación al detalle;
- otro patrón ya utilizado por el proyecto.

Utiliza la opción que mejor encaje con la arquitectura existente.

No dupliques fuentes de verdad innecesariamente.

==================================================
FASE 13 — CANCELAR EDICIÓN
==================================================

El usuario debe poder cancelar.

Cancelar debe:

- no enviar ninguna petición de actualización;
- no guardar modificaciones;
- volver al destino apropiado siguiendo la navegación existente.

No inventes un flujo nuevo si el proyecto ya tiene un patrón de cancelación/navegación.

Si existen cambios locales no guardados, no añadas diálogos extra de confirmación salvo que ya formen parte del estándar del proyecto o sean necesarios por los requisitos.

==================================================
FASE 14 — PRUEBAS DE INTERFAZ
==================================================

Utiliza únicamente las herramientas de testing ya configuradas.

No introduzcas otro framework.

Añade o adapta pruebas para cubrir como mínimo:

1. VISUALIZACIÓN COMO PROPIETARIO

- propietario autenticado ve la opción de editar;
- puede acceder al formulario.

2. USUARIO NO PROPIETARIO

- no ve la opción de editar;
- acceso directo a la ruta se gestiona correctamente.

3. USUARIO SIN SESIÓN

- acceso directo a edición activa el flujo de login correspondiente.

4. CARGA INICIAL

- muestra estado de carga;
- carga título;
- carga descripción;
- carga etiquetas;
- carga categoría.

5. VÍDEO INEXISTENTE

- muestra el comportamiento correspondiente;
- no muestra un formulario válido vacío.

6. VALIDACIÓN FRONTEND

- campos obligatorios;
- límites;
- restricciones existentes.

7. GUARDADO CORRECTO

- utiliza la API correcta;
- envía los valores correctos;
- muestra estado de guardado;
- evita envíos repetidos.

8. CONFIRMACIÓN

- muestra confirmación;
- la información visible queda actualizada.

9. ERROR DE VALIDACIÓN BACKEND

- muestra error;
- conserva los cambios introducidos.

10. ERROR DE PERMISOS

- muestra/aplica el comportamiento correcto.

11. ERROR DE CONEXIÓN

- informa correctamente;
- mantiene los datos del formulario.

12. CANCELACIÓN

- no envía cambios;
- navega correctamente.

13. TECLADO / ACCESIBILIDAD

Dentro del nivel de testing existente:

- formulario usable mediante teclado;
- controles correctamente asociados;
- botones accesibles;
- mensajes importantes visibles para el usuario.

Prioriza comportamiento observable.

No pruebes detalles internos innecesarios.

==================================================
FASE 15 — VALIDACIÓN
==================================================

Ejecuta todas las comprobaciones que exija el repositorio.

Incluye, según corresponda:

- tests específicos de esta funcionalidad;
- suite frontend completa;
- build;
- lint;
- format/check;
- `git diff --check`;
- cualquier validación definida por CI.

Si una validación falla:

PRIMERO determina si está causada por esta contribución.

Si ESTÁ causada por tus cambios:

- corrígela antes de continuar.

Si NO está causada por esta contribución:

- demuestra que es realmente ajena;
- no modifiques archivos fuera de alcance para solucionarla;
- documenta el problema;
- si las reglas existentes permiten continuar, no bloquees commit/PR por un fallo preexistente o ajeno.

No hagas cambios masivos de:

- formato;
- CRLF/LF;
- configuración;
- dependencias;

sobre archivos ajenos a esta contribución.

==================================================
FASE 16 — DOCUMENTACIÓN Y PROMPT
==================================================

Antes de modificar cualquier documentación, revisa OTRA VEZ todos los `.md` relevantes.

No modifiques documentación innecesariamente.

Solo actualiza documentos si es realmente necesario para reflejar el comportamiento implementado.

PROMPT DE IA

Revisa:

- `prompts/README.md`;
- TODOS los prompts existentes;
- reglas de `AGENTS.md`;
- requisitos relacionados con IA;
- cualquier skill relacionada.

Determina si esta tarea debe:

- reutilizar un prompt existente;
- o crear un nuevo archivo dentro de `prompts/`.

No supongas.

Decídelo según la documentación existente.

Si debe reutilizarse uno:

- utiliza ese;
- registra el uso siguiendo las reglas existentes.

Si debe crearse uno nuevo:

- utiliza exactamente la convención de nombres existente;
- sigue la estructura existente;
- conserva el prompt realmente utilizado;
- incluye las referencias necesarias.

No modifiques políticas generales del proyecto simplemente para registrar este prompt.

==================================================
FASE 17 — REVISIÓN FINAL ANTES DEL COMMIT
==================================================

Antes del commit:

1. Revisa el diff completo.
2. Comprueba uno por uno todos los criterios de aceptación.
3. Confirma que no has implementado funcionalidades fuera del alcance.
4. Confirma que backend no ha sido modificado salvo que fuese imprescindible y previamente justificado.
5. Comprueba que no existen archivos ajenos incluidos.
6. Confirma que el prompt está registrado correctamente.
7. Confirma que estás en la rama correcta.
8. Confirma que los permisos frontend coinciden con backend.
9. Confirma que los datos introducidos se conservan ante errores de guardado.
10. Confirma que cancelar no realiza actualización.
11. Confirma que el estado visible después del guardado refleja los datos guardados realmente.

==================================================
FASE 18 — COMMIT
==================================================

Si todo está correcto, realiza el commit siguiendo EXACTAMENTE el workflow documentado del proyecto.

ANTES:

- revisa otra vez todos los `AGENTS.md`;
- revisa documentación Git relevante;
- revisa conventional commits;
- revisa reglas de IA;
- revisa `.agents/skills/commit-ai-change/SKILL.md`.

Si la skill aplica:

- úsala exactamente como está documentada.

El commit debe:

- incluir exclusivamente esta contribución;
- excluir cambios ajenos;
- utilizar el formato de commit requerido;
- referenciar la tarea/requisito si corresponde;
- indicar asistencia de IA si corresponde;
- referenciar el prompt utilizado según las reglas existentes.

No inventes el mensaje si ya existen reglas para generarlo.

==================================================
FASE 19 — PUSH Y PULL REQUEST
==================================================

Después de un commit correcto:

- publica la rama;
- configura upstream si corresponde;
- no hagas push directo a `main`;
- no uses force push.

Después crea un Pull Request hacia `main`.

ANTES de abrirlo:

- revisa diff rama -> main;
- revisa commits;
- confirma que solo contiene esta funcionalidad;
- confirma que no arrastra cambios de otra rama/tarea.

Utiliza la plantilla de Pull Request existente si existe.

El PR debe resumir:

- objetivo;
- visibilidad de edición solo para propietarios;
- protección del acceso directo;
- carga de metadatos actuales;
- campos editables;
- validación;
- API real utilizada;
- estados de carga/guardado;
- prevención de dobles envíos;
- errores;
- conservación de cambios ante fallo;
- confirmación;
- actualización de información visible;
- cancelación;
- responsive;
- teclado/accesibilidad;
- tests;
- validaciones;
- referencia al requisito;
- referencia al prompt/IA según las reglas existentes.

NO HAGAS MERGE.

El Pull Request debe quedar pendiente de:

- CI;
- aprobación de otro miembro;
- revisión/comentarios de Copilot;
- cualquier otra condición documentada.

==================================================
RESUMEN FINAL
==================================================

Cuando termines, dime:

- toda la documentación relevante revisada;
- rama inicial;
- rama creada/utilizada;
- estado Git inicial;
- qué implementación frontend ya existía;
- qué contrato backend de edición encontraste;
- endpoint de lectura utilizado;
- endpoint de edición;
- método HTTP;
- request;
- response;
- campos editables;
- validaciones backend encontradas;
- comportamiento de ownership/permisos;
- comportamiento sin sesión;
- comportamiento con vídeo inexistente;
- archivos modificados;
- archivos nuevos;
- comportamiento implementado;
- cómo se controla que solo el propietario vea editar;
- cómo se protege el acceso directo;
- cómo se cargan los valores actuales;
- cómo se gestionan etiquetas y categoría;
- cómo se evita doble envío;
- cómo se conservan los cambios ante error;
- cómo funciona cancelar;
- cómo se refleja la información guardada;
- responsive/accesibilidad;
- tests añadidos/modificados;
- comandos de validación ejecutados;
- resultados;
- fallos ajenos detectados;
- prompt utilizado y ubicación;
- hash del commit;
- mensaje final del commit;
- resultado del push;
- URL y título del Pull Request;
- estado de CI si está disponible;
- pasos pendientes antes del merge.

No implementes nada fuera de los criterios de aceptación.

Especialmente:

- no conviertas la comprobación de permisos frontend en sustituto de la autorización backend;
- no rehagas funcionalidades existentes;
- no modifiques backend por comodidad;
- no introduzcas cambios ajenos a la edición de metadatos.

## Notes

Ampliación backend autorizada expresamente por el usuario después de identificar el bloqueo real: «Autorizo esta ampliación de trabajo en el backend para poder desbloquear la interfaz completa.»

Aplicar commit-ai-change. Commit, push y PR hacia main autorizados por la petición original. No hacer merge. No modificar políticas generales ni datos habituales del equipo.

### Contexto revisado y rama

AGENTS raíz, frontend y backend; README, DEVELOPMENT, REQUIREMENT;
frontend/README, .run/README, tooling/videoGrabber/README;
todos los Markdown de docs: AUTHENTICATION, AUTH_FORMS, CATALOG_PERSISTENCE,
DOCKER_COMPOSE, GITHUB_SETUP, modelo-base-datos, SHARED_CATALOG, sprint1-api,
TESTING, USER_OWNERSHIP, VIDEO_CATALOG, VIDEO_DETAIL, VIDEO_IMPORT,
VIDEO_MANAGEMENT_TESTS, VIDEO_PUBLICATION y VISUAL_STANDARD;
todos los prompts anteriores (01–08, ambos 04), README y TEMPLATE;
.agents/skills/commit-ai-change/SKILL.md y el workflow CI.

Estado inicial limpio en feat/frontend-video-publication, sin diferencias de
contenido con main. Sus commits estaban incorporados mediante squash en main.
Fetch de origin completado; rama propia feat/frontend-video-editing desde
origin/main f8a1e5b. No se encontró convención obligatoria de nombres.
No se arrastran commits de publicación ni cambios locales ajenos.

Existían sesión compartida, ProtectedRoute para la URL de edición, cliente API
con cookies/CSRF, clases compartidas de formularios y detalle con etiquetas.
La ruta de edición era un placeholder. El PATCH real solo admitía título y
descripción, y devolvía id/title/description; el detalle no exponía categoría
ni identidad de propietario. Se detuvo el trabajo y el usuario autorizó la
ampliación mínima de backend, conservada arriba.

### Alcance implementado y revisión de aceptación

Nuevo editor en la ruta existente, propiedad por ownerId y autorización backend,
carga de valores reales, categoría obtenida de las filas ya persistidas,
etiquetas por línea (conservando comas), validación equivalente a Java para los
campos obligatorios y longitud del título. La normalización final de etiquetas
es del servidor. PATCH parcial ampliado con tags y categoryId, distinción entre
categoría omitida y null para quitarla, y detalle completo como respuesta.
Sin migraciones, nuevas dependencias, cambios de seguridad, subida o borrado.

Carga/guardado anunciados, bloqueo síncrono de dobles envíos, errores con foco,
conservación de los cuatro campos tras fallo y borrador en App por cuenta/vídeo
para recuperarlo tras caducidad. 403 de propiedad y 404 impiden nuevos guardados;
CSRF inválido permite reintentar sin repetición automática. Login conserva su
destino anterior al catálogo. Confirmación con los cuatro datos devueltos por
PATCH y apertura/refetch del detalle. Cancelar no escribe y vuelve al detalle.
Clases/tokens existentes y select nativo; inspección de capturas a 320/1440 px,
tabulación, labels, foco y ausencia de desbordamiento comprobados.

Guía técnica nueva docs/VIDEO_EDITING.md; AUTH_FORMS y VIDEO_DETAIL actualizados
solo para sustituir sus afirmaciones obsoletas sobre el placeholder y el DTO.
No se cambian políticas generales ni prompts anteriores.

### Validación local (2026-11-03)

- npm run build: TypeScript/Vite correctos. Esbuild requiere ejecución fuera
  del sandbox por sus permisos de lectura; npm.cmd evita la política del wrapper PS.
- npm run lint: cero errores; únicamente el aviso previo de Fast Refresh en
  SessionContext.tsx. Prettier --check correcto para todos los archivos frontend
  modificados; npx tsc -p tsconfig.e2e.json --noEmit correcto.
- npm run test:ci: 13 suites, 118 pruebas y un snapshot correctos. Cobertura:
  96,74 % líneas, 95,20 % sentencias, 94,11 % funciones, 94,55 % ramas.
- npm run test:contrast: los 17 pares existentes cumplen.
- Java Corretto 21 y mvn --offline --batch-mode clean verify: 163 casos,
  143 ejecutados y 20 opcionales omitidos; cero fallos/errores. Todos los mínimos
  JaCoCo superados, 679/699 líneas cubiertas. Pruebas específicas: 20/20.
- npm run test:e2e -- --workers=2: 14 regresiones correctas, dos fallos previos
  de login en auth.spec.ts:46 y cuatro dependientes no ejecutadas.
- Reproducción independiente en checkout limpio de origin/main f8a1e5b:
  npm run test:e2e -- --project=regression --grep 'real authentication' --workers=2.
  Mismo fallo a 1440 px: alerta vacía en vez de «Email o contraseña incorrectos»;
  caso 320 px correcto. Checkout temporal protube-editing-baseline-20261103,
  puertos 18086/15176. Confirma la intermitencia ya documentada en prompt 08.
  auth.ts, SessionContext.tsx, AuthForm.tsx y e2e/auth.spec.ts coinciden con main.
  No se corrige autenticación ajena al alcance. El fallo se documenta en el PR.
- Verificación independiente final: npm run test:e2e -- --project=editing
  --project=publication --no-deps --workers=2: 4/4 correctas con Spring real,
  cookies/CSRF, metadatos persistidos, cancelación, permisos, 404, catálogo y
  reproducción de las pruebas existentes de publicación. Puertos 18085/15175.
- git diff --check correcto. Sin datos del PostgreSQL o almacén habitual;
  PostgreSQL opcional no ejecutado. CI remoto y aprobación/Copilot son requisitos
  separados antes del merge; no se afirma que la suite E2E completa esté verde.
