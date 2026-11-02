# Publicación de vídeos desde frontend

**Approved on:** 2026-11-02
**Approved by:** Equipo, confirmado por el usuario: «Sí, el equipo aprueba el prompt».
**Used for:** US-06, formulario frontend de publicación conectado a la API existente; rama feat/frontend-video-publication.

## Prompt

Quiero que completes la funcionalidad de publicación de vídeos desde frontend.

OBJETIVO

Permitir publicar vídeos desde un formulario que informe correctamente del estado de la operación y de los errores.

CRITERIOS DE ACEPTACIÓN

La funcionalidad debe:

- Permitir seleccionar un archivo de vídeo.
- Permitir introducir título.
- Permitir introducir descripción.
- Informar de los formatos admitidos.
- Informar del tamaño máximo permitido.
- Aplicar el estándar visual y los componentes compartidos del proyecto.
- Validar los campos antes del envío.
- Mantener las validaciones del backend como comprobación definitiva.
- Redirigir al login al visitante que acceda a esta página sin sesión.
- Conectar el formulario con la API real de publicación de vídeos ya implementada en backend.
- Mostrar un estado de subida mientras se envía.
- Evitar envíos repetidos mientras una subida está en curso.
- Mostrar errores claros de:
  - validación,
  - sesión/autenticación,
  - conexión,
  - almacenamiento/backend.
- Conservar título y descripción cuando falle el envío.
- Avisar claramente si, tras un fallo, es necesario volver a seleccionar el archivo.
- Confirmar correctamente cuando la publicación haya terminado.
- Facilitar el acceso al vídeo publicado.
- Comprobar que el vídeo recién publicado aparece en el catálogo real.
- Comprobar que, al seleccionarlo desde el catálogo, puede abrirse y reproducirse usando las funcionalidades ya existentes.
- Funcionar correctamente tanto en móvil como en escritorio.
- Poder utilizarse con teclado.
- Incluir pruebas de:
  - formulario,
  - autenticación,
  - envío,
  - confirmación,
  - errores.
- Funcionar integrada con el resto del proyecto.
- Superar las comprobaciones de CI.

IMPORTANTE

Esta tarea es principalmente de FRONTEND.

La API de publicación de vídeos ya existe en backend y debe utilizarse como fuente de verdad.

No rediseñes ni vuelvas a implementar el backend.

Solo modifica backend si encuentras un bloqueo real que impida cumplir los criterios de aceptación y que no pueda resolverse correctamente desde frontend. Si ocurre, detente y explícame el problema antes de modificar backend.

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
- subida de vídeos;
- almacenamiento;
- API;
- validaciones;
- límites de archivos;
- formatos admitidos;
- manejo de errores;
- componentes compartidos;
- estándar visual;
- accesibilidad;
- responsive;
- testing;
- routing;
- CI;
- Git;
- ramas;
- commits;
- Pull Requests;
- uso de IA;
- conservación de prompts;
- skills para agentes.

Incluye como mínimo, si existen:

- todos los `AGENTS.md`, incluidos los de subdirectorios;
- `README.md`;
- `DEVELOPMENT.md`;
- `REQUIREMENT.md`;
- todos los `.md` dentro de `docs/`;
- todos los `.md` dentro de `prompts/`;
- `prompts/README.md`;
- README/documentación específica de frontend;
- README/documentación específica de backend;
- documentación de autenticación;
- documentación de subida/almacenamiento;
- documentación Git/GitHub;
- `.agents/skills/**/SKILL.md`;
- cualquier otro `.md` relevante que encuentres.

No empieces a implementar hasta haber entendido las reglas y decisiones existentes.

No inventes convenciones si ya existen.

==================================================
FASE 1 — INSPECCIONAR LA IMPLEMENTACIÓN EXISTENTE
==================================================

Después de revisar toda la documentación, inspecciona el código existente.

FRONTEND

Revisa completamente lo relacionado con:

- App;
- routing;
- autenticación;
- sesión de usuario;
- protección de rutas;
- login;
- componentes de formularios;
- inputs;
- botones;
- mensajes de error;
- componentes de loading;
- componentes compartidos;
- estilos;
- responsive;
- hooks;
- utilidades HTTP/API;
- Env.ts;
- catálogo;
- detalle de vídeo;
- reproductor;
- tests;
- mocks;
- configuración de Jest/Testing Library.

