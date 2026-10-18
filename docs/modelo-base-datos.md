# Modelo de base de datos de ProTube

**Propuesta documental pendiente de aprobación del equipo.** Modelo completo basado en los 14 archivos SQL de [db_schema](db_schema/). Las tablas siguientes describen esas definiciones; los ajustes propuestos se separan al final. No se ha consultado la instancia PostgreSQL ni comprobado su coincidencia exacta con las exportaciones.

## Objetivo y estado

Persistir usuarios, catálogo, clasificación, comentarios, respuestas, «me gusta» y visualizaciones, conservando los datos confirmados al reiniciar. Los archivos multimedia permanecen fuera de PostgreSQL. Referencia: [REQUIREMENT.md](../REQUIREMENT.md).

| Evidencia | Estado |
| --- | --- |
| SQL revisados | Ocho definiciones de tablas en `public` y seis archivos de permisos sobre secuencias. |
| Código | [User](../backend/src/main/java/com/tecnocampus/LS2/protube_back/model/User.java) tiene `@Entity`; existe [UserRepository](../backend/src/main/java/com/tecnocampus/LS2/protube_back/repository/UserRepository.java). No se han encontrado entidades Video o Comment; [VideoService](../backend/src/main/java/com/tecnocampus/LS2/protube_back/services/VideoService.java) devuelve datos fijos. |
| Comprobado por el usuario | Existe `protube-chiporenes` con las ocho tablas. Conexión y test de guardado/lectura de usuario correctos, con rollback. |
| Pendiente | Persistencia de vídeos y comentarios desde Java, conservación tras reiniciar y contraste de las exportaciones con la instancia de destino. |

## Tablas según los SQL

Convenciones: `timestamptz` abrevia `timestamp with time zone`; las FK referencian `id` salvo indicación contraria. Todas las tablas están en `public`. Las PK individuales son `bigint GENERATED ALWAYS AS IDENTITY`. Una columna sin NOT NULL admite nulo; un CHECK no implica NOT NULL.

### users — cuentas y perfiles

Fuente: [users.sql](db_schema/users.sql).

| Campo | Tipo PostgreSQL | Claves, restricciones y valores por defecto |
| --- | --- | --- |
| `id` | `bigint` | PK, identidad. |
| `email` | `varchar(254)` | NOT NULL; sin espacios en extremos, formato mediante expresión regular. UNIQUE sobre `lower(email)`. |
| `password_hash` | `text` | NOT NULL; no vacío tras `btrim`. |
| `display_name` | `varchar(100)` | NOT NULL; no vacío tras `btrim`; no único. |
| `avatar_path` | `text` | Opcional; no vacío tras `btrim` si existe. |
| `description` | `text` | NOT NULL; DEFAULT `''`; permite texto vacío. |
| `created_at` | `timestamptz` | NOT NULL; DEFAULT CURRENT_TIMESTAMP. |

Sin FK. El índice `users_email_unique` ignora mayúsculas; el formato comprobado no demuestra que el correo exista. Las restricciones SQL son más amplias que las anotaciones actuales de User.

### videos — catálogo

Fuente: [videos.sql](db_schema/videos.sql).

| Campo | Tipo PostgreSQL | Claves, restricciones y valores por defecto |
| --- | --- | --- |
| `id` | `bigint` | PK, identidad. |
| `owner_id` | `bigint` | FK → `users`; opcional. |
| `category_id` | `bigint` | FK → `categories`; opcional. |
| `title` | `varchar(255)` | NOT NULL; no vacío tras `btrim`; no único. |
| `description` | `text` | NOT NULL; no vacío tras `btrim`; sin DEFAULT. |
| `video_path` | `text` | NOT NULL, UNIQUE; no vacío tras `btrim`. |
| `thumbnail_path` | `text` | NOT NULL; no vacío tras `btrim`. |
| `duration_seconds` | `numeric(12,2)` | Opcional; mayor que cero si existe. |
| `width`, `height` | `integer` cada uno | Opcionales; mayores que cero si existen. |
| `published_at` | `timestamptz` | NOT NULL; DEFAULT CURRENT_TIMESTAMP. |
| `external_author` | `text` | Opcional; no vacío tras `btrim` si existe. |
| `source_metadata` | `jsonb` | NOT NULL; DEFAULT `'{}'::jsonb`; debe ser un objeto JSON. |

