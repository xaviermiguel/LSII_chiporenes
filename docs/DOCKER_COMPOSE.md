# Tarea 11: arranque integrado con Docker Compose

## Primer arranque

Se necesita Docker con contenedores Linux y Docker Compose, acceso a Internet
para el primer build y varios GiB libres en la unidad donde Docker guarda sus
imágenes y volúmenes. Java, Maven, Node y PostgreSQL no son necesarios en el host.

La entrega incluye el repositorio y una carpeta `videos/` junto a `compose.yaml`.
Debe contener las triples JSON/MP4/WebP de la tarea 4: más de 12 vídeos, con
comentarios. Los archivos originales no se incluyen en la imagen ni se modifican.

Desde la raíz:

```sh
docker compose up --build -d --wait --wait-timeout 300
```

Abrir http://localhost:8080. El frontend de producción está incluido en el JAR y
se sirve desde Spring Boot, junto a la API. No hay un servidor Node en ejecución.

Para utilizar la carpeta externa de Windows ya entregada:

```powershell
$env:PROTUBE_VIDEO_DIR = 'C:/ProTube/videos'
docker compose up --build -d --wait --wait-timeout 300
```

No se necesita editar archivos, preparar SQL a mano ni crear un `.env` obligatorio.
Una carpeta de vídeos inexistente produce error; Compose no crea una carpeta vacía
que oculte el problema.

## Preparación automática

1. `init-secrets` genera una contraseña aleatoria de 256 bits en `db_credentials`
   si no existe. No imprime la contraseña. Si se proporciona `ENV_PROTUBE_DB_PASS`,
   solo la utiliza para la inicialización; si difiere de la guardada, falla sin
   cambiarla. Prepara permisos UID 10001 y modo 400.
2. PostgreSQL 16 inicializa la base y el usuario en `postgres_data`. Su puerto no
   se publica en el host y no entra en conflicto con PostgreSQL local en 5432.
3. El backend espera la disponibilidad de PostgreSQL. El entrypoint lee la
   contraseña del volumen, y Spring arranca con el perfil `prod`: Flyway aplica
   las migraciones existentes, Hibernate valida el esquema y el importador del
   equipo carga los datos de la carpeta montada.
4. El healthcheck espera una respuesta de catálogo con algún ID, visible tras
   confirmar la importación. `--wait` falla si el incremento no queda listo.

Se reutilizan las entidades, migraciones, repositorios, importador y frontend de
`origin/main` (`cebd8bc`). Esta tarea no modifica archivos en `backend/` ni
`frontend/`, ni implementa una segunda persistencia o importación.

El archivo 0 es el caso sin comentarios por defecto; se conserva su JSON original.
Si una base existente ya tiene comentarios para ese vídeo, elegir otro archivo
mediante `PROTUBE_NO_COMMENTS_ID`; el importador no borra comentarios existentes.

## Direcciones y opciones

| Variable | Valor por defecto | Uso |
|---|---|---|
| `PROTUBE_VIDEO_DIR` | `./videos` | Carpeta de archivos entregada |
| `PROTUBE_HTTP_PORT` | `8080` | Puerto HTTP del host |
| `PROTUBE_BIND_ADDRESS` | `127.0.0.1` | Interfaz HTTP del host |
| `PROTUBE_PUBLIC_URL` | `http://localhost:8080` | Origen público para medios, fijado al construir |
| `PROTUBE_NO_COMMENTS_ID` | `0` | ID del archivo elegido sin comentarios |
| `ENV_PROTUBE_DB` | `protube_db` | Base inicial |
| `ENV_PROTUBE_DB_USER` | `protube_user` | Rol inicial |
| `ENV_PROTUBE_DB_PASS` | Generada | Contraseña inicial opcional |

La API usa el mismo origen de la página. El reproductor recibido del equipo
necesita un origen absoluto para resolver las URLs de medios; el Dockerfile lo
proporciona mediante `VITE_MEDIA_DOMAIN`, sin modificar código del frontend.
Si cambia la dirección pública o el puerto, actualizar ambas opciones y reconstruir:

```powershell
$env:PROTUBE_HTTP_PORT = '18080'
$env:PROTUBE_PUBLIC_URL = 'http://127.0.0.1:18080'
docker compose up --build -d --wait --wait-timeout 300
```

Para servir a otro equipo, configurar el origen accesible y la interfaz del host
correspondiente. No usar nombres internos de contenedores como origen del navegador.
No se añaden credenciales Google ni se modifica la autenticación.

## Reinicio y conservación

```sh
docker compose restart
docker compose down
docker compose up -d --wait --wait-timeout 300
```

`down` sin `-v` conserva `postgres_data` y `db_credentials`. Los archivos sobreviven
porque permanecen en el host, montados en `/store` en solo lectura. Mantener el
mismo nombre de proyecto Compose y las mismas variables entre ejecuciones.
No utilizar `down -v` para reiniciar ni eliminar la carpeta de vídeos.