No asumas que hay que crear componentes nuevos si ya existen componentes compartidos adecuados.

Reutiliza:

- componentes;
- hooks;
- utilidades;
- tipos;
- estilos;
- patrones de navegación;
- patrones de manejo de errores;
- convenciones de testing.

BACKEND

Aunque esta tarea sea frontend, revisa el backend necesario para conocer exactamente el contrato real de publicación.

Inspecciona como mínimo:

- controller del endpoint de subida/publicación;
- DTOs;
- request multipart;
- parámetros esperados;
- nombres exactos de los campos;
- autenticación requerida;
- servicios;
- validaciones;
- formatos permitidos;
- tamaño máximo;
- almacenamiento;
- respuestas de éxito;
- códigos HTTP de error;
- ApiError o estructura de errores existente;
- seguridad;
- tests de integración de subida;
- cualquier documentación relacionada.

Determina directamente a partir del código real:

- endpoint;
- método HTTP;
- Content-Type;
- nombres de los campos multipart;
- campos obligatorios;
- formato esperado para título y descripción;
- formatos de archivo admitidos;
- tamaño máximo;
- comportamiento con sesión válida;
- comportamiento sin sesión;
- respuesta de éxito;
- identificador o URL del vídeo publicado;
- errores de validación;
- errores de autenticación;
- errores de almacenamiento;
- errores inesperados.

No inventes el contrato.

No dupliques validaciones arbitrarias en frontend que contradigan backend.

==================================================
FASE 2 — CAMBIO MÍNIMO NECESARIO
==================================================

Antes de modificar archivos, determina el conjunto mínimo de cambios necesario.

NO:

- hagas refactors generales;
- cambies arquitectura;
- añadas librerías si no son necesarias;
- reimplementes autenticación;
- cambies backend por comodidad;
- añadas funcionalidades futuras;
- implementes edición de vídeos;
- añadas búsqueda;
- añadas analytics;
- rehagas catálogo;
- rehagas detalle;
- rehagas reproducción;
- hagas mejoras visuales fuera del alcance;
- dupliques componentes existentes.

Haz únicamente lo necesario para cumplir los criterios de aceptación.

==================================================
FASE 3 — FORMULARIO DE PUBLICACIÓN
==================================================

Implementa el formulario siguiendo los componentes y estándar visual ya existentes.

Debe permitir:

- seleccionar un archivo;
- introducir título;
- introducir descripción.

Utiliza:

- labels correctos;
- componentes compartidos existentes;
- estados accesibles;
- navegación por teclado;
- layout compatible con móvil y escritorio.

No hardcodees estilos si existen componentes o tokens compartidos.

==================================================
FASE 4 — INFORMACIÓN DE ARCHIVO
==================================================

Muestra al usuario:

- formatos admitidos;
- tamaño máximo.

Estos valores deben basarse en el backend real o en configuración/documentación existente.

No inventes límites.

Si ya existe una constante compartida adecuada, reutilízala.

==================================================
FASE 5 — VALIDACIÓN FRONTEND
==================================================

Antes de enviar:

Valida únicamente lo que tenga sentido validar en cliente.

Como mínimo, según el contrato real:

- archivo seleccionado;
- título obligatorio si aplica;
- descripción obligatoria si aplica;
- formato de archivo;
- tamaño máximo;
- límites de longitud si existen.

Las validaciones de frontend sirven para mejorar la experiencia.

El backend sigue siendo la fuente definitiva de validación.

No intentes sustituir las validaciones backend.

Los mensajes deben ser claros y asociarse correctamente a sus campos.

==================================================
FASE 6 — AUTENTICACIÓN
==================================================

La página de publicación requiere sesión.

Si un visitante sin sesión intenta acceder:

- redirígelo al login usando el sistema existente;
- no implementes un sistema de autenticación nuevo;
- conserva el comportamiento de retorno/redirección existente si el proyecto ya lo contempla.

Revisa cómo están protegidas otras páginas autenticadas y sigue exactamente el mismo patrón.

==================================================
FASE 7 — ENVÍO A LA API REAL
==================================================

Conecta el formulario con el endpoint real de backend.

Usa el contrato multipart real.

No uses mocks como implementación final.

Durante el envío:

- muestra un estado visible de subida;
- deshabilita o bloquea el envío repetido;
- evita dobles peticiones;
- conserva el estado de los campos de texto.

