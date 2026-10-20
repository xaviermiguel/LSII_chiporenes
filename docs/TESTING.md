# Pruebas y cobertura

## Requisitos

- Node.js 22 y npm (usar `npm ci` para instalar las versiones del lockfile).
- JDK 21 y Maven 3.9 en PATH. Comprobar `java -version` y `mvn -version`.
- La suite por defecto y las pruebas HTTP de Playwright utilizan H2 aislado. No requieren vídeos descargados ni credenciales Google.
- PostgreSQL es la base del despliegue (`prod` y Docker Compose), no H2. Las pruebas opcionales de PostgreSQL verifican migraciones, JSONB, restricciones, importación y reinicio con una base dedicada; se detallan abajo. H2 no certifica ese despliegue.

## Frontend: Jest y Testing Library

Desde `frontend/`:

```sh
npm ci
npm test
npm run test:ci
```

`npm test` ejecuta las pruebas y calcula cobertura. `test:ci` ejecuta sin interacción y genera además `unit-test-results/unit.json` con los resultados de cada prueba. Para una sola prueba: `npm test -- --runInBand src/components/__tests__/app.test.tsx`.

Informes:

- `frontend/coverage/index.html`: cobertura navegable.
- `frontend/coverage/coverage-summary.json`: porcentajes globales y por archivo.
- `frontend/coverage/lcov.info` y `cobertura-coverage.xml`: integración con otras herramientas.
- `frontend/unit-test-results/unit.json`: resultados de pruebas en CI.

La cobertura incluye todos los `.ts` y `.tsx` de `src`, aunque ninguna prueba los importe. Se excluyen declaraciones de tipos, las propias pruebas, mocks y `main.tsx` (arranque de React). `Env.ts` permanece incluido aunque se simule su configuración en Jest. Jest utiliza Babel para TypeScript/JSX; la comprobación de tipos se hace con `npm run build`.

Se conserva el umbral existente del **75 %** en líneas, sentencias, funciones y ramas, más exigente que el requisito de superar el 50 %. Si cualquiera baja del umbral, el comando falla.

## Backend: JUnit, Mockito y JaCoCo

Desde `backend/`:

```sh
mvn clean verify
```

Para una sola clase: `mvn test -Dtest=VideoServiceTest`. Las pruebas se ejecutan en `test`; el informe y la comprobación global de cobertura se ejecutan en `verify`. Para una medición completa, ejecutar siempre `mvn clean verify` sin limitar las clases.

Informes:

- `backend/target/site/jacoco/index.html`: cobertura navegable.
- `backend/target/site/jacoco/jacoco.xml` y `jacoco.csv`: cobertura para herramientas.
- `backend/target/surefire-reports/`: resultados XML y TXT de las pruebas.

JaCoCo se ejecuta automáticamente; **no hace falta `-Pcoverage`**. Se conserva el umbral del 75 % global para líneas, instrucciones y métodos, y 50 % de líneas por clase. Solo se excluye la clase de entrada `ProtubeBackApplication`. La prueba de contexto usa el directorio temporal de Java y no depende de una ruta Windows concreta.

## E2E: Playwright

Desde `frontend/`, tras `npm ci`:

```sh
npx playwright install chromium
npm run test:e2e
```

En Linux/CI: `npx playwright install --with-deps chromium`.

Playwright arranca un backend real en el puerto **18080** y Vite en **15173**. No reutiliza servidores existentes. Ambos puertos deben estar libres; se cierran los procesos propios al terminar.

La configuración carga explícitamente `backend/src/test/resources/application-e2e.properties`: H2 en memoria, importación desactivada y datos SQL sintéticos. Los recursos están en `src/test`, por lo que no se empaquetan para producción. No se utiliza la base de PostgreSQL ni la carpeta de vídeos de desarrollo/despliegue. Los archivos de `e2e-media` son bytes sintéticos para comprobar HTTP/Range: no son vídeos reproducibles.

Hay dos grupos de comprobaciones:

- **API real por HTTP:** catálogo paginado sin duplicados, detalle con comentarios, Range parcial, parámetros incorrectos y vídeos inexistentes o con archivo ausente.
- **Navegador con API simulada:** listado y error de petición según el contrato actual de la pantalla.

**Integración pendiente:** la API de los compañeros ya devuelve `VideoPage` (`items`, `page`, `size`, `hasNext`), pero `useAllVideos` y `App` todavía esperan `string[]`. Por eso las pruebas de navegador simulan explícitamente ese contrato antiguo y no certifican el recorrido completo navegador → catálogo persistido. La tarea de frontend deberá actualizar el contrato y sustituir esas simulaciones por la API real. Esta tarea de pruebas no modifica funcionalidades ni implementa pantallas pendientes.

Si Maven no está en PATH, definir `E2E_MAVEN_COMMAND` con el ejecutable o comando Maven (entre comillas si la ruta contiene espacios). Para abrir la interfaz interactiva: `npm run test:e2e:ui`. Para consultar el informe: `npx playwright show-report`.

