# Pruebas y cobertura

## Requisitos

- Node.js 22 y npm (usar `npm ci` para instalar las versiones del lockfile).
- JDK 21 y Maven 3.9 en PATH. Comprobar `java -version` y `mvn -version`.
- No se necesitan PostgreSQL, vídeos descargados ni credenciales Google para las pruebas actuales. El backend utiliza H2 en desarrollo.

## Frontend: Jest y Testing Library

Desde `frontend/`:

```sh
npm ci
npm test
npm run test:ci
```

`npm test` ejecuta las pruebas y calcula cobertura. `test:ci` ejecuta sin interacción y genera además `test-results/unit.json` con los resultados de cada prueba. Para una sola prueba: `npm test -- --runInBand src/components/__tests__/app.test.tsx`.

Informes:

- `frontend/coverage/index.html`: cobertura navegable.
- `frontend/coverage/coverage-summary.json`: porcentajes globales y por archivo.
- `frontend/coverage/lcov.info` y `cobertura-coverage.xml`: integración con otras herramientas.
- `frontend/test-results/unit.json`: resultados de pruebas en CI.

La cobertura incluye todos los `.ts` y `.tsx` de `src`, aunque ninguna prueba los importe. Se excluyen declaraciones de tipos, las propias pruebas, mocks y `main.tsx` (arranque de React). `Env.ts` permanece incluido aunque se simule su configuración en Jest. Jest utiliza Babel para TypeScript/JSX; la comprobación de tipos se hace con `npm run build`.

Se conserva el umbral existente del **75 %** en líneas, sentencias, funciones y ramas, más exigente que el requisito de superar el 50 %. Si cualquiera baja del umbral, el comando falla.

## Backend: JUnit, Mockito y JaCoCo

Desde `backend/`:

```sh
mvn clean verify
```

Para una sola clase: `mvn test -Dtest=VideoServiceTest`. La comprobación de cobertura global sigue activa, por lo que ejecutar solo una parte de las pruebas puede no superar el umbral.

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

Playwright arranca el backend mediante Maven y el frontend mediante Vite. Espera a que ambos estén disponibles y cierra los procesos que arranca al terminar. Requiere puertos 8080 y 5173 disponibles. Fuera de CI puede reutilizar servidores ya arrancados: deben utilizar la misma configuración y la API debe responder en `http://127.0.0.1:8080/api/videos`.

La configuración E2E define `VITE_API_DOMAIN` y `VITE_MEDIA_DOMAIN` apuntando a `http://127.0.0.1:8080`, un directorio de almacenamiento local y valores ficticios para las propiedades Google. No realiza autenticación ni accede a Google. El test consulta la API real y comprueba que la página muestra el mismo catálogo de vídeos, sin interceptar la petición. Actualmente el servicio devuelve `video1` y `video2`; este E2E valida ese recorrido inicial, no reproducción ni funcionalidades aún no implementadas.

Si Maven no está en PATH, se puede definir `E2E_BACKEND_COMMAND` con el comando Maven completo. Para abrir la interfaz interactiva: `npm run test:e2e:ui`. Para consultar el informe: `npx playwright show-report`.

Informes: `frontend/playwright-report/index.html`, `frontend/test-results/e2e.xml` y trazas en `frontend/test-results/` cuando hay fallos. La cobertura de Jest y JaCoCo es independiente del resultado E2E.

## CI y criterio de finalización

El workflow `.github/workflows/main.yml` instala dependencias, compila, ejecuta pruebas de frontend/backend con umbrales de cobertura, ejecuta E2E y lint, y publica los informes como artefactos. Los informes se intentan publicar también si falla una prueba.

Antes de dar la tarea por terminada:

1. `npm run build` y `npm run test:ci` pasan en frontend.
2. `mvn clean verify` pasa en backend.
3. Cada aplicación supera el 50 % de cobertura por separado.
4. `npm run test:e2e` pasa con la API real.
5. El equipo puede repetir estos comandos y consultar los informes.

No se deben versionar `node_modules`, `target`, cobertura ni resultados generados.