`videos_author_required` exige propietario local o autor externo, permitiendo ambos. No existen en esta definición los campos `source_author`, `source_namespace`, `source_key` ni `created_at` de propuestas anteriores.

### categories — categorías

Fuente: [categories.sql](db_schema/categories.sql).

| Campo | Tipo PostgreSQL | Claves y restricciones |
| --- | --- | --- |
| `id` | `bigint` | PK, identidad. |
| `name` | `varchar(100)` | NOT NULL; igual a su valor recortado con `btrim` y no vacío. UNIQUE sobre `lower(name)`. |

Sin FK. El esquema permite como máximo una categoría por vídeo.

### tags — etiquetas

Fuente: [tags.sql](db_schema/tags.sql).

| Campo | Tipo PostgreSQL | Claves y restricciones |
| --- | --- | --- |
| `id` | `bigint` | PK, identidad. |
| `name` | `varchar(100)` | NOT NULL; igual a su valor recortado con `btrim` y no vacío. UNIQUE sobre `lower(name)`. |

Sin FK. Las etiquetas pueden reutilizarse en varios vídeos.

### video_tags — asociación de etiquetas

Fuente: [video_tags.sql](db_schema/video_tags.sql).

| Campo | Tipo PostgreSQL | Claves y restricciones |
| --- | --- | --- |
| `video_id` | `bigint` | NOT NULL; FK → `videos`. |
| `tag_id` | `bigint` | NOT NULL; FK → `tags`. |

PK compuesta `(video_id, tag_id)`: impide asignaciones duplicadas. Sin identificador adicional ni secuencia propia.

### comments — comentarios y respuestas

Fuente: [comments.sql](db_schema/comments.sql).

| Campo | Tipo PostgreSQL | Claves, restricciones y valores por defecto |
| --- | --- | --- |
| `id` | `bigint` | PK, identidad. |
| `video_id` | `bigint` | NOT NULL; FK → `videos`. |
| `author_id` | `bigint` | FK → `users`; opcional. |
| `parent_id` | `bigint` | Opcional; junto con `video_id`, FK → `comments(id, video_id)`. |
| `text` | `text` | NOT NULL; no vacío tras `btrim`; no único. |
| `created_at` | `timestamptz` | NOT NULL; DEFAULT CURRENT_TIMESTAMP. |
| `external_author` | `text` | Opcional; no vacío tras `btrim` si existe. |
| `source_metadata` | `jsonb` | NOT NULL; DEFAULT `'{}'::jsonb`; debe ser un objeto JSON. |

Restricciones adicionales: UNIQUE `(id, video_id)` respalda la FK compuesta `comments_parent_same_video_fk`, que exige que padre y respuesta pertenezcan al mismo vídeo. `comments_author_required` exige autor local o externo, permitiendo ambos. `comments_not_own_parent` evita la autorreferencia directa, pero no ciclos de varios comentarios.

### comment_likes — «me gusta» locales

Fuente: [comment_likes.sql](db_schema/comment_likes.sql).

| Campo | Tipo PostgreSQL | Claves y restricciones |
| --- | --- | --- |
| `comment_id` | `bigint` | NOT NULL; FK → `comments`. |
| `user_id` | `bigint` | NOT NULL; FK → `users`. |
| `created_at` | `timestamptz` | NOT NULL; DEFAULT CURRENT_TIMESTAMP. |

PK compuesta `(comment_id, user_id)`: un usuario no puede repetir su «me gusta» en un comentario. Sin secuencia propia.

### video_views — visualizaciones

Fuente: [video_views.sql](db_schema/video_views.sql).

| Campo | Tipo PostgreSQL | Claves y restricciones |
| --- | --- | --- |
| `id` | `bigint` | PK, identidad. |
| `video_id` | `bigint` | NOT NULL; FK → `videos`. |
| `user_id` | `bigint` | FK → `users`; opcional. |
| `viewed_at` | `timestamptz` | NOT NULL; DEFAULT CURRENT_TIMESTAMP. |

