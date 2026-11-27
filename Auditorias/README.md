# Evidencias V1 · Orden 005

Lighthouse 13.6.0 sobre el servidor HTTP local de V1. Referencia `5e6594a293cbfa8205b0d5ecc076477f4e32a986`.

| Perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Móvil](lighthouse-movil.html) | 96 → 96 | 100 → 100 | 100 → 100 | 100 → 100 | 2,78 → 2,70 s | 0,0009 |
| [Escritorio](lighthouse-escritorio.html) | 100 → 100 | 100 → 100 | 100 → 100 | 100 → 100 | 0,66 → 0,66 s | 0,0025 |

- La hoja de fuentes pasó de 94 423 B a 358 B y ambos WOFF2 son idénticos a los aprobados.
- El primer pintado móvil pasó de 1,50 s a 1,05 s. El LCP final de 2,70 s quedó por encima de la meta deseable de 2,50 s.
- Capturas completas de Chromium en [375 px](captura-375.png) y [1440 px](captura-1440.png). Ambas coinciden píxel a píxel con la referencia.
- [Pruebas funcionales](pruebas-funcionales.json) con teclado, zoom al 200 %, contraste, axe y fuentes por HTTP y `file://`.
- [Validación HTML](validacion-html.json) sin mensajes. Sintaxis JavaScript comprobada con `node --check V1-Landing/js/main.js`.
