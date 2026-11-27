# VÉRTICE Technology · V1-Landing

Landing estática de la marca ficticia VÉRTICE Technology. HTML semántico, CSS con BEM y JavaScript nativo para el menú móvil y la cotización demostrativa.

La página puede abrirse directamente desde `index.html`. Para verla con las tipografías de marca y repetir las pruebas, ejecuta en este directorio:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

La navegación funciona sin JavaScript. El formulario queda desactivado sin JavaScript. Al validarlo con JavaScript, borra los valores de ejemplo de la interfaz y confirma que no los envió ni los guardó. No hay servicios externos en ejecución.

Las seis fotografías y la imagen Open Graph proceden del paquete aprobado. Space Grotesk e Inter se sirven en archivos WOFF2 locales con las licencias SIL OFL 1.1 en `assets/fonts/`. En las pruebas con Chromium 157 ambas fuentes también cargaron al abrir la página vía `file://`. La hoja conserva fuentes del sistema como alternativa. Antes de publicar, actualiza `og:image` a una URL absoluta del dominio autorizado y verifica la vista previa social.
