# Evidencias V1

Lighthouse 13.6.0 sobre el servidor HTTP local de V1.

| Perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Móvil](lighthouse-movil.html) | 96 | 100 | 100 | 100 | 2,78 s | 0,0009 |
| [Escritorio](lighthouse-escritorio.html) | 100 | 100 | 100 | 100 | 0,66 s | 0,0025 |

- Capturas completas de Chromium en [375 px](captura-375.png) y [1440 px](captura-1440.png).
- [Pruebas funcionales](pruebas-funcionales.json) con rutas, teclado, formulario, contraste, axe y hashes de imágenes.
- [Validación de HTML](validacion-html.json) y sintaxis de JavaScript comprobada con `node --check V1-Landing/js/main.js`.
- Los resultados de accesibilidad corresponden a las comprobaciones ejecutadas.
