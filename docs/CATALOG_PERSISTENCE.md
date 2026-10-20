# Persistencia del catálogo (tarea 3)

## Alcance

`Video`, `Comment` y `Category` corresponden a las tablas existentes en `public`.
Se reutilizan `User` y `UserRepository`. Las relaciones son opcionales para
propietario/categoría y autor registrado, y obligatorias para comentario/vídeo.
Se admiten autores externos sin inventar cuentas. Los archivos no se almacenan en
PostgreSQL: solo sus rutas. `source_metadata` se mapea como JSON mediante Hibernate
y el dialecto PostgreSQL lo almacena en `jsonb`.

`Comment` mantiene `videoId` y `parentId` como columnas de escritura y asociaciones
de lectura al vídeo y al padre. `setVideo` y `setParent` sincronizan los IDs; guardar
primero el vídeo y el padre. La FK compuesta original impide respuestas entre
vídeos distintos. No se añaden cascadas de borrado. Las restricciones CHECK y los
índices especiales los conserva la migración, no la generación DDL de Hibernate.

En la tarea 3, `GET /api/videos` devolvía títulos reales ordenados por ID.
El contrato actual incorpora paginación y resúmenes públicos, documentados en
[VIDEO_CATALOG.md](VIDEO_CATALOG.md). Las entidades no se serializan directamente.

## Preparar PostgreSQL

Usar Java 21, Maven y PostgreSQL (el Compose del repositorio utiliza PostgreSQL 16).
Desde PowerShell, definir las variables en la sesión; no versionar sus valores:

```powershell
$env:ENV_PROTUBE_DB_HOST = 'localhost'
$env:ENV_PROTUBE_DB_PORT = '5432' # opcional
$env:ENV_PROTUBE_DB = 'protube_catalog_test' # base exclusiva para las pruebas
$env:ENV_PROTUBE_DB_USER = Read-Host 'Rol de PostgreSQL'
$env:ENV_PROTUBE_DB_PASS = [System.Net.NetworkCredential]::new('', (Read-Host -AsSecureString 'Contraseña PostgreSQL')).Password
$env:ENV_PROTUBE_STORE_DIR = 'C:\ProTube\videos'
docker compose up -d db
```

Compose inicializa el rol/base en el primer arranque del volumen. Si el volumen ya
existe, cambiar estas variables no cambia su contraseña ni crea otra base:
configurar una base de pruebas dedicada con el administrador. No borrar el volumen.
El puerto publicado en `compose.yaml` es 5432; un puerto distinto requiere ajustar
esa publicación o usar un servidor externo.

Para una base nueva y vacía, arrancar el backend con el perfil Spring `prod`.
Flyway ejecuta `V1__existing_public_schema.sql` y Hibernate valida los mapeos.
La migración contiene las ocho tablas SQL documentadas, en orden de dependencias,
con los mismos campos, identidades, índices, CHECK y FK. No replica los `OWNER TO
postgres` ni los `GRANT ... TO admin`: los roles y permisos dependen del despliegue.
El rol migrador debe poder crear objetos en `public`; un rol de ejecución separado
necesita SELECT/INSERT/UPDATE/DELETE sobre las tablas y USAGE/SELECT sobre secuencias.

La configuración versionada de IntelliJ hereda las variables del proceso del IDE.
Definirlas en su configuración local no compartida o reiniciar el IDE desde un
entorno que las contenga. Ya no incluye contraseña ni fuerza `ddl-auto=update`.

También se puede arrancar desde `backend/` sin compilar ni cambiar el frontend:

```powershell
mvn org.springframework.boot:spring-boot-maven-plugin:3.3.3:run '-Dspring-boot.run.profiles=prod'
```

El perfil Maven por defecto se mantiene para compatibilidad con las pruebas
existentes; el argumento selecciona el perfil Spring de PostgreSQL. `dev` sigue
siendo H2 en memoria y no acredita persistencia. `prod` utiliza `ddl-auto=validate`.

## Base existente: adopción explícita, sin borrar datos

Flyway **rechaza por defecto** una base no vacía sin historial. No activar
`baseline-on-migrate` globalmente y no usar `create`, `create-drop` ni `clean`.

1. Guardar una copia de seguridad y revisar el esquema real con `\d+ public.users`,
   `\d+ public.videos`, `\d+ public.comments` y las otras cinco tablas documentadas.
   Comparar columnas, tipos, restricciones e índices con `docs/db_schema` y V1.