No hardcodees la URL si el proyecto ya utiliza utilidades o `Env.ts`.

==================================================
FASE 8 — MANEJO DE ERRORES
==================================================

Distingue correctamente, siempre que el contrato backend lo permita:

- errores de validación;
- sesión expirada / no autenticado;
- errores de conexión;
- errores de almacenamiento;
- errores inesperados.

No conviertas todos los errores en un único mensaje genérico si existe información suficiente para diferenciarlos.

SESIÓN

Si el backend indica que la sesión ya no es válida:

- utiliza el comportamiento de autenticación existente;
- redirige al login si así funciona el proyecto;
- no inventes otro flujo.

CONEXIÓN

Si la petición no llega al backend:

- muestra un error comprensible;
- conserva título y descripción.

ALMACENAMIENTO / BACKEND

Si backend rechaza o no puede guardar el vídeo:

- muestra el mensaje adecuado;
- conserva título y descripción.

ARCHIVO

Ten en cuenta que los navegadores pueden no permitir restaurar automáticamente un input de tipo file por motivos de seguridad.

Si tras un fallo el archivo ya no puede mantenerse seleccionado:

- conserva los campos de texto;
- informa claramente al usuario de que debe volver a seleccionar el archivo.

No intentes manipular el input file de forma insegura.

==================================================
FASE 9 — CONFIRMACIÓN
==================================================

Cuando la publicación finalice correctamente:

- muestra una confirmación clara;
- utiliza la respuesta real del backend;
- facilita el acceso al vídeo publicado.

Si el backend devuelve un ID:

- construye la navegación utilizando las rutas existentes.

No inventes rutas nuevas si ya existe una ruta de detalle.

==================================================
FASE 10 — VERIFICACIÓN DEL VÍDEO PUBLICADO
==================================================

Después de una publicación correcta, comprueba que el vídeo creado queda integrado con las funcionalidades ya existentes.

La comprobación debe verificar que:

- el vídeo publicado aparece en el catálogo real;
- al seleccionarlo desde el catálogo se puede acceder a su detalle;
- el vídeo publicado se puede reproducir correctamente utilizando la funcionalidad existente.

IMPORTANTE:

Esto es una VERIFICACIÓN DE INTEGRACIÓN.

NO es una petición para desarrollar de nuevo esas funcionalidades.

No:

- rehagas el catálogo;
- rehagas la página de detalle;
- rehagas el reproductor;
- modifiques esas funcionalidades si ya funcionan correctamente.

El flujo que se quiere comprobar es únicamente:

publicar vídeo
→ aparece en catálogo
→ seleccionar vídeo
→ abrir detalle
→ reproducir vídeo

Solo realiza cambios fuera del formulario de publicación si existe un problema directamente causado por esta nueva integración y es imprescindible corregirlo para que el vídeo recién publicado pueda utilizarse con las funcionalidades existentes.

Si catálogo, detalle o reproducción fallan por un problema previo o ajeno a esta contribución:

- no lo corrijas dentro de esta tarea;
- documenta claramente el problema;
- indica qué comprobación no ha podido completarse;
- explica por qué es ajeno a esta implementación.

==================================================
FASE 11 — RESPONSIVE Y ACCESIBILIDAD BÁSICA
==================================================

Comprueba que el formulario funciona en:

- móvil;
- escritorio.

Debe ser usable con teclado.

Revisa como mínimo:

- orden de tabulación;
- labels;
- botones;
- foco;
- mensajes de error;
- controles deshabilitados;
- input de archivo;
- confirmación.

No hagas una auditoría general de accesibilidad fuera de esta funcionalidad.

==================================================
FASE 12 — PRUEBAS
==================================================

Utiliza exclusivamente las herramientas de testing ya configuradas.

No introduzcas otro framework.

Añade o adapta pruebas para cubrir como mínimo:

1. FORMULARIO

- muestra archivo, título y descripción;
- muestra formatos admitidos;
- muestra tamaño máximo.

2. VALIDACIÓN

- campos obligatorios;
- archivo ausente;
- formato inválido;
- tamaño excesivo;
- cualquier otra validación definida por el contrato real.

3. AUTENTICACIÓN

- visitante sin sesión no puede usar la página;
- se produce la redirección esperada al login.

4. ENVÍO CORRECTO

