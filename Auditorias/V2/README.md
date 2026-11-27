# Evidencias de V2 · Orden 007

Lighthouse 13.6.0 en Chromium 157, servido por HTTP local con tema claro.

| Perfil | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Móvil](lighthouse-movil.report.html) | 96 | 100 | 100 | 100 | 2,78 s | 0,0000 |
| [Escritorio](lighthouse-escritorio.report.html) | 100 | 100 | 100 | 100 | 0,70 s | 0,0004 |

- Capturas de página completa en tema claro ([375 px](claro-375.png), [1440 px](claro-1440.png)) y oscuro ([375 px](oscuro-375.png), [1440 px](oscuro-1440.png)).
- [Compilación reproducible](compilacion.json) y [validación HTML](validacion-html.json).
- [Regresión funcional y contraste](pruebas-funcionales.json). Incluye navegación, recarga del tema, validación, ausencia de solicitudes del formulario y degradación sin JavaScript.
- [Axe](axe.json) en ambos temas, con el menú móvil abierto y con el formulario de escritorio en error.
- Las pruebas de navegador, Axe y los perfiles Lighthouse se ejecutaron de forma secuencial.
