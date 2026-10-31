# Catálogo compartido de ProTube

## Objetivo
Utilizar el mismo catálogo en los cuatro equipos y cargar sus datos en PostgreSQL
de forma reproducible, conservando los datos existentes.

Esta guía utiliza el Docker Compose de la tarea 11.
Más información: [importación](VIDEO_IMPORT.md) y [persistencia](CATALOG_PERSISTENCE.md).

## Catálogo
- 30 vídeos MP4, 30 miniaturas WEBP y 30 archivos JSON.
- `manifest.csv` con identificadores, nombres, tamaños y hashes SHA-256.
- Procedencia: descarga con `videoGrabber`, utilizando `--id=10`.
- Selección: primeros 30 conjuntos completos, ordenados por ID numérico.
- Identificadores: del 0 al 31, excepto 7 y 13, conservando los nombres originales.
- Carga inicial esperada: **30 vídeos y 240 comentarios**.
- Vídeo de origen `0`: caso sin comentarios.
- Pendiente: confirmar que la semilla 10 corresponde al identificador del grupo.

## 1. Requisitos
- Repositorio actualizado con Compose, migraciones e importador.
- Docker Desktop iniciado con motor Linux.
- PowerShell y acceso a la carpeta compartida.
- Puerto 8081 disponible.

Ejecutar los comandos de Docker desde la raíz del repositorio.

## 2. Descargar el catálogo
Descargar el ZIP desde la [carpeta de Drive](https://drive.google.com/drive/folders/1fr-7EQFvnM3l0cRuYOVzKVFJqJsslp_U).

Extraerlo en `C:\Protube\catalogo-compartido-30`.
La carpeta debe contener directamente `manifest.csv` y los 90 archivos.
Utilizar una carpeta dedicada, sin mezclar otras descargas.
Todos deben utilizar este ZIP para obtener exactamente los mismos archivos.

## 3. Verificar los archivos
Ejecutar en PowerShell, adaptando la ruta si es necesario:

```powershell
$carpeta = 'C:\Protube\catalogo-compartido-30'
$manifest = @(Import-Csv "$carpeta\manifest.csv" -ErrorAction Stop)
if ($manifest.Count -ne 90) { throw 'Se esperaban 90 entradas.' }

$errores = @(
    foreach ($fila in $manifest) {
        $ruta = Join-Path $carpeta $fila.archivo
        if (-not (Test-Path -LiteralPath $ruta -PathType Leaf)) {
            "FALTA: $($fila.archivo)"
        } elseif ((Get-Item -LiteralPath $ruta).Length -ne [long]$fila.bytes) {
            "TAMAÑO: $($fila.archivo)"
        } elseif ((Get-FileHash -LiteralPath $ruta -Algorithm SHA256 -ErrorAction Stop).Hash -ne $fila.sha256) {
            "HASH: $($fila.archivo)"
        }
    }
)
"Entradas: $($manifest.Count). Incidencias: $($errores.Count)"
$errores
if ($errores.Count -gt 0) { throw 'Revisar el catálogo antes de importar.' }
```

Resultado esperado: **90 entradas y 0 incidencias**.
Conservar el CSV original aunque se abra con Excel.

## 4. Configurar `.env`
Crear o adaptar `.env` en la raíz del repositorio:

```dotenv
ENV_PROTUBE_DB=protube_db
ENV_PROTUBE_DB_USER=protube_user
PROTUBE_HTTP_PORT=8081
PROTUBE_VIDEO_DIR=C:/Protube/catalogo-compartido-30
PROTUBE_PUBLIC_URL=http://localhost:8081
PROTUBE_NO_COMMENTS_ID=0
```

Adaptar la ruta al ordenador de cada integrante.
`init-secrets` genera y conserva automáticamente la contraseña.
Comprobar con `git check-ignore .env` que el archivo está ignorado.
No versionar credenciales reales.

## 5. Arrancar
Comprobar que `docker info` muestra la sección `Server`.
Si el entorno anterior ocupa el puerto 8081, detenerlo con `docker compose stop`.

```powershell
docker compose -p protube30 up -d --build
docker compose -p protube30 ps -a
```

`db` y `app` deben terminar saludables; `init-secrets` termina con código 0.
El proyecto `protube30` utiliza volúmenes separados del proyecto anterior.
Si esos volúmenes ya existen, se reutilizan sus datos.
Flyway prepara el esquema y el importador carga el catálogo.
Los archivos permanecen en disco; PostgreSQL guarda datos y rutas relativas.

## 6. Comprobar la carga
Consultar los logs:

```powershell
docker compose -p protube30 logs app --no-color |
    Select-String -Pattern 'Video import committed|ERROR'
```

En una base nueva: **30 vídeos y 240 comentarios añadidos**.
Consultar las cantidades directamente:

```powershell
docker compose -p protube30 exec db psql -U protube_user -d protube_db -c "SELECT (SELECT count(*) FROM public.videos) AS videos, (SELECT count(*) FROM public.comments) AS comments;"
```

Abrir http://localhost:8081 y comprobar:
- Listado y paginación de los 30 vídeos.
- Miniaturas y reproducción.
- Meat Loaf: 6 comentarios iniciales.
- Uptown Funk (`0.mp4`): sin comentarios.

El ID de PostgreSQL puede ser distinto del identificador del archivo.

## 7. Repetición y persistencia
Reiniciar la aplicación:

```powershell
docker compose -p protube30 restart app
```

Tras el arranque, revisar los logs: se esperan **0 vídeos añadidos,
0 comentarios añadidos y 30 vídeos sin cambios**.

Reiniciar PostgreSQL:

```powershell
docker compose -p protube30 restart db
```

Esperar unos segundos y repetir la consulta del apartado 6.
Deben mantenerse **30 vídeos y 240 comentarios**, salvo cambios manuales.
Cambiar la carpeta no elimina registros previamente importados.

## 8. Gestión y validación
Detener: `docker compose -p protube30 stop`.
Iniciar contenedores existentes: `docker compose -p protube30 start`.
Tras modificar `.env`, aplicar con `docker compose -p protube30 up -d --build`.
No usar `down -v`: elimina los volúmenes del proyecto.

Registrar nombres y fechas junto con los resultados de cada equipo:

| Comprobación | Equipo 1 | Equipo 2 | Equipo 3 | Equipo 4 |
|---|---|---|---|---|
| Descarga y 90 hashes correctos | Pendiente | Pendiente | Pendiente | Pendiente |
| Carga: 30 vídeos y 240 comentarios | Correcto | Pendiente | Pendiente | Pendiente |
| Repetición sin nuevas inserciones | Correcto | Pendiente | Pendiente | Pendiente |
| Cantidades conservadas tras reiniciar DB | Correcto | Pendiente | Pendiente | Pendiente |
| Listado reducido | Correcto | Pendiente | Pendiente | Pendiente |
| Miniaturas, reproducción y comentarios | Pendiente | Pendiente | Pendiente | Pendiente |

Resultados del equipo 1 comunicados el 28/10/2026.
Versionar esta guía y `docs/catalog/manifest.csv`.
Mantener el ZIP en Drive y las credenciales fuera de Git.