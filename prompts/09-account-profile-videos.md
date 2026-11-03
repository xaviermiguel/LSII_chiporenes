# Cuenta de usuario y vídeos propios

**Approved on:** 2026-11-03
**Approved by:** Equipo, confirmado por el usuario: «Sí, aprobado».
**Used for:** Perfil editable, contraseña y vídeos propios; rama codex/account-profile-videos.

## Prompt

Implementar perfil editable (nombre, email y descripción), cambio de contraseña
verificando la actual, y «Mis vídeos» con listado y edición de título/descripción,
con autorización del backend y pruebas. Reutilizar las APIs existentes de vídeos,
la sesión compartida, cookies/CSRF y el estándar visual verde. Mantener públicos
catálogo y reproducción. Validar campos, errores, carga y evitar envíos repetidos.
Al cambiar contraseña, cerrar la sesión actual y pedir un nuevo login.
Conservar cambios ajenos. Guardar la configuración privada local fuera de Git,
con el almacén C:/ProTube/videos. No registrar credenciales en prompts o commits.

## Notes

Referencia funcional: REQUIREMENT.md US-03 y US-07. Usar commit-ai-change.
No incluye borrado de vídeos, subida de avatar ni publicación de PR.

## Validación

2026-11-03: 102 pruebas Jest correctas (13 suites), cobertura de líneas 95,31 %.
TypeScript, build Vite y ESLint correctos; se conserva el aviso existente de Fast
Refresh del proveedor/hook. Maven clean verify: 165 pruebas reportadas,
145 ejecutadas, 20 opcionales omitidas, cero fallos; JaCoCo aprobado.
Playwright: 20 recorridos correctos contra Spring real, con persistencia tras
recarga, contraseña actual inválida, nuevo login, vídeos propios y edición.
Capturas de cuenta a 320 y 1440 px revisadas visualmente.

El archivo privado se ha recreado fuera de Git y del contexto Docker con la ruta
C:/ProTube/videos. PostgreSQL local rechaza las credenciales facilitadas tanto
por localhost como por 127.0.0.1:5432. No se han cambiado sus usuarios ni datos.
Docker utiliza su propio PostgreSQL y sus volúmenes existentes.

Docker actualizado en localhost:8081, conservando volúmenes: aplicación y base
saludables; prueba de navegador de catálogo, paginación, reproducción y comentarios
correcta. El log de PostgreSQL 18 de Windows confirma que el rol solicitado no
existe en esa instancia (5432); la configuración privada está preparada, pero
su arranque local queda pendiente de recuperar la instancia o el rol correcto.
No se han modificado usuarios, contraseñas ni configuración del servidor local.
GitHub Actions no se ha ejecutado remotamente.
