# Tarea 4: importación de vídeos y datos de prueba

## Alcance y requisitos

El importador utiliza `Video`, `Comment`, `VideoRepository` y `CommentRepository`
de la tarea 3 y las tablas existentes en `public`. No cambia el esquema ni la API.
No implementa Docker Compose, Dockerfiles ni el arranque de la tarea 11.
No ejecuta videoGrabber ni escribe en el almacén original.

Requiere Java 21, Maven y PostgreSQL local disponible, con el esquema de la tarea 3
instalado o adoptado mediante Flyway. No ejecutar `create-drop`, borrar tablas ni
reinicializar una base existente. Las instrucciones de adopción del esquema están
en [Persistencia del catálogo](CATALOG_PERSISTENCE.md).

## Ejecutar desde Windows (PowerShell)

Desde la raíz del repositorio, configurar las variables solo en la sesión:

```powershell
$env:ENV_PROTUBE_STORE_DIR = 'C:\ProTube\videos'
$env:ENV_PROTUBE_DB_HOST = 'localhost'
$env:ENV_PROTUBE_DB_PORT = '5432' # opcional, por defecto 5432
$env:ENV_PROTUBE_DB = Read-Host 'Nombre de la base PostgreSQL existente'
$env:ENV_PROTUBE_DB_USER = Read-Host 'Usuario PostgreSQL'
$env:ENV_PROTUBE_DB_PASS = [System.Net.NetworkCredential]::new('', (Read-Host -AsSecureString 'Contraseña PostgreSQL')).Password
$env:ENV_PROTUBE_IMPORT_ENABLED = 'true'
Set-Location backend
mvn org.springframework.boot:spring-boot-maven-plugin:3.3.3:run '-Dspring-boot.run.profiles=prod'
```

El argumento selecciona el perfil Spring PostgreSQL sin activar el perfil Maven
que compila el frontend. También puede ejecutarse `ProtubeBackApplication` desde
el IDE con perfil Spring `prod` y las mismas variables. La importación está
**desactivada por defecto** y el runner rechaza cargar datos en H2.

Tras migrar/validar el esquema, el arranque importa los datos y registra:
`Video import committed: ... videos added, ... comments added, ... videos unchanged;
no-comments source ID ...`. Ese mensaje se produce después de confirmar la
transacción del importador. Un error aborta el arranque y revierte la carga.
La aplicación sigue en ejecución para comprobar catálogo y medios.

Para elegir expresamente el archivo que quedará sin comentarios, por ejemplo 0:

```powershell
mvn org.springframework.boot:spring-boot-maven-plugin:3.3.3:run '-Dspring-boot.run.profiles=prod' '-Dspring-boot.run.arguments=--pro_tube.import.no-comments-id=0'
```

`pro_tube.import.page-size` vale 12, según la propuesta de API. Se exige más de una
página de vídeos y al menos un vídeo con comentarios. Puede ajustarse mediante
argumento si el equipo cambia ese tamaño. La paginación no se implementa aquí.

Para comprobar la repetición, detener el backend con Ctrl+C y repetir el mismo
comando: los vídeos y comentarios ya importados no se insertan de nuevo. Para
arrancar después sin carga automática:

```powershell
$env:ENV_PROTUBE_IMPORT_ENABLED = 'false'
mvn org.springframework.boot:spring-boot-maven-plugin:3.3.3:run '-Dspring-boot.run.profiles=prod'
```

## Correspondencia y conservación de los datos

- Cada `<id>.json` se asocia a `<id>.mp4` y `<id>.webp`. Se comprueban el ID del
  nombre, la existencia de archivos no vacíos y que no resuelvan fuera del almacén.
  No se decodifica el contenido multimedia.
- `title`, `meta.description`, `user`, `timestamp`, `duration`, `width` y `height`
  se proyectan al modelo existente. Se rechazan datos incompatibles con los tipos
  SQL, sin truncar ni inventar descripciones o autores.
- Los metadatos adicionales de `meta`, salvo `comments`, se conservan en JSONB.
  `source_metadata.video_grabber_id` conserva el ID de origen. La PK PostgreSQL
  sigue siendo generada por la base y puede ser distinta del ID del archivo.
- Los autores externos no generan cuentas de usuario. Los comentarios conservan
  texto, autor, fecha y `like_count` en metadatos; se enlazan a la PK real del vídeo.
- Las rutas persistidas son relativas (`0.mp4`, `0.webp`), sin ruta Windows en Java.
  `/media/**` utiliza el directorio configurable y una URI que contempla espacios,
  separadores y la barra final. Vídeos y miniaturas siguen siendo archivos físicos.

## Idempotencia y caso sin comentarios

`video_path`, que ya es único en el esquema, identifica cada vídeo del almacén.
Si la ruta existe sin el mismo `video_grabber_id`, se aborta en lugar de asociar
comentarios a contenido ajeno. No renombrar ni reutilizar IDs para otras descargas
entre ejecuciones. No se actualizan los metadatos de vídeos existentes.

Cada comentario importado obtiene `source_metadata.video_grabber_key`, SHA-256 de
texto, autor y fecha UTC. La clave se compara dentro del vídeo. Se reconocen además
comentarios externos anteriores sin clave mediante esa misma identidad natural.
La posición en el JSON y los likes no forman parte de la identidad. Los duplicados
exactos del origen se colapsan; una edición local conserva la clave y no provoca
la reinserción del texto original. No se sobrescriben comentarios ni likes existentes.

