# Listado público de vídeos

`GET /api/videos?page=0&size=12` consulta `VideoRepository` sobre la base configurada
(PostgreSQL con el perfil Spring `prod`). No lee los JSON ni necesita importar de nuevo.
Reutiliza el contrato de [sprint1-api.md](sprint1-api.md).

```json
{
  "items": [{"id": 42, "title": "Vídeo", "user": "Autor", "duration": 72.25, "thumbnailUrl": "/media/8701.webp"}],
  "page": 0,
  "size": 12,
  "hasNext": false
}
```

`page` empieza en cero y por defecto es 0; `size` es positivo y por defecto 12.
El máximo técnico de `size` es 2147483646: Slice solicita un registro adicional.
Valores negativos, cero para size, texto o enteros fuera del rango permitido
devuelven `400` con `code: INVALID_PAGINATION` y `message`.

La consulta usa `PageRequest` y `Slice`: la base aplica el límite y el desplazamiento;
no se carga el catálogo entero ni se cuenta el total. Ordena por ID ascendente,
único e inmutable. `hasNext` indica si existe otro bloque; para continuar se solicita
`page + 1` con el mismo `size`. El catálogo vacío y las páginas posteriores al final
devuelven `200`, `items: []`, `hasNext: false`.
La paginación por desplazamiento no ofrece una instantánea frente a borrados
concurrentes; el orden evita inconsistencias por empates en títulos o fechas.

La URL de miniatura se genera desde la ruta persistida, codificada para URL,
utilizando el mismo método del detalle. No se exponen entidades, credenciales,
rutas internas ni metadatos de origen. `user` es el nombre público del propietario
o el autor externo; `duration` está en segundos y puede ser null.

El backend actual no incluye Spring Security ni filtros de autenticación. El GET
se consulta sin sesión ni cabeceras de autorización; no se modifica la seguridad
de ninguna otra ruta.

Este contrato sustituye el antiguo array de títulos. El listado de React utiliza
`useAllVideos` para consultar la API real y mostrar título y miniatura. Resuelve
las URLs contra el dominio de medios de `Env.ts`, también cuando ese dominio es
relativo en producción. Solicita la página 0 con size=12 y permite cargar las
siguientes con «Cargar más», conservando los resultados y deduplicando por ID.
Bloquea peticiones simultáneas y cancela la petición pendiente al salir del listado.

Se muestran los estados de carga inicial, catálogo vacío y error. Un error de
carga adicional conserva los vídeos visibles y permite reintentar la misma página.
Al recibir hasNext=false se retira el botón y se indica «No hay más vídeos»;
si el catálogo está vacío se muestra «No hay vídeos disponibles».

La selección abre el componente `VideoDetail` con el ID persistido, reutilizando
la navegación por estado de `App`. No hay router ni cambio de URL; «Volver al
catálogo» regresa al listado. El catálogo no exige sesión. La implementación del
detalle y el servicio de archivos permanecen disponibles.

## Validación

Desde `backend/`, Java 21 y Maven:

```powershell
mvn test '-Dtest=VideoServiceTest,VideosControllerTest,VideoDetailIntegrationTest' '-Djacoco.skip=true'
mvn clean verify -Pcoverage
```

Las pruebas HTTP usan repositorios y servicio reales con una base H2 aislada,
inserciones transaccionales y archivos temporales. Cubren resúmenes persistidos,
orden, acceso anónimo, catálogo vacío, páginas sucesivas, ausencia de duplicados,
fin de resultados y parámetros inválidos. No acreditan ejecución en PostgreSQL.
Las pruebas PostgreSQL existentes mantienen sus interruptores opt-in documentados
en [CATALOG_PERSISTENCE.md](CATALOG_PERSISTENCE.md).