- construye correctamente la petición;
- usa los nombres de campos correctos;
- muestra estado de subida;
- evita envíos repetidos.

5. CONFIRMACIÓN

- muestra publicación correcta;
- permite acceder al vídeo publicado.

6. ERRORES DE VALIDACIÓN BACKEND

- muestra correctamente el error;
- conserva título y descripción.

7. ERROR DE SESIÓN

- muestra/aplica el comportamiento de sesión esperado.

8. ERROR DE CONEXIÓN

- informa correctamente;
- conserva los campos de texto.

9. ERROR DE ALMACENAMIENTO

- muestra un mensaje claro.

10. ARCHIVO TRAS FALLO

- si el archivo debe seleccionarse de nuevo, informa al usuario.

11. INTEGRACIÓN DEL VÍDEO PUBLICADO

Cuando el nivel de testing existente del proyecto lo permita, verifica el flujo:

- publicación correcta;
- el nuevo vídeo puede aparecer posteriormente en el catálogo;
- su identificador permite abrir el detalle correspondiente;
- puede utilizarse la reproducción existente.

No dupliques ni reimplementes tests completos del catálogo, detalle o reproductor si esas funcionalidades ya tienen sus propias pruebas.

Esta parte debe verificar integración, no volver a probar internamente toda la implementación de esas funcionalidades.

Prioriza comportamientos observables por el usuario.

==================================================
FASE 13 — VALIDACIÓN
==================================================

Ejecuta todas las comprobaciones que exija el repositorio.

Incluye, según corresponda:

- tests específicos;
- suite frontend completa;
- build;
- lint;
- format/check;
- `git diff --check`;
- cualquier comprobación definida por CI;
- cualquier test de integración necesario.

Si una validación falla:

PRIMERO determina si el fallo está causado por esta contribución.

Si está causado por estos cambios:

- corrígelo.

Si NO está causado por estos cambios:

- verifica que sea realmente ajeno;
- no modifiques archivos fuera de alcance para solucionarlo;
- documenta el fallo;
- si las reglas del proyecto permiten continuar, no bloquees commit/PR por un problema preexistente o ajeno.

No hagas cambios masivos de formato, CRLF/LF o configuración sobre archivos que no pertenecen a esta contribución.

==================================================
FASE 14 — DOCUMENTACIÓN Y PROMPT
==================================================

Antes de modificar documentación, revisa OTRA VEZ todos los `.md` relevantes.

No modifiques documentación innecesariamente.

Solo actualiza `.md` si es necesario para reflejar el comportamiento implementado.

Para el prompt:

- revisa `prompts/README.md`;
- revisa TODOS los prompts existentes;
- determina si debe reutilizarse uno existente o crearse uno nuevo;
- sigue exactamente las convenciones existentes.

No modifiques políticas generales para registrar este trabajo.

Si corresponde crear un nuevo archivo:

- usa el nombre correcto según las convenciones;
- conserva el prompt realmente utilizado;
- sigue el formato de los demás.

Si corresponde reutilizar uno existente:

- utiliza ese;
- registra esta utilización de acuerdo con las reglas existentes;
- no alteres políticas generales innecesariamente.

==================================================
FASE 15 — RAMA DE TRABAJO
==================================================

Esta funcionalidad debe realizarse en una rama propia.

ANTES DE MODIFICAR CÓDIGO:

- comprueba rama actual;
- ejecuta `git status`;
- revisa cambios locales;
- revisa diferencias respecto a `main`;
- revisa TODA la documentación relacionada con Git, ramas, commits y Pull Requests.

No mezcles esta funcionalidad con cambios de otra tarea.

Si existen cambios locales de otra contribución:

- no los sobrescribas;
- no los incluyas;
- no uses operaciones destructivas para eliminarlos;
- detente si impiden crear una rama limpia de forma segura.

La rama debe partir del punto correcto según el workflow existente.

Busca si existe una convención de nombres.

Si existe:

- úsala.

Si no existe:

- crea un nombre descriptivo relacionado con publicación/subida de vídeos.

No reutilices una rama de otra funcionalidad ya terminada.

No uses:

- `reset --hard`;
- `clean`;
- force push;
- comandos que descarten trabajo válido.

==================================================
FASE 16 — REVISIÓN FINAL
==================================================

Antes del commit:

