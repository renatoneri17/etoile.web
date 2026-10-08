# Fichas estáticas de Étoile

Requiere Node.js 18 o posterior. No requiere instalar dependencias.

Desde la raíz del repositorio, después de actualizar `catalog-data.js` y añadir sus fotografías:

```sh
node scripts/generate-product-pages.mjs
node --test scripts/generate-product-pages.test.mjs
```

El generador utiliza la validación existente de `catalog-core.js`. Solo publica registros con `status: "published"` y `verified: true`. Detiene la generación si hay identificadores duplicados, datos inválidos o imágenes ausentes. No modifica datos, imágenes, filtros ni mensajes de WhatsApp.

Genera `productos/<id>/index.html`, `sitemap.xml`, `robots.txt`, `site-config.js` y el manifiesto `scripts/generated-product-pages.json`. Actualiza exclusivamente el SEO y la inclusión de la configuración en la portada. Los HTML contienen la ficha completa sin JavaScript; las fotos adicionales y su ampliación funcionan mediante enlaces normales.

`site-config.json` es la única configuración de URL pública. Para migrar a un dominio propio, cambiar `baseUrl` (HTTPS y barra final), volver a generar y publicar todos los cambios. `homeImage` identifica una fotografía existente para compartir la portada.

Las páginas retiradas que pertenecen al manifiesto se copian primero a `.generated-page-backups/` y después se retiran de la carpeta pública. El respaldo queda excluido de Git. Una carpeta ajena al manifiesto detiene el proceso para evitar eliminar contenido desconocido.

Publicación: confirmar que las verificaciones pasan, incluir los archivos generados en una rama y abrir un pull request hacia `main`. Al fusionarlo, GitHub Pages publicará desde `main`. Las URL nuevas no están disponibles en producción hasta esa publicación. Las rutas antiguas `#producto/<id>` siguen funcionando, pero las tarjetas nuevas apuntan a las páginas estáticas.

El JSON-LD no incluye ofertas, importes ni disponibilidad. La inclusión en buscadores depende del rastreo de cada buscador; no se promete indexación inmediata ni resultados enriquecidos con precios.
