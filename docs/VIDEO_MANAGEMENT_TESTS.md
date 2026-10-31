# Pruebas de gestión de vídeos

Desde `backend`, ejecutar `mvn clean verify`. Incluye JaCoCo y sus mínimos de
cobertura, sin desactivarlos. Las pruebas usan bases H2 con nombres únicos y
directorios temporales; no acceden al almacén ni al catálogo local.

## Cobertura funcional

- `VideoManagementIntegrationTest`: filtros reales de Spring Security, registro
  para obtener sesión/CSRF, subida multipart con respuesta/Location, consulta de
  detalle, listado propio paginado y aislamiento entre usuarios, PATCH parcial,
  validaciones, permisos, IDs inexistentes y rechazo de escrituras sin CSRF.
- El borrado verifica relaciones (likes de comentarios, comentarios, etiquetas
  y visualizaciones), conservación de usuarios y otros vídeos, limpieza tras el
  commit y conservación de datos/archivos al hacer rollback.
- `VideoDeletionSafetyTest`: rutas fuera del almacén, archivos ya ausentes,
  miniaturas antiguas JPG y continuación de la limpieza si falla un archivo.
- `VideoUploadServiceTest`: datos o archivos ausentes, persistencia, bytes
  guardados y limpieza ante fallos de disco o base de datos.

Los archivos son bytes sintéticos. Estas pruebas no afirman validar ni decodificar
MP4/WebP. Tampoco comprueban reintentos de limpieza: el servicio solo registra
los errores de eliminación.

## Verificación opcional en PostgreSQL

H2 comprueba la clave foránea de respuestas de comentarios fila por fila y no
reproduce el borrado conjunto de PostgreSQL. Por ello el caso de comentarios con
respuestas se comprueba en PostgreSQL, usando las migraciones reales. La ejecución
H2 comprueba comentarios sin respuestas; no se elimina ninguna restricción.

Preparar un servidor PostgreSQL de pruebas y un archivo privado Java properties:

```properties
ENV_PROTUBE_DB_HOST=127.0.0.1
ENV_PROTUBE_DB_PORT=5432
ENV_PROTUBE_DB_USER=usuario_de_pruebas
ENV_PROTUBE_DB_PASS=clave_de_pruebas
```

El usuario necesita conexión a `postgres` y permiso para crear bases de datos.
La prueba crea una base `protube_video_test_<UUID>`, aplica Flyway y elimina
únicamente esa base al terminar. No usa el nombre de la base habitual.

En PowerShell, desde `backend`:

```powershell
$env:RUN_VIDEO_MANAGEMENT_POSTGRES = 'true'
$env:PROTUBE_TEST_CONFIG = 'C:/ruta/privada/test.properties'
mvn test '-Dtest=VideoManagementIntegrationTest,VideoDeletionSafetyTest'
Remove-Item Env:RUN_VIDEO_MANAGEMENT_POSTGRES
Remove-Item Env:PROTUBE_TEST_CONFIG
```

No versionar el archivo de credenciales. Si se interrumpe el proceso antes de la
limpieza, revisar las bases de prueba restantes en ese servidor aislado.

## Resultado de la revisión (31/10/2026)

- `mvn -o clean verify`: 159 casos, 139 superados y 20 opcionales omitidos;
  sin fallos ni errores. Todos los mínimos JaCoCo se cumplen.
- Ejecución seleccionada en una instancia PostgreSQL 18.6 temporal independiente:
  7 casos de integración y 5 de seguridad de archivos superados. Incluye borrado
  de comentarios con respuestas y las restricciones de las migraciones reales.
- No se modificó código de producción, el catálogo habitual ni su almacén.
  Las pruebas de errores de limpieza generan mensajes ERROR esperados en el log.
- El servidor PostgreSQL temporal se detuvo. La eliminación de su directorio
  temporal fue bloqueada por la política automática del entorno.