1. Revisa el diff completo.
2. Comprueba uno a uno todos los criterios de aceptación.
3. Confirma que no has implementado funcionalidades fuera de alcance.
4. Confirma que backend no ha sido modificado salvo que fuera imprescindible y previamente justificado.
5. Confirma que no hay archivos ajenos incluidos.
6. Confirma que el prompt está registrado correctamente.
7. Confirma que estás en la rama correcta.
8. Revisa que responsive y teclado estén cubiertos.
9. Revisa que los errores no borren innecesariamente título y descripción.
10. Confirma que la comprobación de catálogo/detalle/reproducción se ha tratado únicamente como integración del vídeo publicado y no como una reimplementación de esas funcionalidades.

==================================================
FASE 17 — COMMIT
==================================================

Si todo es correcto, realiza el commit siguiendo EXACTAMENTE el workflow documentado.

Antes:

- revisa todos los `AGENTS.md`;
- revisa toda la documentación Git relevante;
- revisa conventional commits;
- revisa reglas de IA;
- revisa `.agents/skills/commit-ai-change/SKILL.md`.

Si la skill aplica:

- úsala exactamente.

El commit debe:

- contener solo esta contribución;
- seguir el formato exigido;
- incluir referencias requeridas;
- indicar asistencia de IA si corresponde;
- referenciar el prompt utilizado.

No inventes el mensaje si el proyecto ya define cómo debe construirse.

==================================================
FASE 18 — PUSH Y PULL REQUEST
==================================================

Después de un commit correcto:

- publica la rama;
- configura upstream si corresponde;
- no hagas push directo a `main`;
- no uses force push.

Después crea un Pull Request hacia `main`.

Antes:

- revisa diff rama -> main;
- revisa commits;
- confirma que únicamente contiene esta funcionalidad.

Usa la plantilla de PR existente si existe.

El PR debe resumir:

- objetivo;
- formulario de publicación;
- campos;
- validación frontend;
- validación backend definitiva;
- autenticación;
- endpoint real consumido;
- estado de subida;
- prevención de dobles envíos;
- errores;
- conservación de título/descripción;
- comportamiento del archivo tras fallo;
- confirmación;
- acceso al vídeo publicado;
- verificación de que el vídeo publicado aparece en catálogo, puede abrirse y reproducirse;
- responsive;
- teclado/accesibilidad;
- tests;
- validaciones;
- referencia al requisito;
- referencia al prompt/IA según las reglas existentes.

NO HAGAS MERGE.

El PR debe quedar pendiente de las comprobaciones definidas por el proyecto:

- CI;
- aprobación;
- Copilot;
- cualquier otro requisito documentado.

==================================================
RESUMEN FINAL
==================================================

Cuando termines, dime:

- toda la documentación relevante revisada;
- qué implementación frontend ya existía;
- qué contrato de publicación backend encontraste;
- endpoint utilizado;
- método;
- Content-Type;
- campos multipart;
- formatos admitidos;
- tamaño máximo;
- respuestas relevantes del backend;
- archivos modificados;
- archivos nuevos;
- comportamiento implementado;
- validaciones frontend implementadas;
- manejo de errores;
- comportamiento tras perder sesión;
- comportamiento del archivo tras fallo;
- confirmación y navegación;
- resultado de verificar que el vídeo publicado aparece en catálogo;
- resultado de verificar que puede abrirse;
- resultado de verificar que puede reproducirse;
- responsive/accesibilidad;
- tests añadidos o modificados;
- comandos ejecutados;
- resultados;
- fallos ajenos detectados;
- rama inicial;
- rama creada;
- prompt utilizado;
- hash del commit;
- mensaje final;
- resultado del push;
- URL y título del PR;
- estado de CI si está disponible;
- pasos pendientes antes del merge.

No implementes nada fuera de los criterios de aceptación.

Especialmente, no conviertas la verificación del vídeo publicado en una reimplementación del catálogo, página de detalle o reproductor.

## Notes

Aclaración del usuario: «Generar automáticamente una miniatura del vídeo en frontend».
El contrato exige thumbnail; generar WebP en el navegador, sin modificar backend.
Usar commit-ai-change; commit, push y PR hacia main autorizados; no hacer merge.

### Contexto revisado

