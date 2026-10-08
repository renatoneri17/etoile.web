(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  const heroCopy = document.querySelector('.hero-copy');

  // Decorative vector artwork stays outside the reading and focus order.
  if (heroCopy) {
    const orbit = document.createElement('div');
    orbit.className = 'hero-orbit';
    orbit.setAttribute('aria-hidden', 'true');
    orbit.innerHTML = '<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><g class="orbit-path" stroke="currentColor" stroke-width=".6"><ellipse cx="60" cy="60" rx="53" ry="22" opacity=".5"/><ellipse cx="60" cy="60" rx="53" ry="22" transform="rotate(60 60 60)" opacity=".35"/><ellipse cx="60" cy="60" rx="53" ry="22" transform="rotate(120 60 60)" opacity=".35"/><circle cx="113" cy="60" r="2.3" fill="currentColor" stroke="none"/></g><path class="orbit-star" d="M60 34L63.8 55.8L84 60L63.8 64.2L60 86L56.2 64.2L36 60L56.2 55.8Z" fill="currentColor"/></svg>';
    heroCopy.append(orbit);
    if ('IntersectionObserver' in window) {
      const orbitObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => orbit.classList.toggle('is-in-view', entry.isIntersecting));
      });
      orbitObserver.observe(heroCopy);
    } else orbit.classList.add('is-in-view');
  }

  // Keep offscreen galleries idle without adding controls over the photos.
  if ('IntersectionObserver' in window) {
    const viewportObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.dispatchEvent(new CustomEvent('etoile:carousel-visibility', {detail: {visible: entry.isIntersecting}})));
    }, {threshold: 0.05});
    document.querySelectorAll('.hero-carousel').forEach(carousel => viewportObserver.observe(carousel));
  }

  // Start entrances only when visible. No CSS class ever hides waiting content.
  if ('IntersectionObserver' in window && typeof Element.prototype.animate === 'function') {
    const targets = document.querySelectorAll('.hero-copy > :not(.hero-orbit), .hero-photo, .section-heading, .collection-grid article, .advice-heading > .eyebrow, .advice-heading > h2, .product-editorial figure, .visit > div');
    const entranceObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entranceObserver.unobserve(entry.target);
        if (reduced.matches) return;
        const animation = entry.target.animate(
          [{opacity: 0, transform: 'translateY(18px)'}, {opacity: 1, transform: 'translateY(0)'}],
          {duration: 850, easing: 'cubic-bezier(.22,1,.36,1)'}
        );
        animations.add(animation);
        animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      });
    }, {threshold: 0.08});
    targets.forEach(target => entranceObserver.observe(target));
  }

  function syncVisibility() {
    document.body.classList.toggle('motion-document-hidden', document.hidden);
    if (document.hidden || reduced.matches) {
      animations.forEach(animation => animation.cancel());
      animations.clear();
    }
  }
  document.addEventListener('visibilitychange', syncVisibility);
  document.addEventListener('etoile:viewer-state', syncVisibility);
  reduced.addEventListener('change', syncVisibility);
  window.addEventListener('pageshow', syncVisibility);
  syncVisibility();
})();
