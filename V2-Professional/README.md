# VÉRTICE Technology · V2-Professional

Landing autónoma del bloque 2 (semanas 5–8). Incluye fichas comparativas, una sección editorial y un formulario demostrativo con avisos por campo.

El CSS minificado está incluido. Para probar la página con HTTP y las fuentes locales, abre una terminal en este directorio y ejecuta:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Para reproducir el CSS de Tailwind 4.3.5:

```sh
npm ci
npm run build:css
```

`npm run dev:css` recompila al editar HTML, CSS o JavaScript. Node y npm solo se usan para compilar.

Al cargar, la página usa el tema del sistema. El botón «Modo oscuro» permite cambiarlo durante la página actual. Al recargar se vuelve a consultar el sistema. Sin JavaScript queda el tema claro, los enlaces visibles y el formulario desactivado. La demostración usa datos de ejemplo y no transmite ni persiste valores.

Las fotografías aprobadas y las licencias de Inter y Space Grotesk están en `assets/`. Antes de publicar, actualiza `og:image` con la URL absoluta del dominio autorizado.
