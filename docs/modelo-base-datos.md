# Modelo de base de datos de ProTube

**Documento pendiente de revisión del equipo.** Describe el esquema exportado en [db_schema/](db_schema/), sin limitarse a un sprint. Las decisiones pendientes no son cambios aplicados.

## Objetivo

Guardar usuarios, vídeos, comentarios, clasificación y actividad en PostgreSQL. Los archivos multimedia permanecen fuera de la base; se guardan sus referencias. La conservación tras reiniciar debe verificarse con escrituras confirmadas, no con tests que revierten su transacción.

## Tablas y entidades

Todas las tablas están en `public`. `PK` indica clave primaria y `FK` clave foránea. Las seis claves `id` son `bigint GENERATED ALWAYS AS IDENTITY`. Las fechas son `timestamp with time zone`.

### users — usuarios registrados

Fuente: [users.sql](db_schema/users.sql).

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `bigint` | PK, identidad |
| `email` | `varchar(254)` | Obligatorio, sin espacios exteriores y con comprobación básica de formato; único mediante `lower(email)` |
| `password_hash` | `text` | Obligatorio y no vacío tras recortar espacios |
| `display_name` | `varchar(100)` | Obligatorio y no vacío |
| `avatar_path` | `text` | Opcional; no vacío si existe |
| `description` | `text` | Obligatorio; por defecto `''` |
| `created_at` | `timestamptz` | Obligatorio; por defecto `CURRENT_TIMESTAMP` |

### videos — catálogo

Fuente: [videos.sql](db_schema/videos.sql).

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `bigint` | PK, identidad |
| `owner_id` | `bigint` | FK a `users.id`, opcional |
| `category_id` | `bigint` | FK a `categories.id`, opcional |
| `title` | `varchar(255)` | Obligatorio y no vacío |
| `description` | `text` | Obligatorio y no vacío |
| `video_path` | `text` | Obligatorio, no vacío y único |
| `thumbnail_path` | `text` | Obligatorio y no vacío |
| `duration_seconds` | `numeric(12,2)` | Opcional; mayor que cero si existe |
| `width`, `height` | `integer` | Opcionales; mayores que cero si existen |
| `published_at` | `timestamptz` | Obligatorio; por defecto `CURRENT_TIMESTAMP` |
| `external_author` | `text` | Opcional; no vacío si existe |
| `source_metadata` | `jsonb` | Obligatorio; objeto JSON, por defecto `{}` |

Debe existir `owner_id` o `external_author`; se permiten ambos. Hay índices sobre propietario, categoría y `(published_at, id)`.

### comments — comentarios y respuestas

Fuente: [comments.sql](db_schema/comments.sql).

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `id` | `bigint` | PK, identidad |
| `video_id` | `bigint` | FK a `videos.id`, obligatorio |
| `author_id` | `bigint` | FK a `users.id`, opcional |
| `parent_id` | `bigint` | Opcional; referencia al comentario padre junto con `video_id` |
| `text` | `text` | Obligatorio y no vacío |
| `created_at` | `timestamptz` | Obligatorio; por defecto `CURRENT_TIMESTAMP` |
| `external_author` | `text` | Opcional; no vacío si existe |
| `source_metadata` | `jsonb` | Obligatorio; objeto JSON, por defecto `{}` |

Debe existir autor local o externo; se permiten ambos. La FK compuesta `(parent_id, video_id)` garantiza que el padre pertenece al mismo vídeo, apoyándose en `UNIQUE (id, video_id)`. Un comentario no puede ser su propio padre; esto no impide ciclos de varias respuestas.

Hay índices sobre `(video_id, created_at, id)`, `author_id` y `(parent_id, video_id)`.

### Clasificación, «me gusta» y visualizaciones