2. Si ya existe historial Flyway, revisarlo y usar `validate`; no volver a baselinar.
3. Si **las ocho tablas ya corresponden a V1**, registrar explícitamente baseline
   de versión 1 con Flyway CLI. Esto añade historial, no recrea las tablas:

```powershell
$env:FLYWAY_URL = "jdbc:postgresql://$($env:ENV_PROTUBE_DB_HOST):$($env:ENV_PROTUBE_DB_PORT)/$($env:ENV_PROTUBE_DB)"
$env:FLYWAY_USER = $env:ENV_PROTUBE_DB_USER
$env:FLYWAY_PASSWORD = $env:ENV_PROTUBE_DB_PASS
flyway -schemas=public -baselineVersion=1 baseline
```

4. Si el esquema es parcial o diferente, detenerse: preparar una migración aditiva
   específica tras revisar las diferencias. No marcar V1 como aplicada ni ejecutar
   sus CREATE sobre tablas existentes. No se incluye una reparación automática que
   pueda ocultar diferencias o alterar datos de otra persona.
5. Arrancar con `prod`; Hibernate verifica las columnas mapeadas. Esto no sustituye
   la revisión de CHECK, índices y tablas no mapeadas por JPA.

## Pruebas

Desde `backend/`:

```powershell
mvn verify
```

Ejecuta las pruebas existentes y las nuevas pruebas aisladas de catálogo sobre H2:
metadatos, JSON, autores, categoría, respuestas, vídeo sin comentarios, rutas únicas
y rechazo de respuestas de otro vídeo. No demuestra compatibilidad PostgreSQL.
Flyway está desactivado para H2: su SQL es específico de PostgreSQL.

Para migraciones, JSONB y restricciones reales, usar **solo una base de pruebas
dedicada** con las variables anteriores. Puede estar vacía (Flyway instala V1) o
tener el esquema previamente adoptado. La prueba ejecuta DDL de Flyway únicamente
si falta la migración; las pruebas de repositorio revierten sus inserciones:

```powershell
$env:RUN_CATALOG_POSTGRES_TESTS = 'true'
mvn verify
```

`CatalogPostgresTest` repite las pruebas de repositorio en PostgreSQL y comprueba
JSONB, identidades ALWAYS y rechazo de datos que violan CHECK. Además,
`CatalogPostgresRestartTest` arranca la aplicación real en un puerto aleatorio,
guarda vídeo y comentario en una transacción confirmada, cierra el contexto Spring
con su pool y EntityManagerFactory, vuelve a arrancar y recupera ambos registros.
Al terminar elimina únicamente sus dos registros de prueba. Si el segundo arranque
falla, pueden quedar esos registros con ruta `restart-test-<UUID>.mp4` en la base
dedicada; no se borra contenido existente para recuperarse de un fallo.

Esta prueba verifica reinicio de la aplicación, no del servidor PostgreSQL. Para
comprobar también el volumen, confirmar datos de prueba, ejecutar `docker compose
restart db` y consultarlos de nuevo. No usar `docker compose down -v`.

La prueba antigua `UserRepositoryPostgresTest` tiene su propio interruptor
`RUN_POSTGRES_TESTS=true` y requiere el esquema instalado. No confundir un test
omitido con una verificación correcta de PostgreSQL.

## Credenciales y límites

Las configuraciones de ejecución compartidas ya no contienen valores DB locales.
Una contraseña publicada antes sigue existiendo en el historial de Git: retirarla
del archivo actual no la revoca. Si era válida, su propietario debe rotarla; esta
tarea no reescribe el historial ni cambia contraseñas del servidor.

No se ha importado `C:\ProTube\videos`. Para la tarea 4 quedará integrar la carga
idempotente con estos repositorios, sin confundir el ID del archivo con la
identidad PostgreSQL y sin borrar comentarios existentes.

## Resultado disponible en este entorno (2026-10-19)

`mvn clean verify` con Java 21.0.9: BUILD SUCCESS, 22 pruebas contabilizadas,
14 correctas y 8 omitidas de PostgreSQL; ninguna fallida y cobertura superada.
El servidor PostgreSQL configurado no estaba accesible, Docker no estaba disponible
y no se localizaron binarios PostgreSQL locales. No se han ejecutado la migración
en PostgreSQL ni las pruebas de guardado/reinicio contra esa base. Su validación
real sigue pendiente; las pruebas H2 no la sustituyen.
