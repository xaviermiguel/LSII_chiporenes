# Tarea 9: detalle público de vídeos y archivos

`GET /api/videos/{id}` devuelve el DTO documentado en
[sprint1-api.md](sprint1-api.md), con datos y comentarios persistidos. No requiere
sesión. El listado actual `GET /api/videos` sigue devolviendo títulos.

El servicio reutiliza `VideoRepository`, la consulta ordenada de
`CommentRepository` y `/media/**` de `MvcConfig`. Las URLs se generan con las rutas
guardadas, no con la identidad de PostgreSQL. La lectura y el mapeo se realizan
dentro de una transacción de solo lectura para resolver los autores registrados
sin depender de Open EntityManager in View. Solo se exponen nombres públicos.

El detalle devuelve un `404` JSON `VIDEO_NOT_FOUND` si falta el registro o su
archivo de vídeo. El recurso de medios devuelve su propio `404` si falta el archivo
y `416` si un rango no es satisfacible. Se conserva el manejador de recursos de
Spring para entregar `video/mp4`, contenido completo y rangos `206` sin cargar el
vídeo entero en un DTO. La importación y los datos existentes no cambian.

## Comprobación manual sin modificar datos

Mantener el backend con perfil Spring `prod`, las variables `ENV_PROTUBE_DB_*`
habituales y `ENV_PROTUBE_STORE_DIR` apuntando al almacén existente. Mantener
`ENV_PROTUBE_IMPORT_ENABLED=false`. No se necesita volver a importar ni arrancar
infraestructura adicional para esta tarea.

En IntelliJ, consultar los IDs y rutas existentes:

```sql
SELECT v.id, v.title, v.video_path, count(c.id) AS comments
FROM public.videos v LEFT JOIN public.comments c ON c.video_id = v.id
GROUP BY v.id ORDER BY v.id;
```

Elegir un ID real, con comentarios o sin ellos, y usarlo en PowerShell:

```powershell
$videoId = Read-Host 'ID persistido del vídeo'
$detail = Invoke-RestMethod "http://localhost:8080/api/videos/$videoId"
$detail | ConvertTo-Json -Depth 5
$mediaUrl = "http://localhost:8080$($detail.videoUrl)"
curl.exe -I "$mediaUrl"
curl.exe -s -D - -o NUL -H 'Range: bytes=0-15' "$mediaUrl"
```

Comprobar título, descripción y comentarios del vídeo elegido. El caso sin
comentarios debe contener `comments: []`. La petición de rango debe devolver `206`,
`Content-Type: video/mp4` y `Content-Range: bytes 0-15/<tamaño>` para un archivo de
al menos 16 bytes. Abrir `$mediaUrl` en el navegador para verificar reproducción y
desplazamiento temporal con un vídeo real, sin iniciar sesión.

Para el caso inexistente, usar un ID que no aparezca en la consulta anterior:

```powershell
curl.exe -i 'http://localhost:8080/api/videos/9223372036854775807'
curl.exe -i 'http://localhost:8080/media/archivo-que-no-existe.mp4'
```

Ambos deben devolver `404`; solo el detalle exige el JSON `code`/`message`.
No borrar ni renombrar archivos reales para probar su ausencia: ese caso se cubre
con un registro y un almacén temporales en las pruebas automatizadas.

## Pruebas automatizadas

Desde `backend/`, con Java 21 y Maven:

```powershell
$env:ENV_PROTUBE_IMPORT_ENABLED = 'false'
$env:RUN_POSTGRES_TESTS = 'false'
$env:RUN_CATALOG_POSTGRES_TESTS = 'false'
$env:RUN_LOCAL_VIDEO_READER_TEST = 'false'
mvn clean verify -Pcoverage
```

Las pruebas de esta tarea usan H2 aislado, transacciones revertidas y archivos
temporales; no acceden al almacén original ni escriben en PostgreSQL. Verifican
el contrato HTTP anónimo, datos y comentarios correctos con orden estable,
respuestas vacías, IDs distintos de los nombres de archivo, autores públicos,
URLs codificadas, errores de vídeo/archivo y contenido/rangos de medios.

Las pruebas opcionales de PostgreSQL permanecen sujetas a una base exclusiva de
pruebas y a las instrucciones de [persistencia](CATALOG_PERSISTENCE.md). No se debe
activar ese conjunto contra la base local con los vídeos del usuario. Una prueba
omitida no acredita PostgreSQL. Los bytes sintéticos no verifican códecs ni la
reproducción real en un navegador.

## Resultado de la verificación (2026-10-19)

Con Java 21.0.12.1 y Maven 3.9.6, `mvn clean verify -Pcoverage` terminó con
`BUILD SUCCESS`: 51 pruebas contabilizadas, 41 superadas, 0 fallos y 0 errores.
Quedaron omitidas 9 pruebas opcionales de PostgreSQL y 1 de lectura del almacén
real, al mantener desactivados sus interruptores. No se ha utilizado ni preparado
una base PostgreSQL exclusiva de pruebas ni se han abierto los vídeos originales.

Pasaron las 7 pruebas de detalle, las 5 de medios y las 5 del servicio, además de
las restantes pruebas aisladas del backend. JaCoCo validó todos los umbrales:
236 de 240 líneas cubiertas (98,33 %), sin bajar requisitos. Maven avisa de que el
perfil `coverage` no existe; la cobertura se ejecuta igualmente porque el plugin
JaCoCo ya está configurado en el ciclo de vida habitual del proyecto.

Quedan pendientes la comprobación contra una base PostgreSQL exclusiva de pruebas
y la reproducción/desplazamiento en navegador con los archivos reales. Las
pruebas HTTP con bytes sintéticos verifican rutas, contenido, MIME y Range;
no acreditan la decodificación de un vídeo real.