Todos los Markdown del repositorio: AGENTS raíz/frontend/backend, README,
DEVELOPMENT, REQUIREMENT, frontend/README, .run/README, tooling/videoGrabber/README;
docs/AUTHENTICATION, AUTH_FORMS, CATALOG_PERSISTENCE, DOCKER_COMPOSE,
GITHUB_SETUP, modelo-base-datos, SHARED_CATALOG, sprint1-api, TESTING,
USER_OWNERSHIP, VIDEO_CATALOG, VIDEO_DETAIL, VIDEO_IMPORT,
VIDEO_MANAGEMENT_TESTS y VISUAL_STANDARD; todos los prompts 01–07, ambos 04,
README y TEMPLATE; .agents/skills/commit-ai-change/SKILL.md y el workflow CI.
Inspeccionados App, sesión, protección, formularios, estilos/tokens, Env,
catálogo/detalle/reproductor y pruebas/configuración Jest/Playwright; controller,
DTOs, servicio, entidad, seguridad, multipart, almacenamiento y pruebas backend.

### Implementación y revisión

Inicio limpio en main 4398f70, actualizado con fetch e idéntico a origin/main.
Rama propia feat/frontend-video-publication; no hay convención obligatoria de
nombres. Nuevo formulario MP4/título/descripción, miniatura WebP automática,
validación compatible con almacenamiento existente, límite de 100 MiB por
archivo/petición, envío multipart con cookies y CSRF, bloqueo, errores,
confirmación por ID y navegación al detalle existente. Borrador en App para
conservar textos incluso tras redirección por caducidad; aviso de reselección
del archivo al regresar. No se modifican backend, catálogo, detalle, reproductor,
dependencias ni políticas generales. Guía técnica: docs/VIDEO_PUBLICATION.md;
AUTH_FORMS se actualiza solo para dejar de describir upload como un placeholder.

### Validación local (2–3 de noviembre de 2026)

- npm run build: TypeScript y Vite correctos; requiere escalación por permisos
  de lectura de Esbuild en este sandbox. Se utilizan npm.cmd/npx.cmd porque
  PowerShell bloquea los wrappers .ps1 con su política existente.
- npm run test:ci: 12 suites, 94 pruebas y un snapshot correctos. Cobertura:
  97,15 % líneas, 95,44 % sentencias, 93,47 % funciones, 95,75 % ramas.
- npm run lint: sin errores, un aviso previo de Fast Refresh en SessionContext.
- npm run test:contrast: 17 pares correctos. Prettier limitado a los archivos
  frontend de esta contribución, comprobación de tipos E2E y git diff --check.
- Java 21 y mvn --batch-mode clean verify: 159 casos, 139 ejecutados,
  20 opcionales omitidos, cero fallos/errores, todos los mínimos JaCoCo cumplen.
  Fue necesario descargar dependencias ya declaradas antes de verificar.
- Primera suite Playwright completa: 18/18 correctos con Spring real y H2
  aislada. Las nuevas pruebas publican MP4 reales generados en Chromium,
  comprueban miniatura decodificable, confirmación, catálogo, selección del ID,
  detalle y reproducción con avance temporal a 320/1440 px. Teclado, foco,
  ausencia de desbordamiento y capturas revisadas visualmente.
- Repeticiones completas: fallo intermitente previo en auth.spec.ts:46,
  esperado «Email o contraseña incorrectos» y alerta vacía. La traza muestra
  que no se envía POST /auth/login. Reproducido idénticamente en main 4398f70
  mediante worktree temporal independiente y sus dos pruebas originales de
  login a 320/1440 px. No se cambia autenticación ni su E2E fuera de alcance.
- Verificación final independiente: npm run test:e2e -- --project=publication
  --no-deps --workers=2, 2/2 correctos tras añadir limpieza de archivos UUID.
  Puertos de esta rama: 18085/15175; comparación main: 18086/15176.
- No se accede al PostgreSQL ni al almacén habitual del equipo. Las pruebas
  PostgreSQL opcionales locales quedan omitidas; CI remoto se registra en el PR.

Revisión de aceptación: campos, formatos/límites, validación cliente y definitiva
del servidor, sesión/CSRF, estados, errores diferenciados según contrato,
conservación de texto/archivo, reselección tras desmontaje, confirmación y acceso,
integración con catálogo/detalle/reproducción, móvil/escritorio y teclado cubiertos.
El backend no valida códecs ni distingue disco/base de datos mediante códigos;
se informa de sus límites reales sin cambiarlo ni inventar garantías.
