# Registro e inicio de sesión en el frontend

**Approved on:** 2026-10-31
**Approved by:** Equipo, confirmado por el usuario: «Sí, el equipo lo aprueba».
**Used for:** US-01/US-02, formularios frontend conectados a las tareas 20/21; rama `register/login-front-end`.

## Prompt

Realiza esta tarea. Revisa previamente que main esté actualizado con un pull y entonces crea la rama pertinente con nombre register/login front-end.

OBJETIVO: Permitir registrarse e iniciar sesión desde formularios conectados con la API y coherentes con el diseño del frontend.

CRITERIOS DE ACEPTACIÓN

- Mostrar los campos de registro e inicio de sesión acordados.
- Utilizar los componentes y estilos compartidos, con el verde como color principal.
- Identificar claramente los campos obligatorios y sus errores.
- Conectar el formulario de registro con la API de la tarea 20.
- Conectar el formulario de login con la API de la tarea 21.
- Mostrar estados de carga y evitar envíos repetidos mientras se procesa una petición.
- Mostrar mensajes claros cuando los datos sean inválidos, el email esté registrado o las credenciales sean incorrectas.
- Actualizar el estado de autenticación tras un registro o login correcto.
- Redirigir a la página principal después de acceder correctamente.
- No guardar la contraseña para reutilizarla posteriormente.
- Permitir utilizar los formularios con teclado y en móvil y escritorio.
- Incluir pruebas de validación, envío, errores y navegación tras el acceso.
- Funcionar integrada con la API real y superar las comprobaciones de CI.

## Notes

Aplicar `commit-ai-change` al terminar. No publicar ni abrir PR sin petición.
Conservar cambios ajenos a la tarea. Aclaración del usuario: «siempre que veas conflictos como este, prioriza los cambios que vengan de fuera y descarta los locales. sigue desarrollando».
Git no admite espacios: usar `register/login-front-end`.

## Implementación y validación

Formularios accesibles con tokens verdes, validación acorde con AuthService,
mensajes por código de API, bloqueo de envíos repetidos y limpieza de contraseñas.
Integración con cookies y CSRF, restauración de sesión, cierre de sesión,
comprobación de caducidad al recuperar foco y navegación al catálogo tras acceso.
Guía: `docs/AUTH_FORMS.md`.

- Main actualizada mediante pull; conflictos de documentación de la tarea 4
  resueltos con las versiones remotas. Cambio local en vars.py preservado.
- TypeScript, build Vite, ESLint y formato Prettier correctos.
- Jest: 9 suites, 52 pruebas y un snapshot; cobertura de líneas 96,86 %,
  ramas 96,64 %. Se conservan los umbrales existentes.
- Playwright: 15 pruebas completas correctas contra Spring real con H2 aislada,
  incluidos registro, login, email duplicado, credenciales incorrectas,
  cookies/CSRF, persistencia de sesión al recargar, teclado y vistas 320/1440 px.
  Pruebas de autenticación repetidas tras el ajuste de errores al editar.
- Ajuste exclusivo de fixture H2: adelantar la identidad de users después de
  insertar el usuario de muestra con ID explícito.
- Maven clean verify: 142 pruebas reportadas, 122 ejecutadas y 20 omitidas
  (PostgreSQL/almacén local opcionales), cero fallos; JaCoCo correcto.
- Los 17 pares de contraste existentes pasan. Capturas de móvil y escritorio
  revisadas visualmente; no se afirma una certificación de accesibilidad.
- No se ha ejecutado GitHub Actions ni PostgreSQL en esta tarea.
