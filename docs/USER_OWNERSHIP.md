# Tarea 19: usuarios y propiedad de vídeos

`User.enabled` vale `true` por defecto. La cuenta interna `demo@protube.invalid`
(ProTube Demo) se crea desactivada mediante V2, con un hash BCrypt de coste 12 de
una contraseña aleatoria descartada. `PasswordConfig` proporciona el encoder
compartido. El registro y login deberán utilizarlo y respetar `enabled` cuando se
implementen; este cambio no añade autenticación ni permisos de edición.

V2 asigna a esa cuenta los vídeos sin propietario y establece `owner_id NOT NULL`,
sin alterar propietarios existentes, archivos ni metadatos. No modificar V1 ya
aplicada. Un email reservado ya existente hace fallar la migración para evitar
reutilizar accidentalmente otra cuenta. Revisar ese conflicto antes de migrar.

El importador busca ProTube Demo por email, falla si no existe y la asigna solo a
los vídeos nuevos. Para sus vídeos, listado y detalle muestran `external_author`
si contiene texto; si falta, muestran ProTube Demo. Los demás vídeos muestran el
nombre público del propietario. Las respuestas siguen utilizando DTO públicos.

## Verificación

Las pruebas normales usan H2 aislado. Las restricciones de PostgreSQL, las
migraciones y el reinicio requieren exclusivamente una base de pruebas:

```powershell
# Configurar ENV_PROTUBE_DB_HOST, ENV_PROTUBE_DB_PORT, ENV_PROTUBE_DB,
# ENV_PROTUBE_DB_USER y ENV_PROTUBE_DB_PASS para el servidor de pruebas.
$env:RUN_CATALOG_POSTGRES_TESTS = 'true'
$env:RUN_POSTGRES_TESTS = 'true'
# Desde backend/, con Java 21:
mvn clean verify
```

`UserOwnershipMigrationPostgresTest` crea una base temporal con nombre
`protube_migration_test_<UUID>` en ese servidor. El rol necesita permiso
`CREATEDB`. Instala V1, guarda usuarios/vídeos/comentarios, aplica V2 y compara los
registros, propietarios y metadatos. Valida Flyway y comprueba que un segundo
`migrate` no vuelve a insertar la cuenta. Elimina solo su base temporal al acabar.

`CatalogPostgresRestartTest` confirma un usuario con hash BCrypt, un vídeo suyo y
un comentario; cierra completamente Spring y vuelve a arrancarlo. Comprueba el
usuario, su estado, el hash y las relaciones antes de limpiar sus propios datos.
Esta prueba cubre el reinicio de la aplicación, no del servidor PostgreSQL.

Las pruebas E2E usan otra base H2 en memoria y archivos sintéticos. No ejecutan
Flyway ni usan el almacén habitual. Desde frontend/: `npm run test:e2e`.

No ejecutar estas pruebas contra la base habitual del equipo. La revisión de un
compañero y el CI remoto se verifican por separado.

Verificado el 2026-10-28 con Java 21 y PostgreSQL 16 en un contenedor temporal:
71 pruebas correctas, ninguna fallida y una prueba opcional del almacén local
omitida; cobertura JaCoCo superada. Las 12 pruebas Playwright también pasaron.
Se eliminó el contenedor temporal después de verificarlo. No se migró la base
habitual del equipo.