Admite eventos anónimos y varios eventos del mismo usuario para el mismo vídeo. El SQL no define cuándo una reproducción cuenta como visualización.

## Relaciones e índices declarados

| Relación | Cardinalidad |
| --- | --- |
| Usuario–vídeos | Un usuario tiene 0..N vídeos; un vídeo tiene 0..1 propietario local. |
| Categoría–vídeos | Una categoría tiene 0..N vídeos; un vídeo tiene 0..1 categoría. |
| Vídeos–etiquetas | N:M mediante `video_tags`. |
| Vídeo–comentarios | Un vídeo tiene 0..N comentarios; cada comentario pertenece a un vídeo. |
| Usuario–comentarios | Un usuario tiene 0..N comentarios; cada comentario tiene 0..1 autor local. |
| Comentario–respuestas | Un comentario tiene 0..N respuestas; cada comentario tiene 0..1 padre, siempre del mismo vídeo. |
| Usuarios–comentarios con likes | N:M mediante `comment_likes`. |
| Vídeo–visualizaciones | Un vídeo tiene 0..N eventos; cada evento pertenece a un vídeo. |
| Usuario–visualizaciones | Un usuario tiene 0..N eventos; cada evento tiene 0..1 usuario. |

Las FK no declaran ON DELETE ni ON UPDATE: se aplica NO ACTION, sin borrados automáticos en cascada. No confundirlo con RESTRICT explícito. Borrar una fila referenciada exige resolver sus dependencias.

| Tabla | Índices declarados, además de las PK |
| --- | --- |
| `users` | UNIQUE `lower(email)`. |
| `categories`, `tags` | UNIQUE `lower(name)` en cada tabla. |
| `videos` | `owner_id`; `category_id`; `(published_at, id)`; UNIQUE `video_path`. |
| `video_tags` | `tag_id`. |
| `comments` | UNIQUE `(id, video_id)`; `(video_id, created_at, id)`; `author_id`; `(parent_id, video_id)`. |
| `comment_likes` | `user_id`. |
| `video_views` | `(video_id, viewed_at)`; `user_id`. |

Los índices respaldan filtros por propietario/categoría, orden de publicación, comentarios por vídeo y fecha, referencias inversas y analítica por vídeo/fecha. No añadir índices equivalentes sin revisar los existentes y las consultas.

## Archivos, autores e importación

| Concepto | Correspondencia y límites |
| --- | --- |
| Propietario local | `owner_id` referencia una cuenta ProTube. No equivale al canal de origen. |
| Autor externo | VideoGrabber rellena `user` con el canal. Se propone guardarlo en `external_author`, sin inventar cuentas o contraseñas. La API debe decidir qué muestra si existen autor local y externo. |
| PK de PostgreSQL | `videos.id` identifica la fila y sus relaciones; la base la genera mediante identidad ALWAYS. No copiar directamente el número de archivo como PK. |
| Identificador de archivo | VideoGrabber enumera `<id>.mp4`, `<id>.webp` y `<id>.json` desde cero; `--id` es la semilla del grupo. No garantiza identidad estable entre regeneraciones. |
| Referencia a medios | `video_path` y `thumbnail_path` son texto, no binarios. Se propone guardar rutas relativas al almacén y construir `videoUrl`/`thumbnailUrl`. El SQL no comprueba seguridad, relatividad o existencia de archivos. |
| Metadatos de origen | `source_metadata` admite un objeto JSON, sin imponer claves internas ni unicidad. |
| Duplicados | UNIQUE `video_path` evita repetir la misma ruta, no reconocer el mismo vídeo bajo otra ruta. Acordar una referencia reproducible de origen y su restricción: no existe actualmente esa garantía. |

Recorrido propuesto: VideoGrabber → metadatos persistidos y relaciones → respuesta de API. `title` corresponde a `title`, `duration` a `duration_seconds` y la descripción procede de `meta.description`. La API debe cerrar el significado de `user` y el formato plano/anidado de comentarios. `page`, `size` y `hasNext` son datos de paginación, no columnas.

