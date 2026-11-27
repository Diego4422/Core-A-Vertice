# Evidencias de cierre de V3 · Orden 013

Commit de referencia `01da1eda01d59a947db830728b5b582248436a70`. Pruebas secuenciales por HTTP local en Chromium 157.

## Estabilidad visual

Máximos por ancho en ambos temas. Cada versión tiene 48 mediciones con PerformanceObserver y caché desactivada, en carga normal, módulo demorado 850 ms y módulo más catálogo demorados (850 ms y 1200 ms). Se aplicaron las ventanas de sesión de CLS.

| Ancho (px) | CLS antes | CLS después |
| ---: | ---: | ---: |
| 320 | 0,321702 | 0,000000 |
| 375 | 0,108388 | 0,000000 |
| 412 | 0,108201 | 0,000000 |
| 768 | 0,054444 | 0,000000 |
| 1023 | 0,044184 | 0,000000 |
| 1024 | 0,017314 | 0,010753 |
| 1280 | 0,002456 | 0,000000 |
| 1440 | 0,002228 | 0,000000 |

[Mediciones antes](cls-antes.json) · [Mediciones después](cls-despues.json)

## Lighthouse 13.6.0

| Perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Móvil](lighthouse-movil.report.html) | 90 → 91 | 100 → 100 | 100 → 100 | 100 → 100 | 3,15 → 3,45 s | 0,108 → 0,000 |
| [Escritorio](lighthouse-escritorio.report.html) | 100 → 100 | 100 → 100 | 100 → 100 | 100 → 100 | 0,72 → 0,72 s | 0,002 → 0,000 |

| Capturas | Móvil 375 px | Escritorio 1440 px |
| --- | --- | --- |
| Catálogo, claro | [PNG](catalogo-claro-375.png) | [PNG](catalogo-claro-1440.png) |
| Carrito abierto, claro | [PNG](carrito-claro-375.png) | [PNG](carrito-claro-1440.png) |
| Catálogo, oscuro | [PNG](catalogo-oscuro-375.png) | [PNG](catalogo-oscuro-1440.png) |
| Carrito abierto, oscuro | [PNG](carrito-oscuro-375.png) | [PNG](carrito-oscuro-1440.png) |

- [Compilación reproducible](compilacion.json), [13 pruebas unitarias](node-test.txt) y [validación HTML](validacion-html.json) sin mensajes.
- [Regresión funcional](pruebas-funcionales.json) y [Axe](axe.json) en ocho estados. El menú funcionó cuando falló el módulo principal, cuando falló una importación y vía `file://`. Sin JavaScript, la navegación y las doce fichas permanecieron visibles.
- A 320 × 568 px con texto al 200 %, los enlaces que quedaban fuera de la vista son alcanzables y el título de Contacto queda visible. En 320 × 780, 1024 × 800 y 1280 × 800 la cabecera conserva su posición fija y los destinos son visibles.
- Las funciones y mediciones de navegador se comprobaron en Chromium. La interacción del catálogo y carrito requiere HTTP.

## Repetir las comprobaciones

Desde la raíz del ZIP, inicia cada servicio local en una terminal independiente. Después ejecuta las pruebas de forma secuencial.

```sh
python3 -B Auditorias/V3/servidor-pruebas.py
chromedriver --port=9518 --allowed-ips=127.0.0.1
python3 -B Auditorias/V3/cls-chromium.py despues
python3 -B Auditorias/V3/qa-chromium.py funcional
AXE_JS=/ruta/a/axe.min.js python3 -B Auditorias/V3/qa-chromium.py axe
```

Para repetir la línea base, extrae `index.html`, `css/styles.css` y `js/main.js` del commit de referencia manteniendo su estructura. Inicia el servidor con `VERTICE_BASE_DIR` apuntando a ese directorio y ejecuta `cls-chromium.py antes`. Los demás archivos se reutilizan desde V3 porque coinciden con la línea base.
