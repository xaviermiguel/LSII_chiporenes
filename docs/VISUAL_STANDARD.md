# Estándar visual de ProTube — tarea 15

Guía compartida para mantener el catálogo, la reproducción y las próximas pantallas coherentes. Fuente de verdad: `frontend/src/styles/tokens.css`; aplicación: `frontend/src/App.css`. No introduce una librería de componentes ni cambia los contratos de la API.

## Revisión del punto de partida

Antes de implementar se revisaron las PR #7 (reproducción y comentarios), #8 (pruebas) y #9 (catálogo paginado), todas integradas en `main`. La PR #10 de Compose permanece abierta y no forma parte de esta tarea. Rama de trabajo: `visual-standard`, creada desde `origin/main`.

| Inconsistencia detectada | Regla aplicada |
| --- | --- |
| Cabecera usada como contenedor de toda la aplicación | Cabecera común, navegación y un `main` independiente con enlace para saltar al contenido |
| Reglas duplicadas de `.App-header` y `.App-logo` | Una sola regla por componente; logotipo compacto y jerarquía estable |
| Fondo oscuro del prototipo y colores de tarjetas, etiquetas y comentarios distintos | Fondo neutro claro, superficies blancas, verde semántico común |
| Anchuras independientes de catálogo y reproductor; tamaño de vídeo inline | Contenedor común y variante de lectura para reproducción; reproductor fluido 16:9 |
| Botones del navegador sin estados comunes | `.button`, `.button-secondary` y `.video-card` con hover, activo, deshabilitado y foco |
| Estados sin presentación consistente y carga del detalle sin anuncio | Mensajes comunes; `role="status"` en carga y `role="alert"` para errores |
| Sin guía de contraste, escalas ni revisión responsive repetible | Tokens, comprobación automática de contraste y pruebas de navegador |

Los componentes `TestLink`, `TestLinkPro` y `VideoGrid` son ejemplos no montados en las pantallas actuales; no se les añade funcionalidad ni se sustituye el catálogo existente.

## Paleta semántica

| Uso | Token | Valor |
| --- | --- | --- |
| Acción principal y enlaces | `--color-primary` | `#166344` |
| Hover / pulsado | `--color-primary-hover` / `--color-primary-active` | `#104c34` / `#0b3927` |
| Verde suave, etiquetas | `--color-primary-soft` | `#e7f3ec` |
| Fondo / superficie / superficie secundaria | `--color-canvas` / `--color-surface` / `--color-surface-muted` | `#f6f8f5` / `#ffffff` / `#eef2ed` |
| Texto / texto secundario | `--color-text` / `--color-text-muted` | `#182a22` / `#52635a` |
| Separadores decorativos / borde de control | `--color-border` / `--color-control-border` | `#d8e1d9` / `#718377` |
| Error / fondo | `--color-error` / `--color-error-soft` | `#9f2525` / `#fff0ee` |
| Éxito / fondo | `--color-success` / `--color-success-soft` | `#166344` / `#e7f3ec` |
| Aviso / fondo | `--color-warning` / `--color-warning-soft` | `#795000` / `#fff6dc` |
| Información / fondo | `--color-info` / `--color-info-soft` | `#255784` / `#edf4fb` |

Usar nombres semánticos, no repetir hexadecimales en componentes. Los colores originales del logotipo se conservan como identidad existente; las acciones y el sistema visual utilizan verde. Las miniaturas proceden de la API, no se recolorean. Los controles nativos de vídeo mantienen la apariencia y accesibilidad del navegador.

## Tipografía, medidas y adaptación

- Fuente local `--font-body`: Segoe UI y alternativas del sistema; no requiere descargas externas.
- Texto base 1rem con interlineado 1,6. Texto secundario 0,875rem. Títulos con escala de 1,125 a 2,75rem; `--text-title` crece de forma fluida. No usar `vmin` para el cuerpo de texto.
- Escala de espacios: `--space-1` a `--space-8` = 4, 8, 12, 16, 24, 32, 48 y 64px a tamaño raíz de 16px. Elegir de esta escala en vez de introducir márgenes aislados.
- Radios: `--radius-sm` 8px, `--radius-md` 14px, `--radius-lg` 20px y `--radius-pill` para etiquetas. Bordes y sombras también son tokens.
- `.app-container`: ancho fluido, máximo `--content-max` de 76rem, márgenes laterales entre 1 y 3rem. No usar `.container` de Bootstrap para nuevas pantallas porque impone otra escala de anchuras.
- `.video-detail`: máximo de lectura `--reading-max` de 60rem, dentro del mismo contenedor.
- Cuadrícula: columnas automáticas con mínimo `--card-min` de 15rem, que se reduce al ancho disponible en pantallas más estrechas. No fijar un número de columnas ni alturas al texto de tarjetas.
- Miniaturas y reproductor 16:9. Textos, descripciones y comentarios permiten salto de línea; los títulos largos no ensanchan la página.
- Punto de adaptación de 40rem (640px a tamaño raíz normal): oculta solo la frase decorativa de la cabecera, reduce espacios y hace que la acción del pie ocupe el ancho disponible. Las funciones siguen visibles. CSS no permite variables de `:root` en consultas `@media`; este umbral se mantiene documentado junto a la regla.
- Objetivo mínimo de área de controles 44px mediante `--control-min`; no usar iconos diminutos como únicas acciones.

## Componentes y ejemplos

