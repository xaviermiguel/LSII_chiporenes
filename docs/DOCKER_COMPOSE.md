# Arranque con Docker Compose

## Instalación limpia

Inicia Docker con contenedores Linux. El primer build requiere Internet y varios
GiB libres en la unidad de Docker. Desde la raíz del repositorio, ejecuta:

```powershell
$env:PROTUBE_HTTP_PORT = '8081'
docker compose up --build -d --wait --wait-timeout 300
```

Abre [http://localhost:8081/](http://localhost:8081/). Spring Boot sirve el frontend
y la API desde la misma dirección. El catálogo empieza vacío. Puedes crear una
cuenta, iniciar sesión y publicar vídeos desde el navegador. Compose prepara
PostgreSQL y las credenciales, y conserva los vídeos publicados, las miniaturas
y los avatares en un volumen de Docker.

## Arranque con el catálogo de la entrega

La carpeta externa de la tarea 4 contiene más de 12 triples JSON/MP4/WebP,
incluidos vídeos con comentarios. Colócala en `videos/` junto a `compose.yaml`,
o define `PROTUBE_VIDEO_DIR` con la ruta de la carpeta entregada. Ejemplo en
PowerShell:

```powershell
$env:PROTUBE_HTTP_PORT = '8081'
$env:PROTUBE_VIDEO_DIR = 'C:/ProTube/videos'
docker compose -f compose.yaml -f compose.catalog.yaml up --build -d --wait --wait-timeout 300
```

Abre [http://localhost:8081/](http://localhost:8081/). Usa ambos archivos en
cada comando de ese despliegue. Si prefieres ejecutar solo `docker compose`,
guarda `COMPOSE_FILE=compose.yaml;compose.catalog.yaml` en el `.env` local de
Windows (en Linux y macOS, usa `:` como separador). El archivo adicional
reemplaza el volumen de medios por la carpeta externa y activa la importación.
La carpeta tiene que existir y permitir que el UID 10001 lea los archivos y
escriba en ella si se van a publicar vídeos o subir avatares. El importador
conserva los archivos originales y los comentarios persistidos. El valor de
`PROTUBE_NO_COMMENTS_ID` elige el vídeo cuya lista de comentarios de origen se
omite durante la importación (por defecto, el 0).

**Si ya usabas la carpeta externa**, conserva el nombre del proyecto, los
valores de PostgreSQL y la ruta original, y arranca con ambos archivos. Así la
base de datos existente sigue apuntando a sus medios, incluidas las publicaciones.

## Puerto y acceso desde otro equipo

| Variable | Valor predeterminado | Uso |
|---|---|---|
| `PROTUBE_HTTP_PORT` | `8080` | Puerto HTTP del host |
| `PROTUBE_BIND_ADDRESS` | `127.0.0.1` | Interfaz del host |
| `PROTUBE_SECURE_COOKIES` | `false` | Configurar en `true` cuando los usuarios accedan por HTTPS |
| `ENV_PROTUBE_DB` | `protube_db` | Base inicial |
| `ENV_PROTUBE_DB_USER` | `protube_user` | Rol inicial |
| `ENV_PROTUBE_DB_PASS` | Generada | Contraseña inicial opcional |

El puerto predeterminado de Compose es 8080. Los ejemplos de esta guía lo
cambian a 8081 mediante `PROTUBE_HTTP_PORT`. Puedes consultar el puerto publicado
con `docker compose port app 8080`. Para acceso desde otro equipo por una red de confianza, configura
`PROTUBE_BIND_ADDRESS` con la IP de la interfaz del host que deba atender la
conexión y abre un navegador en `http://IP_DEL_HOST:PUERTO`. El frontend resuelve
la API y los medios desde la dirección que abre el navegador. Con un proxy
HTTPS, termina TLS en el proxy y habilita `PROTUBE_SECURE_COOKIES`. El puerto de
PostgreSQL se mantiene dentro de Docker.

## Reinicios y diagnóstico

Compose espera que PostgreSQL acepte conexiones y que Spring declare la
aplicación lista después de aplicar las migraciones y completar la importación,
si está activada. Un catálogo vacío también es válido.

```sh
docker compose ps -a
docker compose logs --tail 100 app db init-secrets
docker compose down
docker compose up -d --wait --wait-timeout 300
```

`down` conserva `postgres_data`, `db_credentials` y `media_data`. Mantén el
mismo nombre de proyecto y la misma configuración al recrear contenedores.
La contraseña y el usuario iniciales pertenecen a la base ya creada. Para adoptar
tablas anteriores a Flyway, sigue el procedimiento del backend en [VIDEO_IMPORT.md](VIDEO_IMPORT.md).

El verificador opcional usa un proyecto aislado y requiere Python 3.11 o
posterior. Comprueba el catálogo completo, los medios y la persistencia después
de recrear los contenedores:

```powershell
python deploy/verify_compose.py --video-dir C:/ProTube/videos
```

Para probar el frontend y el reproductor empaquetados en Chromium, instala
Playwright en `frontend/` y ejecuta `node deploy/verify_browser.cjs` desde la raíz
contra el proyecto de pruebas. `PROTUBE_TEST_URL` permite indicar su URL.
