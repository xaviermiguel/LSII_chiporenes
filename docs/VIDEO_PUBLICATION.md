# Publicación de vídeos — US-06

Los usuarios autenticados acceden desde «Publicar vídeo» en la cabecera a
`#upload`. Se reutilizan `ProtectedRoute`, `SessionProvider`, el cliente
`request` con cookies/CSRF y las clases compartidas del estándar visual.
Los visitantes se redirigen a `#login`; tras autenticarse se mantiene la
navegación existente al catálogo, desde donde pueden regresar al formulario.

El formulario pide archivo MP4, título y descripción. Genera automáticamente
una miniatura WebP del primer fotograma mediante las APIs nativas del navegador,
sin convertir el vídeo ni añadir dependencias. El navegador debe poder
decodificar el MP4 y codificar WebP; si falla, se informa antes de publicar.
La URL local del archivo se libera y la preparación tiene un límite de 15 s.

## Contrato real

Los tags son opcionales y se introducen separados por comas. Se recortan espacios
exteriores y se omiten valores vacíos y duplicados exactos. Se envían como campos
multipart repetidos `tags`. El servidor también normaliza los valores y los guarda
en `source_metadata.tags`, como los vídeos importados; el detalle existente los
devuelve y muestra sin cambios de esquema. Omitir `tags` mantiene la compatibilidad
con clientes anteriores. El borrador conserva los tags tras errores y redirecciones.

`POST /api/videos`, `multipart/form-data` con los campos `title`, `description`,
`video` y `thumbnail`. Los cuatro son obligatorios. `thumbnail` es la imagen
generada, con nombre `thumbnail.webp`. El navegador establece el boundary;
no fijar manualmente Content-Type. La URL procede de `Env.ts` a través del
cliente autenticado. Se obtiene un CSRF nuevo antes de la escritura y no se
repite automáticamente una petición fallida.

`application.properties` limita cada archivo y la petición completa a `100MB`
de Spring, equivalentes a 104 857 600 bytes (100 MiB). La petición incluye ambos
archivos, textos y cabeceras multipart. El cliente comprueba archivo no vacío,
tamaño individual y suma de contenido; el servidor aplica el límite definitivo
incluido el overhead multipart. Por ello un vídeo del tamaño máximo puede
requerir reducirse para dejar espacio al resto de la petición.

`VideoUploadService` comprueba presencia y contenido no vacío de los cuatro
campos. Guarda los archivos con extensiones `.mp4` y `.webp`, sin transcodificar
ni validar MIME, extensión o códec. La interfaz ofrece MP4 y genera WebP para
ser compatible con ese almacenamiento; no se atribuye al backend una lista de
formatos validados que no implementa. El título se limita a 255 unidades UTF-16
para respetar la columna persistida `varchar(255)`; la descripción no tiene
límite de longitud adicional en el contrato. Los textos no se recortan al enviar.

Éxito: `201 Created`, `Location: /api/videos/{id}` y cuerpo
`{id, title, description}`. La confirmación utiliza el título y el ID devueltos.
«Ver vídeo publicado» abre el detalle existente por estado; no se crea una ruta
de detalle nueva. «Ir al catálogo» vuelve a montar el listado y consulta de nuevo
la API, incluyendo las páginas adicionales si son necesarias.

## Estados y errores

Durante preparación y subida se anuncian el estado y `aria-busy`; se deshabilitan
los controles y se bloquean envíos repetidos antes del siguiente render.
Labels, descripciones de error, foco del primer campo inválido, alerta de servidor
y confirmación enfocada siguen los patrones del proyecto. El textarea extiende
el estilo compartido de inputs y el layout utiliza los tokens existentes.

- `400 INVALID_VIDEO_UPLOAD`: se muestra el mensaje de validación del backend.
- `401`: el contexto elimina la sesión y la ruta protegida redirige al login.
- `403 INVALID_CSRF_TOKEN`: el cliente existente comprueba la sesión; si caducó,
  aplica el mismo flujo de login; si sigue válida, permite reintentar sin repetir
  automáticamente la publicación. Otros 403 informan de falta de permiso.
- `413`: se explica el límite de la petición completa.
- Fallo de red: se indica revisar la conexión y el catálogo antes de reintentar,
  pues la pérdida de respuesta no prueba que el servidor no guardara el vídeo.
- `5xx`: mensaje de fallo de almacenamiento/publicación. El backend no distingue
  mediante un código propio los fallos de disco, base de datos y otros errores
  inesperados; el frontend no puede atribuir una causa más concreta.

Un error conserva título, descripción y el archivo mientras el formulario siga
montado. Si se abandona la pantalla, incluida la redirección por sesión caducada,
el borrador de texto se conserva en memoria de `App`. Al regresar se avisa de
que debe seleccionarse el archivo de nuevo. No se restaura programáticamente un
input file. Una recarga completa descarta el borrador; no se guarda en disco.

## Pruebas

Jest/Testing Library cubren campos, formatos/límites, validación, multipart real,
cookies/CSRF, bloqueo, confirmación por ID, errores, reintento y borrador tras
caducidad. Las pruebas de miniatura cubren generación, errores y liberación de URL.

Playwright publica MP4 reproducibles generados en Chromium contra Spring real
con H2 aislada. Comprueba miniatura decodificable, confirmación, presencia en el
catálogo, selección del ID, detalle y avance de reproducción a 320 y 1440 px,
además de tabulación, foco y ausencia de desbordamiento. Estas pruebas se ejecutan
después de las regresiones que dependen de las tres fixtures originales; eliminan
únicamente sus propios archivos UUID del almacén de pruebas. No acceden al
catálogo, almacén o PostgreSQL habitual del equipo.

Comandos desde `frontend`: `npm run build`, `npm run lint`, `npm run test:ci`,
`npm run test:contrast`, `npm run test:e2e` y `npx tsc -p tsconfig.e2e.json --noEmit`.
Desde `backend`: `mvn clean verify`. Las pruebas PostgreSQL opcionales y CI remoto
se comprueban por separado; las pruebas H2 no acreditan despliegue PostgreSQL.