Los contadores externos `view_count` y `like_count` no equivalen a eventos o likes de usuarios locales; no crear filas ficticias con ellos. VideoGrabber no conserva una clave externa de comentario en su salida, por lo que su deduplicación sigue pendiente. Fuentes: [main.py](../tooling/videoGrabber/main.py) y [MvcConfig.java](../backend/src/main/java/com/tecnocampus/LS2/protube_back/configuration/MvcConfig.java).

## Permisos y reproducción

Los ocho SQL de tablas asignan propietario `postgres` y conceden SELECT, INSERT, UPDATE y DELETE al rol `admin`. Los otros seis archivos solo conceden SELECT y USAGE sobre secuencias: [users](db_schema/users_id_seq.sql), [videos](db_schema/videos_id_seq.sql), [categories](db_schema/categories_id_seq.sql), [tags](db_schema/tags_id_seq.sql), [comments](db_schema/comments_id_seq.sql) y [video_views](db_schema/video_views_id_seq.sql). No crean secuencias independientes: estas se generan al crear las columnas de identidad.

Las exportaciones no crean la base o los roles, no incluyen datos ni son un historial de migraciones. Para reproducirlas hay que resolver los roles y ordenar dependencias: `users`, `categories`, `tags`, `videos`, `comments` y después `video_tags`, `comment_likes` y `video_views`; aplicar permisos de secuencia tras crear sus tablas. No ejecutar estos CREATE TABLE ciegamente sobre la base existente.

## Ajustes propuestos y decisiones pendientes

| Tema | Propuesta pendiente de aprobación |
| --- | --- |
| Mapeos Java | Implementar futuras entidades y repositorios conforme a estos nombres y reglas, incluidos `external_author`, `duration_seconds`, `published_at` y JSONB. La unicidad de correo ya existe en SQL aunque no esté anotada en User. |
| Importación | Acordar identidad reproducible y protección contra duplicados; añadir una migración si es necesaria. No asumir unicidad dentro de `source_metadata`. |
| Datos incompletos | Resolver descripción vacía, miniatura ausente, títulos de más de 255 caracteres, nombres de categoría/etiqueta de más de 100 y fechas ausentes. El esquema rechaza algunos casos; validar la carga o aprobar cambios sin inventar datos. |
| Categorías | El esquema permite una por vídeo y VideoGrabber genera una lista. Acordar selección o migrar a N:M si se necesita. |
| Comentarios | Conservar la FK de pertenencia al mismo vídeo; prevenir ciclos indirectos si se modifican jerarquías. Acordar formato público, autor mostrado y fechas de origen frente a fecha por defecto. |
| Borrados y métricas | Aprobar política de borrado/anonimización y definición y retención de visualizaciones; mantener NO ACTION mientras no se acuerde un cambio. |
| Evolución | Versionar esquema inicial y cambios mediante scripts o herramienta de migraciones aprobada, con línea base revisada para la base existente. `ddl-auto=update` no sustituye ese historial. |
| Entornos | Adaptar propietario y roles sin incluir secretos. Usar `ENV_PROTUBE_DB_HOST`, `ENV_PROTUBE_DB`, `ENV_PROTUBE_DB_USER` y `ENV_PROTUBE_DB_PASS` fuera de archivos versionados. |
| Validación | Probar restricciones, vídeos sin comentarios y autores locales/externos. Confirmar transacciones de catálogo, reiniciar y recuperar sin reimportar; el test con rollback no acredita esa conservación. |

Referencias: [application.properties](../backend/src/main/resources/application.properties) y [pom.xml](../backend/pom.xml). El perfil `prod` configura PostgreSQL; `dev` sigue usando H2. No se han encontrado dependencias de Flyway o Liquibase en el POM revisado.

Aprobar el documento junto al modelo acordado por el equipo. Describir el modelo completo no implica implementar todas sus funcionalidades en un sprint. Esta revisión solo modifica este documento; no ejecuta SQL ni altera código, configuración o datos.