Informes: `frontend/playwright-report/index.html`, `frontend/test-results/e2e.xml` y trazas en `frontend/test-results/` cuando hay fallos. La cobertura de Jest y JaCoCo es independiente de Playwright; sus pruebas no aumentan artificialmente esos porcentajes.

## PostgreSQL: pruebas existentes de los compañeros

Usar exclusivamente una **base de pruebas dedicada**. Estas pruebas aplican la migración Flyway cuando falta y crean registros de prueba. No apuntarlas a una base compartida ni a producción. No requieren cambiar Docker Compose de despliegue.

Ejemplo con un contenedor temporal independiente, desde la raíz (Docker debe estar arrancado):

```sh
docker run --name protube-test-db -d -p 127.0.0.1:15432:5432 -e POSTGRES_USER=protube_test -e POSTGRES_PASSWORD=test-only-password -e POSTGRES_DB=protube_test postgres:16
docker exec protube-test-db pg_isready -U protube_test -d protube_test
```

Esperar a que `pg_isready` indique que acepta conexiones. En PowerShell, desde `backend/`:

```powershell
$env:ENV_PROTUBE_DB_HOST = '127.0.0.1'
$env:ENV_PROTUBE_DB_PORT = '15432'
$env:ENV_PROTUBE_DB = 'protube_test'
$env:ENV_PROTUBE_DB_USER = 'protube_test'
$env:ENV_PROTUBE_DB_PASS = 'test-only-password'
$env:RUN_CATALOG_POSTGRES_TESTS = 'true'
$env:RUN_POSTGRES_TESTS = 'true'
mvn clean verify
```

En bash, exportar las mismas variables con `export NOMBRE=valor`. La contraseña del ejemplo es exclusiva del contenedor desechable de pruebas.

`RUN_CATALOG_POSTGRES_TESTS` habilita las pruebas existentes de catálogo, importación y recuperación tras reiniciar la aplicación. `RUN_POSTGRES_TESTS` habilita la prueba del repositorio de usuarios. Ambas usan el puerto configurado y migran el esquema de la base dedicada. La prueba de reinicio reinicia Spring y su pool, no el servidor PostgreSQL ni Docker Compose.

`RUN_LOCAL_VIDEO_READER_TEST=true` habilita otra comprobación opcional que lee `ENV_PROTUBE_STORE_DIR` sin importar: requiere el almacén real preparado con más de 12 vídeos. Se omite en la suite reproducible y en CI. Consultar también [importación](VIDEO_IMPORT.md) y [persistencia](CATALOG_PERSISTENCE.md).

Al terminar, cerrar la terminal para descartar variables o eliminarlas; detener y eliminar **solo el contenedor de pruebas creado**:

```sh
docker stop protube-test-db
docker rm -v protube-test-db
```

Este contenedor no usa los volúmenes de Compose. No eliminar volúmenes del despliegue para ejecutar pruebas.

## CI y criterio de finalización

El workflow `.github/workflows/main.yml` instala dependencias, compila, ejecuta pruebas de frontend/backend con umbrales de cobertura, ejecuta Playwright y lint, y publica los informes como artefactos. Un segundo job crea PostgreSQL 16 dedicado y habilita las pruebas opcionales de PostgreSQL. Los informes se intentan publicar también si falla una prueba.

Antes de dar la tarea por terminada:

1. `npm run build` y `npm run test:ci` pasan en frontend.
2. `mvn clean verify` pasa en backend.
3. Cada aplicación supera el 50 % de cobertura por separado.
4. `npm run test:e2e` pasa: API real con fixtures aisladas y navegador con contrato simulado. La integración de la pantalla con `VideoPage` permanece pendiente.
5. El equipo puede repetir estos comandos y consultar los informes.

No se deben versionar `node_modules`, `target`, cobertura ni resultados generados.

## Verificación de esta rama

El 20/10/2026 se ejecutó la suite existente sin modificar funcionalidades: frontend y backend superan los umbrales actuales del 75 %. Las pruebas PostgreSQL se ejecutaron contra un contenedor temporal independiente, no contra el despliegue del equipo. Los porcentajes y resultados vigentes deben consultarse en los informes generados en cada ejecución; no confundir pruebas omitidas con verificaciones realizadas.

Resultados locales de esta revisión:

| Comprobación | Resultado |
| --- | --- |
| Jest | 16 pruebas correctas; 94,23 % de líneas, 94,44 % de funciones y 100 % de ramas |
| Maven por defecto | 45 correctas, 10 opcionales omitidas; 98,42 % de líneas |
| Maven con PostgreSQL 16 dedicado | 54 correctas, 1 omitida (almacén local); 99,21 % de líneas |
| Playwright | 5 correctas: 3 HTTP reales y 2 de navegador con API simulada |
| Compilación y lint | TypeScript, Vite y ESLint correctos |

El workflow actualizado queda preparado; estas comprobaciones son locales, no una ejecución de GitHub Actions. Se comprobó además que las fixtures E2E no aparecen en el JAR de producción. No se han cambiado clases de producción ni el contrato API/frontend.
