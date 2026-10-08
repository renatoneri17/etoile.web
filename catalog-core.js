(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EtoileCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const categories = Object.freeze([
    Object.freeze({ id: 'lentes', label: 'Lentes' }),
    Object.freeze({ id: 'relojes', label: 'Relojes' }),
    Object.freeze({ id: 'carteras', label: 'Carteras' }),
    Object.freeze({ id: 'accesorios', label: 'Accesorios' })
  ]);
  const categoryIds = new Set(categories.map(category => category.id));
  const safeId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const safeImage = /^(?:assets|images\/productos)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp|avif)$/i;
  const forbiddenText = /[$€£¥₲]|\b(?:usd|pyg|eur|gbp|gs|us\s*\$|guaran[ií](?:es)?|d[oó]lar(?:es)?|euro(?:s)?|precio(?:s)?|price(?:s)?|currency|cuota(?:s)?|monto(?:s)?|presupuesto(?:s)?)\b/i;
  const unsafeText = /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
  const inventoryClaims = /\b(?:stock|disponibles?|disponibilidad|existencias)\b|\b\d+\s+unidades?\b/i;

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  }

  function textIsValid(value, optional) {
    return typeof value === 'string' && (optional || value.trim().length > 0) &&
      value.length <= 2400 && !unsafeText.test(value) && !forbiddenText.test(value) && !inventoryClaims.test(value);
  }

  // A publication record is deliberately narrower than the internal inventory.
  // Treat a missing verification decision as unverified, never as approval.
  function validate(record, settings) {
    const errors = [];
    if (!record || typeof record !== 'object' || Array.isArray(record)) return ['Registro inválido.'];
    if (record.status !== 'published') errors.push('La ficha no está publicada.');
    if (record.verified !== true) errors.push('Falta verificar la identidad, los datos y las fotografías.');
    if (typeof record.id !== 'string' || record.id.length > 80 || !safeId.test(record.id) || forbiddenText.test(record.id)) errors.push('Identificador inválido.');
    if (!categoryIds.has(record.category)) errors.push('Categoría inválida.');
    if (!textIsValid(record.brand, false)) errors.push('Marca inválida.');
    const model = record.model === undefined ? '' : record.model;
    const code = record.code === undefined ? '' : record.code;
    if (!textIsValid(model, true) || !textIsValid(code, true) || !(model.trim() || code.trim())) errors.push('Falta un modelo o código de fabricante verificado.');
    if (!textIsValid(record.description, false)) errors.push('Descripción inválida.');
    if (!Array.isArray(record.tags) || record.tags.some(tag => !textIsValid(tag, false))) errors.push('Etiquetas inválidas.');
    if (!Array.isArray(record.images) || !record.images.length || record.images.some(image =>
      !image || typeof image.src !== 'string' || !safeImage.test(image.src) || !textIsValid(image.alt, false) ||
      (image.thumbnail !== undefined && !safeImage.test(image.thumbnail)) ||
      ['width','height','thumbnailWidth'].some(key => image[key] !== undefined && (!Number.isInteger(image[key]) || image[key] < 1))
    )) errors.push('Fotografías inválidas.');
    return errors;
  }

  function toPublic(record) {
    return {
      id: record.id,
      category: record.category,
      brand: record.brand.trim(),
      model: (record.model || '').trim(),
      code: (record.code || '').trim(),
      description: record.description.trim(),
      images: record.images.map(image => {
        const result = { src: image.src, alt: image.alt.trim() };
        for (const key of ['thumbnail','width','height','thumbnailWidth']) if(image[key] !== undefined) result[key] = image[key];
        return result;
      }),
      tags: [...new Set(record.tags.map(tag => tag.trim()))],
      status: 'published',
      verified: true
    };
  }

  function compilePublication(records) {
    if (!Array.isArray(records)) throw new TypeError('El catálogo debe ser una lista.');
    const seen = new Set();
    const published = [];
    records.forEach((record, index) => {
      if (!record || record.status !== 'published') return;
      const errors = validate(record);
      if (seen.has(record.id)) errors.push('Identificador repetido.');
      if (errors.length) throw new Error('Ficha ' + (index + 1) + ': ' + errors.join(' '));
      seen.add(record.id);
      published.push(toPublic(record));
    });
    return published;
  }

  // Use the same rules in the browser; an invalid or draft record never leaks
  // into a filter, an individual page, a message, or a recommendation.
  function publicProducts(records) {
    if (!Array.isArray(records)) return [];
    const candidateIds = new Map();
    records.forEach(record => {
      if (record && record.status === 'published') candidateIds.set(record.id, (candidateIds.get(record.id) || 0) + 1);
    });
    return records.filter(record => validate(record).length === 0 && candidateIds.get(record.id) === 1).map(toPublic);
  }

  function filterProducts(records, preferences) {
    const prefs = preferences || {};
    const query = normalize(prefs.query);
    return publicProducts(records).filter(product => {
      if (prefs.category && product.category !== prefs.category) return false;
      if (prefs.brand && normalize(product.brand) !== normalize(prefs.brand)) return false;
      if (prefs.style && !product.tags.some(tag => normalize(tag) === normalize(prefs.style))) return false;
      if (query) {
        const searchable = normalize([product.id, product.brand, product.model, product.code, product.description, ...product.tags].join(' '));
        if (!query.split(/\s+/).every(part => searchable.includes(part))) return false;
      }
      return true;
    });
  }

  function options(records, key, category) {
    if (key !== 'brand' && key !== 'style' && key !== 'tags') return [];
    const products = filterProducts(records, { category: category || '' });
    const values = products.flatMap(product => key === 'brand' ? [product.brand] : product.tags);
    const unique = new Map();
    values.forEach(value => { if (!unique.has(normalize(value))) unique.set(normalize(value), value); });
    return [...unique.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }

  function recommend(records, preferences) {
    const prefs = preferences || {};
    if (!prefs.category) return [];
    return filterProducts(records, { category: prefs.category, brand: prefs.brand || '', style: prefs.style || '' });
  }

  function productMessage(product) {
    const record = publicProducts([product])[0];
    if (!record) throw new Error('La ficha no está verificada para consultas.');
    const name = record.brand + (record.model ? ' ' + record.model : '');
    const manufacturerCode = record.code ? ' Código y variante: ' + record.code + '.' : '';
    return 'Hola, me interesa ' + name + '.' + manufacturerCode + ' Referencia Étoile: ' + record.id + '. ¿Podrían darme más información sobre este producto?';
  }

  function whatsappUrl(text) {
    return 'https://wa.me/595985562593?text=' + encodeURIComponent(String(text || ''));
  }

  return Object.freeze({ categories, validate, compilePublication, publicProducts, filterProducts, options, recommend, productMessage, whatsappUrl });
});
