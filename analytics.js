/* Host Grow Your AZ — GA4 analytics, Consent Mode v2, and conversion event tracking.
 *
 * Privacy posture (matches the published Cookie Policy and Privacy Policy):
 *   - Consent Mode v2 defaults every storage type to "denied" before GA4 loads.
 *     No analytics cookie is written until the visitor accepts.
 *   - Google Signals and ad personalization are disabled outright, so no
 *     cross-site advertising profile is ever built from this traffic.
 *   - No personally identifiable information is sent to GA4. Form fields are
 *     never read into event parameters — only the fact that a form succeeded.
 */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-R51YJX0NJK';
  var COOKIE_NAME = 'hgya-consent';
  var COOKIE_MAX_AGE = 60 * 60 * 24 * 365; /* 1 year */

  /* The consent choice is kept in a first-party cookie. It is strictly
     necessary under GDPR/ePrivacy — without it we would have to ask on every
     single page view. It holds one word, "granted" or "denied", is never sent
     to Google or any third party, and is scoped to this domain only. */
  function readConsent() {
    var m = document.cookie.match(/(?:^|;\s*)hgya-consent=(granted|denied)/);
    return m ? m[1] : null;
  }

  function writeConsent(value) {
    document.cookie = COOKIE_NAME + '=' + value +
      ';path=/;max-age=' + COOKIE_MAX_AGE + ';SameSite=Lax' +
      (location.protocol === 'https:' ? ';Secure' : '');
  }

  /* ---------------------------------------------------------------
   * 1. Consent Mode v2 — must run BEFORE the gtag.js script loads.
   * ------------------------------------------------------------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var stored = readConsent();

  /* Global Privacy Control. A browser sending GPC is making a legally
     recognised opt-out request under the CCPA/CPRA and several state laws.
     Treat it as a standing "Decline" and never show the banner — asking again
     after an explicit opt-out signal would undermine it. The Cookie Policy
     states that this site honours GPC, so this must stay in place. */
  var gpc = (navigator.globalPrivacyControl === true) ||
            (window.navigator && window.navigator.globalPrivacyControl === true);
  if (gpc) { stored = 'denied'; }

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: stored === 'granted' ? 'granted' : 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  /* Load gtag.js asynchronously. It respects the consent defaults above. */
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(s);

  /* Public helper so other scripts can fire events without touching gtag. */
  window.hgTrack = function (name, params) {
    try { gtag('event', name, params || {}); } catch (e) { /* never break the page */ }
  };

  /* ---------------------------------------------------------------
   * 2. Consent banner
   * ------------------------------------------------------------- */
  function setConsent(value) {
    writeConsent(value);
    gtag('consent', 'update', { analytics_storage: value });
    var el = document.getElementById('cookie-consent');
    if (el) { el.hidden = true; }
  }

  function buildBanner() {
    if (stored === 'granted' || stored === 'denied') { return; }

    var wrap = document.createElement('div');
    wrap.className = 'cookie-consent';
    wrap.id = 'cookie-consent';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Cookie consent');

    var prefix = window.location.pathname.indexOf('/pages/legal/') === 0 ? ''
      : (window.location.pathname.indexOf('/pages/') === 0 ? 'legal/' : 'pages/legal/');

    wrap.innerHTML =
      '<p class="cookie-consent__text">This site uses Google Analytics to understand which pages are useful. ' +
      'No advertising or cross-site tracking. See the ' +
      '<a href="' + prefix + 'cookie-policy.html">Cookie Policy</a>.</p>' +
      '<div class="cookie-consent__actions">' +
      '<button type="button" class="btn btn-secondary" data-consent="denied">Decline</button>' +
      '<button type="button" class="btn btn-primary" data-consent="granted">Accept</button>' +
      '</div>';

    document.body.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (btn) { setConsent(btn.getAttribute('data-consent')); }
    });
  }

  /* ---------------------------------------------------------------
   * 3. Conversion event tracking (delegated — survives DOM changes)
   * ------------------------------------------------------------- */
  var PRODUCT_PRICES = {
    '50 SEO Signals': 39, 'Ultimate Listing Checklist': 15, 'STR Pricing Cheat Sheet': 15,
    'STR Launch Bundle': 59, 'Photography Playbook': 29, 'Guest Psychology Playbook': 29,
    'Revenue Workbook': 19, 'Direct Booking Playbook': 39, 'Owner KPI Dashboard': 39
  };

  function nearestProductName(node) {
    var card = node.closest('article, .resource-card, .bundle-panel, section');
    if (!card) { return 'Unknown'; }
    var h = card.querySelector('h2, h3');
    var text = h ? h.textContent.replace(/\s+/g, ' ').trim() : 'Unknown';
    for (var key in PRODUCT_PRICES) {
      if (text.indexOf(key) !== -1) { return key; }
    }
    return text.slice(0, 80);
  }

  function trackClicks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) { return; }
      var href = a.getAttribute('href') || '';

      /* Stripe checkout — the highest-value event on the site. */
      if (href.indexOf('buy.stripe.com') !== -1) {
        var name = nearestProductName(a);
        window.hgTrack('begin_checkout', {
          currency: 'USD',
          value: PRODUCT_PRICES[name] || 0,
          items: [{ item_name: name, price: PRODUCT_PRICES[name] || 0, quantity: 1 }]
        });
        return;
      }

      /* Strategy session and other package CTAs. */
      var pkg = href.match(/contact\.html\?package=([a-z-]+)/);
      if (pkg) {
        window.hgTrack('select_service', { service_package: pkg[1] });
        return;
      }

      if (href.indexOf('mailto:') === 0) {
        window.hgTrack('email_click', { link_url: href });
        return;
      }

      if (/^https?:\/\//.test(href) && href.indexOf(window.location.hostname) === -1) {
        window.hgTrack('outbound_click', { link_url: href, link_domain: a.hostname });
      }
    }, true);
  }

  /* Scroll depth — tells you whether long pages are actually read. */
  function trackScroll() {
    var marks = [25, 50, 75, 90];
    var fired = {};
    var ticking = false;
    function check() {
      ticking = false;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      if (max <= 0) { return; }
      var pct = (h.scrollTop || document.body.scrollTop) / max * 100;
      for (var i = 0; i < marks.length; i++) {
        if (pct >= marks[i] && !fired[marks[i]]) {
          fired[marks[i]] = true;
          window.hgTrack('scroll_depth', { percent_scrolled: marks[i] });
        }
      }
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(check); }
    }, { passive: true });
  }

  function init() {
    buildBanner();
    trackClicks();
    trackScroll();

    /* Purchase confirmation page. */
    if (/order-confirmed/.test(window.location.pathname)) {
      window.hgTrack('purchase_confirmation_view', {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