La importación completa usa una transacción con rollback también ante errores de
lectura. Un advisory lock transaccional PostgreSQL serializa las ejecuciones de
este importador, sin añadir tablas ni restricciones. No coordina otros programas
que escriban comentarios directamente sin utilizar ese bloqueo.

Sin selección explícita, se elige el primer vídeo con lista de comentarios vacía;
si todos tienen comentarios, se elige el ID menor. Se omite únicamente su lista al
importar, conservando intacto el JSON original. El ID elegido aparece en el log y
se marca en los metadatos de la creación del registro. Mantener las mismas opciones
para repetir exactamente el conjunto de prueba.

Si el vídeo seleccionado ya tiene comentarios en la base, la carga aborta y
revierte sus inserciones: no borra comentarios para forzar el caso vacío. Elegir
otro ID mediante `--pro_tube.import.no-comments-id=...` que no tenga comentarios
persistidos. Los marcadores JSON de importaciones anteriores son informativos;
la consulta SQL de comentarios es la comprobación del estado actual.

El identificador de grupo usado al descargar no puede deducirse de estos archivos:
videoGrabber lo usa como semilla y numera los archivos desde cero. Confirmarlo con
quien realizó la descarga; no se vuelve a descargar para ejecutar esta tarea.

## Verificación en PostgreSQL y HTTP

En la conexión PostgreSQL configurada, ejecutar estas consultas de solo lectura:

```sql
SELECT count(*) AS videos FROM public.videos;
SELECT count(*) AS comments FROM public.comments;
SELECT v.id, v.video_path, v.thumbnail_path, v.source_metadata->>'video_grabber_id' AS source_id,
       count(c.id) AS comments
FROM public.videos v LEFT JOIN public.comments c ON c.video_id = v.id
GROUP BY v.id ORDER BY v.id;
SELECT video_path, count(*) FROM public.videos
GROUP BY video_path HAVING count(*) > 1;
SELECT video_id, source_metadata->>'video_grabber_key' AS source_key, count(*)
FROM public.comments WHERE source_metadata ? 'video_grabber_key'
GROUP BY video_id, source_metadata->>'video_grabber_key' HAVING count(*) > 1;
```

Comparar IDs y cantidades tras dos cargas. Debe existir un vídeo con cero
comentarios y otro con comentarios de su JSON. Tras detener y arrancar el backend
sin importar, comprobar los mismos IDs, títulos y comentarios. El reinicio de un
servidor PostgreSQL local se gestiona con su instalación, sin añadir infraestructura
al repositorio. Conservar su directorio de datos.

Comprobar `http://localhost:8080/api/videos`, `/media/0.webp` y `/media/0.mp4` en
el navegador. Sustituir 0 por otro ID si procede. Las pruebas de medios usan bytes
sintéticos para verificar la ruta y HTTP Range; la reproducción real de los vídeos
se comprueba con los originales desde el navegador.

## Pruebas automatizadas

Desde `backend/`, sin PostgreSQL ni acceso al almacén original:

```powershell
$env:ENV_PROTUBE_IMPORT_ENABLED = 'false'
mvn clean verify
```

Incluye lectura y validación JSON, asociación de archivos, metadatos y comentarios,
selección del caso vacío, carga repetida sin duplicados, conservación de ediciones,
reconocimiento de comentarios anteriores, rollback completo y configuración de
rutas y recursos HTTP. Las pruebas aisladas usan H2 y archivos temporales. No
acreditan por sí solas PostgreSQL, JSONB ni el bloqueo de concurrencia real.

Lectura opcional de los archivos descargados, sin importar ni cambiar originales:

```powershell
$env:ENV_PROTUBE_STORE_DIR = 'C:\ProTube\videos'
$env:RUN_LOCAL_VIDEO_READER_TEST = 'true'
mvn verify
```

Para las pruebas opcionales PostgreSQL, configurar una **base exclusiva de pruebas**
con el esquema de la tarea 3 y las variables de conexión. No usar la base del equipo:

```powershell
$env:ENV_PROTUBE_IMPORT_ENABLED = 'false'
$env:RUN_CATALOG_POSTGRES_TESTS = 'true'
mvn verify
```

`PostgresVideoImportTest` importa fixtures temporales dos veces, comprueba JSONB,
relaciones y cantidades y revierte sus inserciones; no borra registros existentes.
La prueba de reinicio de la tarea 3 confirma sus propios fixtures, cierra y abre
la aplicación y elimina solo esos fixtures. La aceptación completa del conjunto
real exige además las comprobaciones SQL/HTTP anteriores. Si PostgreSQL no está
disponible, las pruebas opcionales quedan omitidas, no aprobadas.

El preparador Python anterior sigue disponible como vista previa independiente;
su manifiesto no es necesario para este importador Java y no acredita una carga SQL.

## Resultado verificado en este entorno (2026-10-19)

`mvn clean verify` con Java 21 y la lectura local activada: 37 pruebas contabilizadas,
28 correctas y 9 omitidas de PostgreSQL, sin fallos y con cobertura superada.
La lectura real encontró 21 vídeos y 154 comentarios seleccionados, con el archivo
0 como caso sin comentarios, conservando el contenido de todos los JSON originales.

No se detectó PostgreSQL local disponible (localhost:5432 no accesible y sin
binarios PostgreSQL locales). No se ha ejecutado la importación real ni verificado
el bloqueo concurrente, JSONB, las consultas posteriores o la conservación del
conjunto importado tras reiniciar en PostgreSQL. Esos criterios siguen pendientes.