Flyway y el importador existentes son idempotentes: un nuevo arranque no debe
repetir vídeos o comentarios. Las opciones de inicialización no cambian roles,
contraseñas ni bases en un volumen ya inicializado. Para adoptar un volumen
anterior, conservar su versión PostgreSQL y sus valores originales. No borrar
sus datos para resolver diferencias. Si ya existen tablas sin historial Flyway,
seguir el procedimiento de adopción del esquema documentado por el backend;
no se habilita baseline automático.

## Verificación reproducible del incremento

El verificador opcional necesita Python 3.11 o posterior; el arranque normal no.
Usa un proyecto de pruebas nuevo, sin tocar el PostgreSQL local ni los volúmenes
del proyecto normal:

```powershell
python deploy/verify_compose.py --video-dir C:/ProTube/videos
```

Comprueba el frontend empaquetado y su bundle, todas las páginas del catálogo y
sus detalles, comentarios y caso vacío, miniatura, HTTP Range de vídeo, PostgreSQL
y Flyway. Después elimina y recrea los contenedores **sin eliminar volúmenes**,
compara todas las filas de vídeos/comentarios, la huella de las credenciales y los
hashes de todos los JSON/MP4/WebP. Deja el proyecto en localhost:18080 e indica su
nombre y cómo detenerlo conservando los datos. Si se elige otro puerto, el script
ajusta también el origen público compilado.

Comprueba un margen inicial de 3 GiB en la unidad del proyecto; revisar también
la unidad de Docker si es distinta. `--skip-build` permite repetir la comprobación
con una imagen ya construida para ese mismo proyecto, origen y código.

Para comprobar además la interfaz y reproducción real en Chromium, con las
herramientas de desarrollo del frontend ya instaladas:

```powershell
# Desde frontend/: npm ci; npx playwright install chromium
# Después, desde la raíz, con el proyecto de pruebas disponible en 18080:
node deploy/verify_browser.cjs
```

`PROTUBE_TEST_URL` permite indicar otro origen. La prueba abre el catálogo, carga
la página siguiente, reproduce el vídeo y comprueba detalle con y sin comentarios.
No utiliza los fixtures H2 de las pruebas e2e del frontend.

Diagnóstico:

```sh
docker compose ps -a
docker compose logs --tail 100 app db init-secrets
```

No compartir la configuración renderizada si se ha proporcionado una contraseña
por entorno. No se eliminan imágenes, cachés ni volúmenes para resolver fallos.

## Estado de la validación (2026-10-25)

Actualización con pull realizada antes de los cambios: `origin/main` en `cebd8bc`,
merge `5986c06`, sin conflictos pendientes. Backend y frontend coinciden con la
versión entrante. Resultados del proyecto aislado `protube-check-20261025`:

- Construcción Docker completa: TypeScript/Vite de producción y Maven con Java 21
  correctos, JAR ejecutable con frontend incluido. El empaquetado usa `-DskipTests`;
  no se presenta como ejecución de las suites unitarias de las aplicaciones.
- Primer arranque con volúmenes nuevos, contraseña generada y PostgreSQL 16.15:
  correcto, sin preparación SQL ni credenciales Google manuales.
- Flyway y validación del esquema correctos. Importación real: 21 vídeos y
  154 comentarios; caso sin comentarios disponible. Catálogo paginado, detalles,
  HTML/bundle, miniatura y HTTP Range comprobados contra la aplicación real.
- `python -B deploy/verify_compose.py --video-dir C:/ProTube/videos
  --project protube-check-20261025 --skip-build`: PASS. Recreación completa de
  contenedores con los mismos registros y huella de credenciales; sin duplicados.
  Los hashes de los 63 JSON/MP4/WebP originales permanecen iguales.
- `node deploy/verify_browser.cjs`: PASS en Chromium contra producción. Catálogo,
  carga de página siguiente, detalle, reproducción real, comentarios y caso vacío,
  sin errores JavaScript de página.
- Configuración Compose, sintaxis de los scripts y comprobación de espacios de Git:
  correctas. Los scripts shell conservan finales de línea LF.

La aplicación de prueba queda en http://127.0.0.1:18080. Para detenerla conservando
los datos, usar las mismas variables de la prueba y el nombre de proyecto:

```powershell
$env:PROTUBE_VIDEO_DIR = 'C:/ProTube/videos'
$env:PROTUBE_HTTP_PORT = '18080'
$env:PROTUBE_PUBLIC_URL = 'http://127.0.0.1:18080'
docker compose --project-name protube-check-20261025 down
```

Los criterios de arranque integrado, preparación automática, acceso a los vídeos
y conservación tras recrear contenedores están comprobados con el conjunto entregado.
No se ha utilizado ni modificado la instalación PostgreSQL local del usuario.
