# Evidencias de cierre de V2 · Orden 009

Lighthouse 13.6.0 en Chromium 157 por HTTP local con tema claro. Referencia `da97d687352446cbe2c02596ff79e1ad7b4393df`.

| Perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Móvil](lighthouse-movil.report.html) | 96 → 96 | 100 → 100 | 100 → 100 | 100 → 100 | 2,78 → 2,78 s |
| [Escritorio](lighthouse-escritorio.report.html) | 100 → 100 | 100 → 100 | 100 → 100 | 100 → 100 | 0,70 → 0,70 s |

- Capturas completas de tema claro ([375 px](claro-375.png), [1440 px](claro-1440.png)) y oscuro ([375 px](oscuro-375.png), [1440 px](oscuro-1440.png)). Las cuatro conservan la franja superior de 675 px píxel a píxel respecto al commit base.
- [Compilación reproducible](compilacion.json). CSS minificado de 25 052 a 26 451 B.
- [Regresión funcional](pruebas-funcionales.json) en seis anchos y texto al 100 %, 150 % y 200 % en ambos temas. En 320, 1024 y 1280 px con texto ampliado se comprobó el foco visible y la separación respecto a la cabecera.
- [Axe](axe.json) en ambos temas y [validación HTML](validacion-html.json) sin mensajes.
- Chromium ejecutó los controles vía `file://`. La precarga WOFF2 emitió avisos de CORS al abrir el archivo directamente. HTTP local cargó las fuentes correctamente.
