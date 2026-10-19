# Tarea 11: arranque integrado con Docker Compose

## Entrega y primer arranque

Requisitos: Docker con motor de contenedores Linux y Docker Compose, el repositorio
y la carpeta de vídeos de la tarea 4 entregada junto al proyecto. No se necesitan
Java, Maven, Node, PostgreSQL ni credenciales de Google instalados en el host.
Reservar varios GiB libres para imágenes, cachés y volúmenes (al menos 3–5 GiB
como margen inicial). Comprobar también la unidad donde Docker Desktop guarda sus
datos si es distinta de la unidad del proyecto.

La entrega debe contener `compose.yaml`, `Dockerfile`, `deploy/`, `backend/`,
`frontend/` y `videos/`. En `videos/` deben estar las triples JSON/MP4/WebP de la
tarea 4, con más de 12 vídeos y comentarios. Los vídeos no se versionan en Git.

Desde la raíz de esa entrega:

```sh
docker compose up --build -d --wait --wait-timeout 300
```

Abrir http://localhost:8080. El primer build descarga imágenes y dependencias;
requiere acceso a Internet. La aplicación sirve el frontend compilado y su API
desde el mismo origen. No hay un servidor Node en ejecución ni direcciones de
contenedores compiladas en el JavaScript del navegador.

Si se utilizan los archivos ya descargados en Windows en lugar de `./videos`:

```powershell
$env:PROTUBE_VIDEO_DIR = 'C:/ProTube/videos'
docker compose up --build -d --wait --wait-timeout 300
```

El bind mount es de solo lectura y rechaza una carpeta inexistente. No se vuelve
a descargar ni copiar el contenido de los vídeos dentro de la imagen.

## Preparación automática y conservación

1. `init-secrets` genera una contraseña aleatoria de 256 bits en `db_credentials`,
   si todavía no existe. No imprime su valor. Si se proporciona
   `ENV_PROTUBE_DB_PASS`, la utiliza solo al crear ese archivo.
2. PostgreSQL 16 inicializa `protube_db` y `protube_user` en `postgres_data`.
   El puerto de PostgreSQL no se publica en el host, evitando conflictos con una
   instalación local en 5432. La aplicación se conecta por la red interna a `db`.
3. El backend espera el healthcheck de la base. Arranca con perfil `prod`, aplica
   Flyway, valida las entidades e importa el almacén mediante la tarea 4.
4. El healthcheck HTTP espera un catálogo no vacío, visible tras la transacción
   de importación. `--wait` devuelve error si el incremento no llega a estar listo.

La contraseña se lee desde el volumen por el entrypoint, sin guardarla en el JAR,
el Dockerfile, Git ni un `.env` obligatorio. La aplicación se ejecuta con UID 10001.
El script de inicialización necesita privilegios de root dentro de su contenedor
para preparar los permisos del archivo; no usa contenedores privilegiados ni el
socket de Docker.

Cada nuevo arranque repite de forma idempotente las migraciones y la importación.
Se conservan registros editados; no se borran tablas ni comentarios. El archivo 0
es el caso sin comentarios por defecto. Si ya tiene comentarios persistidos,
seleccionar otro ID válido mediante `PROTUBE_NO_COMMENTS_ID` (tarea 4).

```sh
docker compose restart
docker compose down
docker compose up -d --wait --wait-timeout 300
```

`down` sin `-v` conserva `postgres_data` y `db_credentials`. Los archivos sobreviven
porque siguen en la carpeta del host. No eliminar esos volúmenes ni la carpeta
original para reiniciar el incremento. Mantener el mismo nombre de proyecto
Compose y las mismas opciones entre ejecuciones; otro nombre usa otros volúmenes.

## Opciones, bases anteriores y alcance

Opciones de entorno (sin editar archivos):

| Variable | Valor por defecto | Uso |
|---|---|---|
| `PROTUBE_VIDEO_DIR` | `./videos` | Carpeta entregada de la tarea 4 |
| `PROTUBE_HTTP_PORT` | `8080` | Puerto HTTP en el host |
| `PROTUBE_BIND_ADDRESS` | `127.0.0.1` | Interfaz del host donde se publica HTTP |
| `PROTUBE_NO_COMMENTS_ID` | `0` | ID de archivo sin comentarios |
| `ENV_PROTUBE_DB` | `protube_db` | Base inicial |
| `ENV_PROTUBE_DB_USER` | `protube_user` | Rol inicial |
| `ENV_PROTUBE_DB_PASS` | Generada automáticamente | Contraseña inicial opcional |

