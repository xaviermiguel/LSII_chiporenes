# Formularios de registro y acceso

Desde la cabecera se accede a `#register` y `#login`. Se conserva la navegación
por estado del catálogo/detalle; los formularios usan el historial del navegador.
Tras acceder, la aplicación muestra el catálogo (`#contenido`), enfoca el contenido
y actualiza la cabecera con el nombre devuelto por la API.

El registro solicita `displayName`, `email`, `password` y `confirmPassword`.
El acceso solicita `email` y `password`. Todos son obligatorios. La validación
del registro refleja `AuthService`: nombre de hasta 30 puntos de código, email
de hasta 254 caracteres y contraseña de 8–72 caracteres ASCII imprimibles sin
espacios en los extremos. La contraseña de acceso se envía sin modificar.

Se reutilizan botones, mensajes y tokens del estándar verde. Los errores locales
enfocan el primer campo inválido; los errores de servidor se anuncian y enfocan.
Las entradas tienen etiquetas y descripciones asociadas. Durante el envío se
deshabilitan los campos y el botón, con bloqueo adicional de solicitudes repetidas.

## API y sesión

La URL base proviene de `VITE_API_DOMAIN` mediante `Env.ts`.
El backend debe permitir el origen exacto del frontend en
`pro_tube.auth.allowed-origins`; mantener el mismo hostname en ambos servicios
(por ejemplo, ambos `localhost`). No combinar `localhost` y `127.0.0.1`.

- `GET /api/auth/csrf` obtiene un token nuevo antes de cada mutación.
- `POST /api/auth/register` y `POST /api/auth/login` reciben JSON y la cabecera
  indicada por el endpoint CSRF.
- `GET /api/auth/me` restaura el usuario al cargar y comprueba la sesión al
  recuperar el foco de la ventana. Un 401 elimina el estado autenticado;
  un fallo de red no se interpreta como caducidad.
- `POST /api/auth/logout` cierra la sesión y vuelve al catálogo.

Las peticiones de autenticación incluyen cookies (`credentials: include`) y no
usan caché. El estado React contiene solo el usuario público. La aplicación no
guarda credenciales en localStorage/sessionStorage ni reutiliza contraseñas; las
entradas se limpian tras la respuesta o al abandonar el formulario. Los atributos
autocomplete permiten usar el gestor de contraseñas del navegador.

## Verificación

Desde `frontend`: `npm run build`, `npm run lint`, `npm run test:ci`,
`npm run test:contrast` y `npm run test:e2e`. Desde `backend`: `mvn clean verify`.

Jest cubre validación, contratos HTTP, errores, envíos repetidos, restauración,
caducidad, cierre de sesión y navegación después de registrarse o entrar.
Playwright ejecuta ambos flujos contra Spring real en el perfil E2E aislado
(H2 de pruebas), con cookies/CSRF, errores de email duplicado y credenciales,
recarga de sesión y teclado a 320 y 1440 px. Las capturas quedan en test-results.
El contador de identidad del usuario de muestra se adelanta tras su inserción
para permitir crear cuentas sin colisiones con su ID explícito.

Las pruebas E2E no modifican PostgreSQL ni datos de usuarios reales. La ejecución
de GitHub Actions requiere publicar la rama y abrir una PR.
