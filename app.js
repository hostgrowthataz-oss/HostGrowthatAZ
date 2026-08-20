/* Host Grow Your AZ — shared site behavior */
(function () {
  'use strict';

  /* ---------- Visitor analytics (Vercel Web Analytics) ----------
     Free, privacy-friendly page-view tracking. Requires Web Analytics to be
     turned on once in the Vercel project dashboard (Project > Analytics tab)
     — the script below is inert until that's switched on. Safe to load on
     every domain the site is served from; it silently no-ops if unreachable
     (e.g. on the pplx.app preview). */
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  (function () {
    var s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/insights/script.js';
    s.onerror = function () {}; // no-op if the endpoint isn't available on this host
    document.head.appendChild(s);
  })();

  /* ---------- Theme toggle ---------- */
  const root = document.documentElement;
  let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);

  function paintToggle(btn) {
    if (!btn) return;
    btn.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    btn.innerHTML =
      theme === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    const toggles = document.querySelectorAll('[data-theme-toggle]');
    toggles.forEach(function (btn) {
      paintToggle(btn);
      btn.addEventListener('click', function () {
        theme = theme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', theme);
        toggles.forEach(paintToggle);
      });
    });

    /* ---------- Mobile nav ---------- */
    const navToggle = document.querySelector('[data-nav-toggle]');
    const navLinks = document.querySelector('[data-nav-links]');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        const isOpen = navLinks.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
      navLinks.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          navLinks.classList.remove('is-open');
          navToggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });
    }

    /* ---------- Sticky header shadow on scroll ---------- */
    const header = document.querySelector('.site-header');
    if (header) {
      const onScroll = function () {
        header.classList.toggle('site-header--scrolled', window.scrollY > 8);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    /* ---------- Count-up animation on scroll into view ---------- */
    const counters = document.querySelectorAll('[data-count-to]');
    if (counters.length) {
      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach(function (el) {
        observer.observe(el);
      });
    }

    function animateCount(el) {
      const target = parseFloat(el.getAttribute('data-count-to'));
      const prefix = el.getAttribute('data-prefix') || '';
      const suffix = el.getAttribute('data-suffix') || '';
      const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      const duration = 1400;
      const start = performance.now();

      function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); /* ease-out cubic */
        const value = target * eased;
        el.textContent = prefix + formatNumber(value, decimals) + suffix;
        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          el.textContent = prefix + formatNumber(target, decimals) + suffix;
        }
      }
      requestAnimationFrame(frame);
    }

    function formatNumber(num, decimals) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }

    /* Expose for calculator page */
    window.__hgaz_animateCount = animateCount;
    window.__hgaz_formatNumber = formatNumber;
  });
})();