El incremento se publica por defecto solo en localhost. La autenticación del
proyecto no está implementada en este checkout; este despliegue no añade ni desactiva
seguridad y no constituye una configuración para exponerlo públicamente.

Estas opciones de inicialización no cambian roles, bases ni contraseñas de un
volumen PostgreSQL ya creado. Para adoptar volúmenes del Compose antiguo, conservar
su versión PostgreSQL y proporcionar sus valores originales antes de crear el
volumen de credenciales. Si la contraseña suministrada no coincide con el archivo
ya creado, la inicialización falla sin modificarlo. No borrar datos para resolverlo.

Si la base contiene tablas pero no historial Flyway, revisar/adoptar el esquema
según [CATALOG_PERSISTENCE.md](CATALOG_PERSISTENCE.md); no se activa baseline
automático. Este caso de actualización es diferente de la entrega limpia: en una
base nueva las migraciones se aplican sin pasos manuales.

El frontend disponible actualmente lista títulos. La reproducción se comprueba
mediante `/media/0.mp4` y la miniatura mediante `/media/0.webp`. No se implementan
pantallas de reproducción, paginación ni otras funcionalidades de otros compañeros.

## Verificación integrada

El script opcional requiere Python 3.11 o posterior, crea un proyecto Compose
aislado y no utiliza el PostgreSQL local ni sus credenciales:

```powershell
python tooling/verify_compose.py --video-dir C:/ProTube/videos
```

Comprueba HTML y bundle del frontend, catálogo real, miniatura, HTTP Range de vídeo,
migración Flyway, comentarios y caso vacío. Después recrea los contenedores,
compara todas las filas de vídeos/comentarios y los hashes de todos los archivos
originales. No elimina volúmenes ni registros existentes. Deja su proyecto
disponible en localhost:18080 e indica el comando para detenerlo conservando datos.
Antes de empezar comprueba un margen de 3 GiB en la unidad del proyecto para evitar
agotar el disco durante la descarga inicial. `--min-free-gib` permite ajustar ese
umbral si Docker guarda sus datos en otra unidad; no sustituye revisar el espacio
disponible donde reside el almacenamiento de Docker.

Diagnóstico manual:

```sh
docker compose ps -a
docker compose logs --tail 100 app db init-secrets
```

No compartir la salida de configuraciones renderizadas si se ha proporcionado una
contraseña por entorno. En Git solo deben quedar plantillas y código.

## Validación realizada y límite del entorno (2026-10-19)

- `docker compose config --quiet`: correcto.
- Sintaxis de los scripts shell y del verificador Python: correcta.
- Frontend del código limpio: TypeScript y build Vite de producción correctos.
- Empaquetado Maven `-Pprod` con frontend ya compilado: BUILD SUCCESS; JAR
  ejecutable con `static/index.html` y bundles de React. Se omitieron las pruebas
  en ese empaquetado; no se presenta como una ejecución de la suite.
- Arranque temporal de ese JAR con H2 e importación desactivada: página React,
  API y HTTP Range de un vídeo original correctos. No acredita PostgreSQL.
- Credenciales, en contenedor temporal: generación aleatoria, repetición estable,
  rechazo de contraseña distinta sin modificar el archivo y permisos UID 10001/400
  correctos.

La prueba integral desde una copia limpia se detuvo durante la descarga de imágenes
porque C: quedó con unos 100 MiB libres y el motor dejó de responder normalmente.
Se detuvieron los procesos de prueba y se retiraron solo los JAR temporales para
recuperar unos 55 MiB; no se borraron imágenes, volúmenes ni datos existentes.
No se acreditan aún el primer arranque completo, la carga real en PostgreSQL ni la
recreación con persistencia. Liberar espacio y repetir el verificador antes de
dar por completados esos criterios de aceptación.
