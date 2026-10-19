# Sprint 1 task 4: prepare video test data

**Approved on:** 2026-10-19
**Approved by:** Team approval confirmed by the user in this chat.
**Used for:** Task 4, videoGrabber data preparation and import using the existing persistence model.

## Prompt

# Tarea 4 — Sprint 1: Preparar los vídeos y los datos de prueba (ProTuve)

## 1. Contexto del proyecto

Estamos desarrollando **ProTuve**, una plataforma de vídeos similar a YouTube.

Tecnologías utilizadas:
- Backend: Java con Spring Boot.
- Frontend: TypeScript.
- Base de datos: PostgreSQL.
- Contenedores: Docker y Docker Compose.

Estamos trabajando en el **Sprint 1**, cuyo objetivo es permitir listar vídeos, cargar más resultados, reproducirlos y mostrar sus títulos, descripciones y comentarios, manteniendo la persistencia de los datos.

Mi responsabilidad es completar la **tarea 4: Preparar los vídeos y los datos de prueba**.

## 2. Enunciado oficial de la tarea 4

> Tener vídeos de videoGrabber con sus archivos, miniaturas y metadatos, usando el identificador del grupo. Preparar suficientes vídeos para comprobar la carga adicional, comentarios de prueba y un vídeo sin comentarios. Dejar una carga reproducible sin duplicados y el directorio de archivos correctamente configurado.

Dependencias: tarea 3, configuración de la persistencia del catálogo en PostgreSQL. Los archivos pueden generarse antes.

## 3. Estado actual

Ya hemos descargado los vídeos utilizando videoGrabber.

Los archivos se encuentran en:

`C:\ProTube\videos`

Cada vídeo tiene tres archivos asociados:

- `2.mp4`: archivo de vídeo.
- `2.webp`: miniatura.
- `2.json`: metadatos.

Y así sucesivamente para los demás identificadores.

Damos por supuesto que los archivos descargados están completos, son correctos y no existen duplicados entre ellos.

**No es necesario volver a descargar los vídeos ni ejecutar videoGrabber.**

Los archivos JSON contienen información como:

```json
{
  "id": 2,
  "width": 1920,
  "height": 1080,
  "duration": 72.0,
  "title": "Taylor Swift - Shake It Off",
  "user": "Taylor Swift",
  "timestamp": 1408396680,
  "meta": {
    "description": "Descripción del vídeo",
    "categories": ["Music"],
    "tags": ["Taylor", "Swift"],
    "view_count": 3736435244,
    "like_count": 14374076,
    "channel": "Taylor Swift",
    "channel_follower_count": 63500000,
    "comments": [
      {
        "text": "07.10.2026",
        "author": "tamdemu",
        "timestamp": 1791356400,
        "like_count": 1
      }
    ]
  }
}
```

Los comentarios están dentro de `meta.comments`.

Todavía no hemos implementado ni confirmado la importación de estos datos a PostgreSQL.

Tampoco sabemos si la tarea 3 está completamente terminada.

## 4. Tu misión

Analiza el repositorio actual y completa la tarea 4 del Sprint 1, respetando la arquitectura, las convenciones y el código existente.

### Fase A. Analizar el repositorio

Antes de modificar archivos:

1. Examina la estructura del proyecto.
2. Identifica las entidades, repositorios y servicios relacionados con vídeos y comentarios.
3. Comprueba cómo está configurada la conexión con PostgreSQL.
4. Identifica si existen migraciones, scripts de inicialización o mecanismos de carga de datos.
5. Comprueba cómo se configuran las rutas de almacenamiento.
6. Identifica qué partes de la tarea 4 ya están implementadas.

No dupliques funcionalidades existentes ni cambies innecesariamente la arquitectura.

Si la persistencia de la tarea 3 todavía no está disponible, identifica qué parte de la tarea 4 puedes implementar sin ella y explica qué queda bloqueado.

### Fase B. Preparar la importación de vídeos

Implementa un mecanismo que:

1. Lea los archivos `.json` del directorio de vídeos.
2. Extraiga los metadatos necesarios.
3. Relacione cada JSON con su `.mp4` y `.webp` mediante el identificador.
4. Adapte los datos al modelo existente de Spring Boot.
5. Guarde los registros en PostgreSQL mediante los componentes de persistencia existentes.
6. Mantenga correctamente las relaciones entre vídeos y comentarios.
7. Permita ejecutar la importación varias veces sin crear registros duplicados.

No asumas que todos los campos del JSON tienen que almacenarse: utiliza el contrato de datos y el esquema del proyecto.

Si necesitas una clave de origen para evitar duplicados, utiliza una estrategia estable compatible con el esquema existente.

