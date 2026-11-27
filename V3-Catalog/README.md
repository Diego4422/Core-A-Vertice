# VÉRTICE Technology · V3-Catalog

Catálogo estático de portafolio con doce productos ficticios. Los precios están en soles. El formulario y el carrito son demostrativos. La interfaz no navega a WhatsApp ni transmite pedidos. El generador de URL demostrativa se prueba exclusivamente como función local.

## Abrir y verificar

Ejecuta estos comandos desde `V3-Catalog/`:

```sh
npm ci
npm run build
npm test
python3 -m http.server 8080 --bind 127.0.0.1
```

Abre [http://127.0.0.1:8080/](http://127.0.0.1:8080/). El HTML y el CSS ya compilado pueden servirse directamente por HTTP sin Node en el servidor. HTTP es necesario para los módulos y la petición JSON. Por `file://` el menú, los doce productos y sus precios siguen disponibles. El buscador, el carrito y los controles que dependen del módulo quedan desactivados si el navegador lo bloquea.

## Cambiar el catálogo

V3 valida exactamente doce productos, tres por cada categoría. Para editar las fichas dentro de ese alcance, cambia `data/productos.json`. `npm run sync:catalog` valida las fichas, confirma que existen las fotos y regenera el respaldo HTML. `npm run build:css` compila el CSS. `npm run build` ejecuta ambas tareas en ese orden. En ejecución, un error de red, de HTTP o de validación activa el respaldo, con búsqueda y carrito disponibles.

Para ampliar la colección en el futuro, ajusta primero los límites de `validateCatalog()` y las pruebas asociadas. Si cambia la clasificación, actualiza también las categorías válidas y los filtros de la página. Después actualiza el JSON y las fotos, ejecuta `npm run build` y `npm test` y verifica el respaldo con el JSON bloqueado y con JavaScript desactivado. Las fichas HTML se regeneran desde el JSON.

El carrito guarda solo IDs y cantidades válidas en `vertice_cart_v1`. Los precios y totales se reconstruyen en céntimos enteros desde el catálogo validado. El tema manual usa `vertice_theme_v1`. Cuando el almacenamiento está bloqueado las selecciones siguen disponibles durante la sesión de página. Si el portapapeles falla, abre y selecciona el resumen para su copia manual.

Antes de publicar, actualiza `og:image` con la URL absoluta del dominio autorizado.