| Tabla y fuente | Campos y reglas |
| --- | --- |
| [categories](db_schema/categories.sql) | `id bigint` PK identidad; `name varchar(100)` obligatorio, sin espacios exteriores y no vacío. Índice único en `lower(name)`. |
| [tags](db_schema/tags.sql) | `id bigint` PK identidad; `name varchar(100)` con las mismas reglas que categorías. |
| [video_tags](db_schema/video_tags.sql) | `video_id bigint` FK a vídeos y `tag_id bigint` FK a etiquetas, ambos obligatorios. PK conjunta; índice adicional en `tag_id`. |
| [comment_likes](db_schema/comment_likes.sql) | `comment_id bigint` FK a comentarios y `user_id bigint` FK a usuarios, ambos obligatorios y PK conjunta. `created_at timestamptz` obligatorio, por defecto `CURRENT_TIMESTAMP`; índice en `user_id`. |
| [video_views](db_schema/video_views.sql) | `id bigint` PK identidad; `video_id bigint` FK obligatoria; `user_id bigint` FK opcional; `viewed_at timestamptz` obligatorio, por defecto `CURRENT_TIMESTAMP`. Índices en `(video_id, viewed_at)` y `user_id`. |

Las PK conjuntas impiden repetir una etiqueta en un vídeo o un «me gusta» del mismo usuario en un comentario. Las visualizaciones permiten varios eventos del mismo usuario y eventos sin usuario registrado.

## Relaciones

- Un usuario puede tener varios vídeos y comentarios; los importados pueden tener solo autor externo.
- Una categoría puede clasificar varios vídeos; cada vídeo tiene como máximo una categoría.
- Vídeos y etiquetas tienen una relación de muchos a muchos mediante `video_tags`.
- Un vídeo puede tener cero o varios comentarios y visualizaciones.
- Un comentario puede tener varias respuestas y «me gusta» de distintos usuarios.

Las FK exportadas no declaran `ON DELETE CASCADE`: se aplica el comportamiento por defecto `NO ACTION`. No debe asumirse que borrar un registro elimina sus dependencias.

## Correspondencia con la API y los archivos

| Campo de API | Origen |
| --- | --- |
| `id`, `title`, `description` | Columnas de `videos` |
| `duration` | `duration_seconds`; la API debe resolver que la columna permite nulos |
| `user` | `users.display_name` mediante `owner_id`, o `external_author`; falta acordar prioridad y significado |
| `thumbnailUrl`, `videoUrl` | URLs construidas a partir de `thumbnail_path` y `video_path` |

El identificador de PostgreSQL no equivale necesariamente al nombre del archivo de VideoGrabber. Se propone guardar rutas relativas al almacén y construir las URLs públicas en el backend; el SQL solo exige texto no vacío, no valida ese formato. `source_metadata` permite conservar metadatos adicionales como objeto JSON.

`page`, `size` y `hasNext` se calculan al consultar, no son columnas. El contrato de API todavía debe concretar la representación de comentarios y autores.

## Exportación, permisos y configuración

Se han revisado los 14 SQL de `db_schema`: ocho tablas y seis archivos `*_id_seq.sql`. Estos últimos contienen permisos `SELECT, USAGE` para `admin`, no instrucciones `CREATE SEQUENCE`; las identidades de las tablas generan sus secuencias.

Los scripts asignan las tablas a `postgres` y conceden `SELECT, INSERT, UPDATE, DELETE` a `admin`. No crean esos roles, la base ni conceden permisos de creación sobre el esquema. Son una referencia del esquema exportado, no una migración completa ejecutable en cualquier orden.

Las credenciales deben proporcionarse mediante variables de entorno (`ENV_PROTUBE_DB_HOST`, `ENV_PROTUBE_DB`, `ENV_PROTUBE_DB_USER`, `ENV_PROTUBE_DB_PASS`), sin contraseñas en archivos versionados.

## Decisiones y comprobaciones pendientes

- Acordar el significado de `user` y el tratamiento de propietarios y autores externos.
- Resolver metadatos incompletos: descripción y miniatura son obligatorias, pero duración es opcional.
- Definir identidad estable de importación: `video_path` es único, pero no garantiza deduplicación si cambian las rutas.
- Acordar validación de ciclos de respuestas, política de borrado y qué cuenta como visualización.
- Preparar migraciones ordenadas y prerrequisitos de roles y esquema; revisar cualquier ajuste antes de aplicarlo.
- Comprobar que las entidades Java coinciden con estos tipos y restricciones; probar vídeos y comentarios y confirmar su conservación tras reiniciar.

Este documento describe los SQL exportados. No acredita por sí solo su correspondencia con la base en vivo ni modifica el esquema o los datos.
