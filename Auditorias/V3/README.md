# Evidencias de V3 · Orden 011

Lighthouse 13.6.0 en Chromium 157 por HTTP local.

| Perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Móvil](lighthouse-movil.report.html) | 90 | 100 | 100 | 100 | 3,15 s | 0,108 |
| [Escritorio](lighthouse-escritorio.report.html) | 100 | 100 | 100 | 100 | 0,72 s | 0,002 |

| Capturas | Móvil 375 px | Escritorio 1440 px |
| --- | --- | --- |
| Catálogo, claro | [PNG](catalogo-claro-375.png) | [PNG](catalogo-claro-1440.png) |
| Carrito abierto, claro | [PNG](carrito-claro-375.png) | [PNG](carrito-claro-1440.png) |
| Catálogo, oscuro | [PNG](catalogo-oscuro-375.png) | [PNG](catalogo-oscuro-1440.png) |
| Carrito abierto, oscuro | [PNG](carrito-oscuro-375.png) | [PNG](carrito-oscuro-1440.png) |

- [Compilación reproducible](compilacion.json), [13 pruebas unitarias](node-test.txt) y [validación HTML](validacion-html.json).
- [Regresión funcional](pruebas-funcionales.json). Incluye rutas HTTP, filtros, zoom, foco, portapapeles, persistencia y recuperación ante HTTP 404/500, JSON roto y esquema inválido.
- [Axe](axe.json) en ambos temas, con catálogo y carrito abierto.
- La prueba de navegador se ejecutó solo en Chromium. El servidor de pruebas expone las variantes de fallo únicamente en loopback.

## Repetir la prueba funcional

Desde la raíz del ZIP con Chromium y ChromeDriver instalados, inicia el servidor y ChromeDriver en terminales independientes. Ejecuta la prueba funcional y Axe de forma secuencial.

```sh
python3 -B Auditorias/V3/servidor-pruebas.py
chromedriver --port=9518 --allowed-ips=127.0.0.1
python3 -B Auditorias/V3/qa-chromium.py funcional
AXE_JS=/ruta/a/axe.min.js python3 -B Auditorias/V3/qa-chromium.py axe
```

La suite funcional usa solo la biblioteca estándar de Python. Axe se ejecuta con una copia local de axe-core. La variable opcional `VERTICE_IMAGENES_ORIGINALES` permite cotejar el paquete WebP aprobado.