### Fase C. Preparar los comentarios de prueba

Utiliza los comentarios existentes en los archivos JSON.

Asegúrate de que:

- Los comentarios pertenecen al vídeo correcto.
- Se conservan el texto, el autor y los campos compatibles con el modelo.
- Existe al menos un vídeo sin comentarios para comprobar ese caso.
- La importación repetida no duplica comentarios.

Si todos los vídeos contienen comentarios, prepara un caso de prueba sin comentarios de forma controlada, sin modificar innecesariamente los archivos originales.

### Fase D. Configurar el almacenamiento de archivos

Los vídeos y las miniaturas deben conservarse como archivos físicos.

PostgreSQL debe almacenar las referencias necesarias, no los archivos binarios completos.

Configura el directorio de almacenamiento para que:

- La aplicación pueda localizar los vídeos.
- La aplicación pueda localizar las miniaturas.
- La ruta sea configurable mediante propiedades o variables de entorno.
- No dependa de una ruta absoluta de Windows dentro del código Java.
- Sea compatible con el futuro arranque mediante Docker Compose.
- Los archivos puedan persistir al reiniciar los contenedores.

No implementes toda la tarea 11 de Docker Compose: limita los cambios a lo necesario para la tarea 4.

### Fase E. Automatizar la carga inicial

Prepara un procedimiento reproducible que permita cargar los datos de prueba sin introducirlos manualmente.

Requisitos:

- Poder repetir el proceso.
- Evitar duplicados en PostgreSQL.
- Evitar perder información existente.
- No borrar tablas ni reinicializar la base de datos de manera destructiva.
- No guardar contraseñas ni credenciales reales en el repositorio.
- Documentar cómo ejecutar la importación.

### Fase F. Añadir pruebas

Añade pruebas automatizadas, siguiendo las herramientas ya utilizadas en el proyecto, que comprueben:

1. Lectura correcta de los JSON.
2. Asociación correcta de `.json`, `.mp4` y `.webp`.
3. Extracción de metadatos.
4. Importación de comentarios.
5. Tratamiento de vídeos sin comentarios.
6. Ejecución repetida sin duplicados.
7. Configuración de las rutas de almacenamiento.

No inventes resultados de pruebas. Ejecuta las que permita el entorno e informa de las que no hayas podido ejecutar.

## 5. Restricciones importantes

- No modifiques funcionalidades ajenas a la tarea 4.
- No sobrescribas el trabajo de otros compañeros.
- No cambies el esquema de PostgreSQL sin justificarlo.
- No introduzcas credenciales en el código.
- No elimines ni modifiques los vídeos originales.
- No descargues nuevamente los vídeos.
- No presupongas que la tarea 3 está finalizada.
- No implementes las tareas 7, 9 u 11 completas, aunque dependan de estos datos.
- Respeta las reglas de Git, PR y uso de IA que estén documentadas en el repositorio.

## 6. Forma de trabajar

Quiero que trabajes por etapas.

**Primero:**
Analiza el repositorio y explícame qué existe, qué falta y qué archivos vas a modificar.

**Después:**
Implementa los cambios necesarios para completar la tarea 4, aprovechando el código existente.

**Finalmente:**
Ejecuta las comprobaciones disponibles y proporciona:

1. Resumen de los cambios realizados.
2. Lista de archivos creados o modificados.
3. Instrucciones para ejecutar la importación desde Windows.
4. Instrucciones para verificar los datos en PostgreSQL.
5. Resultados de las pruebas ejecutadas.
6. Problemas encontrados o dependencias pendientes.
7. Confirmación de qué criterios de la tarea 4 se han completado realmente.

## 7. Resultado esperado

La tarea estará completada cuando tengamos:

- Vídeos descargados y accesibles.
- Miniaturas asociadas correctamente.
- Metadatos preparados y persistidos.
- Comentarios de prueba disponibles.
- Al menos un vídeo sin comentarios.
- Una importación reproducible e idempotente.
- Rutas de almacenamiento configurables.
- Datos y archivos persistentes después de reiniciar.
- Pruebas que validen el comportamiento.

**Empieza analizando el repositorio. No inventes clases, tablas ni configuraciones que no hayas comprobado. Si falta una dependencia imprescindible, indícala antes de continuar.**

## Follow-up

ahora si he pulleado la tarea 3. el prompt esta aprobado


## Implemented scope

Repository inspection found SQL exports for videos/comments but only User persistence in Java. Prepared a standalone, deterministic manifest and tests while clarification about the missing catalog dependency is pending. No database import or schema changes. Validation: seven Python unittest tests passed; real store preparation produced 21 videos and 154 comments with source ID 0 empty only in the generated manifest. No original media or JSON modified.
