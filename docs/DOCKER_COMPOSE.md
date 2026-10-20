# Tarea 11: preparación genérica de Docker Compose

## Estado y alcance

La implementación está pendiente de integrar el backend y el frontend del equipo.
Se conserva únicamente la infraestructura: PostgreSQL 16 con volumen persistente,
credenciales iniciales automáticas, construcción de producción con frontend
incluido en el JAR y montaje de los vídeos en solo lectura.

No se implementan entidades, repositorios, servicios, migraciones, importadores ni
funcionalidades del frontend. Las implementaciones provisionales del catálogo y
la importación se han retirado del código actual para evitar solapamientos. El
historial de Git conserva esos cambios; no se han reescrito commits anteriores.

El arranque completo, la carga de datos y las funciones integradas **no están
validados ni se consideran terminados**. Se retomarán después de incorporar los
cambios de los compañeros mediante pull.

## Entrega y construcción prevista

Requisitos: Docker con contenedores Linux, Docker Compose y la carpeta `videos/`
de la tarea 4 entregada junto al proyecto. Los vídeos no se versionan en Git.
El primer build requiere Internet y varios GiB libres en la unidad de Docker.

El Dockerfile compila el frontend existente con Node y el backend con Java 21 y
Maven, utilizando el perfil de producción que ya ofrece el proyecto. El resultado
es un único JAR con los recursos del frontend. No modifica código de ninguna app.
Los dominios Vite se dejan vacíos para utilizar el mismo origen que el backend.

Después de integrar y revisar las dependencias del equipo, el comando previsto es:

```sh
docker compose up --build -d --wait --wait-timeout 300
```

En Windows, para usar la carpeta externa ya entregada:

```powershell
$env:PROTUBE_VIDEO_DIR = 'C:/ProTube/videos'
docker compose up --build -d --wait --wait-timeout 300
```

La aplicación se publicaría en http://localhost:8080. El montaje de `/store` es de
solo lectura y rechaza una carpeta inexistente. No copia ni modifica originales.

## Infraestructura conservada

- `init-secrets` genera una contraseña aleatoria si no existe en `db_credentials`.
  Puede recibir `ENV_PROTUBE_DB_PASS` en la primera inicialización. Una contraseña
  distinta a la ya guardada produce error sin modificar el archivo existente.
- PostgreSQL inicializa la base y el usuario en `postgres_data`. Su puerto solo
  está disponible en la red interna; no ocupa el 5432 del host.
- La aplicación espera el healthcheck de PostgreSQL, utiliza el perfil `prod` y
  recibe las variables de conexión y la ruta `/store`. El entrypoint lee la
  contraseña desde el volumen y ejecuta el JAR con UID 10001.
- El healthcheck de la aplicación solo comprueba la respuesta de `/api/videos`,
  una ruta ya existente. No presupone datos importados, tablas ni contratos nuevos.

No se crean tablas del catálogo ni se activa una importación. La preparación del
esquema y de los datos corresponde a los componentes que aportará el equipo.
Tampoco se añaden credenciales Google ni se cambia la autenticación del proyecto.

## Configuración

| Variable | Valor por defecto | Uso |
|---|---|---|
| `PROTUBE_VIDEO_DIR` | `./videos` | Carpeta de archivos entregada |
| `PROTUBE_HTTP_PORT` | `8080` | Puerto HTTP del host |
| `PROTUBE_BIND_ADDRESS` | `127.0.0.1` | Interfaz HTTP del host |
| `ENV_PROTUBE_DB` | `protube_db` | Base inicial |
| `ENV_PROTUBE_DB_USER` | `protube_user` | Rol inicial |
| `ENV_PROTUBE_DB_PASS` | Generada | Contraseña inicial opcional |

No se necesitan contraseñas versionadas ni un `.env` obligatorio. Estas opciones
no cambian bases, roles o contraseñas de un volumen PostgreSQL ya inicializado.
Conservar su versión y credenciales originales si se adopta un volumen anterior.
No borrar datos para resolver diferencias de configuración.

## Comprobaciones de infraestructura

Validar la configuración, sin construir ni iniciar las aplicaciones:

```sh
docker compose config --quiet
```

Opcionalmente, iniciar solo PostgreSQL y su preparación de credenciales:

```sh
docker compose up -d --wait --wait-timeout 120 db
docker compose ps -a
```

Para detener conservando los datos:

```sh
docker compose down
```

No utilizar `down -v` para reiniciar. Mantener el mismo nombre de proyecto Compose:
los volúmenes de PostgreSQL y credenciales permanecen, y los vídeos siguen en su
carpeta del host. No se eliminan imágenes, cachés ni volúmenes existentes.

## Validación pendiente tras el pull

1. Revisar los nombres reales de propiedades, perfil, endpoint de salud y esquema.
2. Construir las aplicaciones aportadas por el equipo sin modificar sus clases.
3. Comprobar migraciones e importación mediante sus mecanismos acordados.
4. Verificar frontend, API, vídeos y consultas con PostgreSQL real.
5. Recrear los contenedores sin borrar volúmenes y comprobar registros y archivos.

Las pruebas anteriores sobre el catálogo provisional no acreditan esta versión,
porque esa implementación se ha retirado. Se ha eliminado también el verificador
que dependía de sus tablas y de su importador.

Validación del alcance reducido (2026-10-20): `docker compose config --quiet` y
`sh -n` de ambos scripts de `deploy/` correctos. El constructor de la prueba
anterior está detenido. No se han construido ni arrancado las aplicaciones para
esta comprobación. Los vídeos y los datos existentes no se han eliminado.
