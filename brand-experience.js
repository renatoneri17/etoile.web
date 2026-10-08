/* One source of brand artwork for the preference form and the moving banner. */
(() => {
 'use strict';
 const header = document.querySelector('body > header');
 const source = document.getElementById('brands');
 if (!header || !source || document.querySelector('.brand-ribbon')) return;
 const labels = [...source.querySelectorAll('label.brand')].filter(label => label.querySelector('.brand-frame'));
 if (!labels.length) return;

 const ribbon = document.createElement('section');
 ribbon.className = 'brand-ribbon';
 ribbon.setAttribute('aria-labelledby', 'brand-ribbon-title');
 const heading = document.createElement('div');
 heading.className = 'brand-ribbon-heading';
 const title = document.createElement('h2');
 title.id = 'brand-ribbon-title';
 title.textContent = 'El universo de nuestras marcas';
 heading.append(title);

 const viewport = document.createElement('div');
 viewport.className = 'brand-ribbon-viewport';
 viewport.id = 'brand-ribbon-viewport';
 const track = document.createElement('div');
 track.className = 'brand-ribbon-track';
 track.style.setProperty('--brand-flow-duration', `${labels.length * 4}s`);
 const list = document.createElement('ul');
 list.className = 'brand-ribbon-list';
 list.setAttribute('aria-label', 'Marcas de Étoile');
 labels.forEach(label => {
  const item = document.createElement('li');
  const name = label.querySelector('input')?.value || label.title;
  const artwork = label.querySelector('.brand-frame').cloneNode(true);
  artwork.setAttribute('aria-hidden', 'true');
  artwork.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  const accessibleName = document.createElement('span');
  accessibleName.className = 'sr-only';
  accessibleName.textContent = name;
  item.append(artwork, accessibleName);
  list.append(item);
 });
 const duplicate = list.cloneNode(true);
 duplicate.setAttribute('aria-hidden', 'true');
 duplicate.removeAttribute('aria-label');
 track.append(list, duplicate);
 viewport.append(track);
 ribbon.append(heading, viewport);
 header.after(ribbon);

 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 let hovered = false;
 let focusPaused = false;
 let inView = true;
 function sync() {
  const isStatic = reducedMotion.matches;
  ribbon.dataset.motion = isStatic ? 'static' : (hovered || focusPaused || document.hidden || !inView ? 'paused' : 'running');
  if (isStatic) {
   viewport.tabIndex = 0;
   viewport.setAttribute('aria-label', 'Marcas de Étoile. Deslizá horizontalmente para ver todas.');
  } else {
   viewport.removeAttribute('tabindex');
   viewport.removeAttribute('aria-label');
   viewport.scrollLeft = 0;
  }
 }
 viewport.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; sync(); } });
 viewport.addEventListener('pointerleave', () => { hovered = false; sync(); });
 ribbon.addEventListener('focusin', () => { focusPaused = true; sync(); });
 ribbon.addEventListener('focusout', () => queueMicrotask(() => {
  if (!ribbon.contains(document.activeElement)) focusPaused = false;
  sync();
 }));
 document.addEventListener('visibilitychange', sync);
 reducedMotion.addEventListener('change', sync);
 window.addEventListener('pageshow', sync);
 if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
   inView = entries[0].isIntersecting;
   sync();
  });
  observer.observe(ribbon);
 }
 sync();
})();
