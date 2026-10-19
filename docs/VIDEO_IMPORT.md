# Tarea 4: preparación de vídeos de prueba

## Estado y dependencia

El checkout incluye `User` y `UserRepository`, pero no entidades ni repositorios
Java de vídeos o comentarios. `VideoService` sigue devolviendo dos cadenas fijas.
Los esquemas documentados sí existen en `docs/db_schema/videos.sql` y
`comments.sql`. No son migraciones ordenadas ni prueban que las tablas estén
instaladas en la base en ejecución.

El preparador permite avanzar sin esa dependencia. **No importa en PostgreSQL**,
no modifica tablas ni archivos originales, no ejecuta videoGrabber y no descarga.
La tarea 4 sigue pendiente de la integración del catálogo, la comprobación de
medios por HTTP y la persistencia real tras reiniciar.

## Preparar desde PowerShell

Desde la raíz del repositorio, con Python 3:

```powershell
$env:ENV_PROTUBE_STORE_DIR = 'C:\ProTube\videos'
python -B tooling/videoGrabber/prepare_test_data.py --without-comments 0 --output "$env:TEMP\protube-test-data.json"
python -B -m unittest discover -s tooling/videoGrabber -p test_prepare_test_data.py -v
```

También se admite `--store` explícito. El directorio de salida debe existir y estar
fuera del almacén. El archivo de salida debe ser nuevo: el comando rechaza
sobrescribirlo. Para repetir la preparación usa otro nombre de salida; los mismos
archivos y opciones generan el mismo contenido. No versiones los manifiestos,
que contienen los comentarios descargados.

`--page-size` vale 12 por defecto, según la propuesta `sprint1-api.md`. Se exige
una cantidad mayor para poder comprobar la carga adicional. No se implementa la
paginación de la API aquí. Los archivos se relacionan mediante el ID y deben ser
no vacíos; esta comprobación no decodifica vídeos ni miniaturas.

Si ya existe un vídeo sin comentarios, omite `--without-comments`. Si todos
tienen comentarios, el preparador exige seleccionar uno explícitamente. La opción
vacía solo la lista del manifiesto y lo marca con `test_without_comments`; el JSON
original conserva todos sus comentarios. También se exige otro vídeo con comentarios.

El manifiesto conserva texto, autor externo, fecha y contador de likes de los
comentarios. Solo proyecta metadatos de vídeo pertinentes al esquema documentado.
Rechaza datos incompatibles en lugar de truncarlos o inventar autores/descripciones.
No se crean usuarios registrados para autores externos.

El identificador de grupo no se deduce del nombre de los archivos. En videoGrabber,
`--id` se usa como semilla aleatoria; los IDs de archivos se generan desde cero.
Debe confirmarse con quien realizó la descarga qué identificador de grupo utilizó.
No es necesario repetirla para preparar el manifiesto.

## Contrato para la integración pendiente

- `source_id` identifica el archivo de origen; no es la identidad SQL generada.
- `video_path` y `thumbnail_path` son relativos al almacén. `video_path` ya tiene
  una restricción única: usarla para localizar el vídeo existente. No cambiar la
  ruta ni reutilizar el mismo ID para otra descarga dentro de ese almacén.
- Los comentarios están anidados bajo su vídeo. El importador deberá guardar el
  `video_id` real generado por PostgreSQL.
- `source_metadata.video_grabber_key` es SHA-256 de texto, autor y fecha UTC del
  comentario. No incluye likes ni posición, por lo que estos no alteran la identidad.
  La identidad se compara dentro del vídeo; comentarios idénticos en otro vídeo
  siguen siendo registros distintos. Los duplicados exactos del origen se colapsan.
- Para repetir sin duplicados ni carreras, el futuro importador debe serializar
  las cargas (por ejemplo, bloqueo transaccional PostgreSQL), comprobar claves
  existentes e insertar solo lo que falta en una transacción. No borrar ni actualizar
  contenido existente. Si hay importaciones anteriores sin claves de origen,
  reconciliarlas por texto, autor y fecha antes de insertar.
- Un vídeo marcado sin comentarios no autoriza borrar comentarios ya existentes.
  Si el vídeo ya los tiene, deberá elegirse otro caso de prueba antes de importar.

Estas son condiciones de integración; la idempotencia en base de datos aún no está
implementada ni verificada. El preparador sí es determinista.

## Almacenamiento y contenedores

El backend ya lee `pro_tube.store.dir` de `ENV_PROTUBE_STORE_DIR` y registra
`/media/**`. No hay rutas Windows nuevas en Java. Queda comprobar/corregir la URI
de recursos en `MvcConfig`: actualmente concatena `file:` con la propiedad y no
garantiza la barra final del directorio.

En un futuro servicio de backend de Compose, montar el almacén como bind mount
de solo lectura, por ejemplo `C:/ProTube/videos:/store:ro`, y establecer
`ENV_PROTUBE_STORE_DIR=/store`. El mismo directorio debe usarse al preparar datos.
Los archivos permanecen en el host al recrear el contenedor. `compose.yaml` ya
define `postgres_data` para la base; no usar `docker compose down -v`.
No se ha implementado el servicio backend ni comprobado reinicios.

## Verificación de PostgreSQL pendiente

Configurar en la sesión, con valores locales, `ENV_PROTUBE_DB_HOST`,
`ENV_PROTUBE_DB`, `ENV_PROTUBE_DB_USER` y `ENV_PROTUBE_DB_PASS`. No guardar sus
valores en Git. El perfil `prod` del backend usa esas variables; `dev` usa H2.
La importación no tiene todavía comando ejecutable: depende de los componentes
Java de vídeos y comentarios.

En una conexión PostgreSQL configurada por el usuario, estas consultas son de
solo lectura y permiten comprobar el esquema y, después de implementar la carga,
sus resultados:

```sql
SELECT to_regclass('public.videos'), to_regclass('public.comments');
SELECT count(*) AS videos FROM public.videos;
SELECT v.id, v.video_path, v.thumbnail_path, count(c.id) AS comments
FROM public.videos v LEFT JOIN public.comments c ON c.video_id = v.id
GROUP BY v.id ORDER BY v.id;
SELECT video_path, count(*) FROM public.videos
GROUP BY video_path HAVING count(*) > 1;
SELECT video_id, source_metadata->>'video_grabber_key' AS source_key, count(*)
FROM public.comments
WHERE source_metadata ? 'video_grabber_key'
GROUP BY video_id, source_metadata->>'video_grabber_key' HAVING count(*) > 1;
```

Tras la integración, ejecutar la carga dos veces y comparar IDs y cantidades;
comprobar un vídeo con comentarios y otro sin ellos. Repetir las consultas tras
reiniciar backend y PostgreSQL conservando el volumen. Verificar también HTTP
para cada `.mp4` y `.webp`. Ninguna de estas verificaciones en vivo está acreditada
por las pruebas del preparador.