El estilo se comparte mediante clases reutilizables; mantener elementos HTML nativos y nombres accesibles.

```tsx
<button className="button" disabled={loading} onClick={loadMore}>
  {loading ? 'Cargando más vídeos...' : 'Cargar más'}
</button>
<button className="button button-secondary" onClick={onBack}>
  Volver al catálogo
</button>
<p className="status-message" role="status">Cargando vídeos...</p>
<p className="status-message status-error" role="alert">No se pudo cargar el vídeo.</p>
```

- Cabecera `.site-header`, identidad `.brand`, navegación `.header-nav` y enlace `.nav-link`. Sin controles de búsqueda ni sesión ficticios.
- Tarjetas `.video-card`: un único botón accesible por título, imagen decorativa `alt=""`, título y autor reales, indicación de reproducción. No anidar enlaces o botones dentro de otro botón.
- Paneles `.detail-section`, descripción `.video-description`, etiquetas `.video-tags` / `.tag` y comentarios `.video-comments`.
- Mensajes `.status-message`: variantes `.status-error`, `.status-success`, `.status-warning` y `.status-info`. Acompañar el color de texto explícito; un cambio de color por sí solo no comunica el estado.
- Carga inicial, catálogo vacío, error inicial y error de página adicional siguen siendo estados distintos. El error adicional mantiene los resultados y el reintento existentes.
- La reproducción conserva `controls`, `preload="metadata"`, origen de medios y gestión de error. Las fechas de comentarios utilizan `<time dateTime>`.

## Interacción y contraste

Hover cambia el color o el borde, activo usa la variante oscura y las tarjetas vuelven a su posición al pulsar. El foco de teclado utiliza un contorno sólido de 3px separado 3px del control; no eliminarlo. El estado deshabilitado mantiene texto legible, usa `disabled` real y bloquea peticiones duplicadas como antes. Las transiciones se desactivan con `prefers-reduced-motion`.

Objetivos basados en las explicaciones oficiales de W3C: [contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) mínimo 4,5:1 y [contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) mínimo 3:1 para señales de control/foco. Se comparan los valores sin redondear. Esto verifica las parejas de la paleta, no constituye una auditoría completa de accesibilidad.

| Pareja comprobada | Contraste aproximado |
| --- | --- |
| Texto sobre blanco | 15,07:1 |
| Texto secundario sobre blanco / lienzo | 6,38:1 / 5,97:1 |
| Blanco sobre verde normal / hover / activo | 7,24:1 / 9,97:1 / 12,89:1 |
| Verde sobre verde suave | 6,35:1 |
| Error / éxito / aviso / información sobre su fondo | 6,85:1 / 6,35:1 / 6,58:1 / 6,82:1 |
| Contorno de foco sobre el lienzo | 6,78:1 |
| Borde de control sobre blanco | 4,03:1 |

Desde `frontend/`: `npm run test:contrast`. El script lee los tokens reales, calcula luminancia relativa sRGB y falla si una pareja baja del mínimo. CI ejecuta esta comprobación. El borde claro decorativo no se utiliza como único indicador del control: los botones tienen texto o el icono de reproducción con contraste suficiente.

## Verificación y revisión del equipo

Desde `frontend/`:

```sh
npm run build
npm run lint
npm run test:ci
npm run test:contrast
npm run test:e2e
```

Para equipos con los puertos predeterminados ocupados, en PowerShell:

```powershell
$env:E2E_API_PORT = '18085'
$env:E2E_WEB_PORT = '15175'
npm run test:e2e
```

Playwright utiliza un backend H2 aislado; no accede al PostgreSQL ni a los vídeos del equipo. La suite visual comprueba 320, 390, 768 y 1440px, ausencia de desbordamiento horizontal, enlace de salto, foco visible, detalle, comentarios y vuelta al catálogo. Las capturas se generan en `frontend/test-results/visual-standard-*/`. Las miniaturas ilustradas de las capturas son fixtures explícitas de la prueba, no datos añadidos al producto. La prueba de reproducción genera un WebM válido y silencioso en Chromium para comprobar el reproductor a 390 y 1440px; no certifica todos los formatos o el despliegue Docker.

### Revisión con otro miembro — pendiente

El usuario ha solicitado dejar la revisión conjunta pendiente. La revisión automatizada y la inspección de capturas no la sustituyen.

- Miembro revisor: pendiente.
- Fecha y dispositivos/navegadores: pendiente.
- [ ] Revisar catálogo en móvil y escritorio; títulos largos, miniaturas, carga adicional y final de resultados.
- [ ] Revisar reproducción real, descripción, etiquetas, comentarios y ausencia de comentarios.
- [ ] Probar Tab, Enter, enlace de salto, foco y vuelta al catálogo.
- [ ] Revisar cargas, errores/reintento, pulsado, deshabilitado y legibilidad.
- [ ] Confirmar espaciados y anchura; registrar ajustes acordados y aprobación.

### Resultado de la revisión automatizada (25/10/2026)

26 pruebas Jest y 12 comprobaciones Playwright correctas; TypeScript, compilación Vite, ESLint y formato correctos. Cobertura de líneas del frontend: 95,19 %. Las 17 parejas de contraste verificadas superan sus mínimos. Se inspeccionaron las capturas de catálogo y detalle en móvil y escritorio. La revisión conjunta anterior sigue pendiente y no se marca como aprobada por estos resultados.
