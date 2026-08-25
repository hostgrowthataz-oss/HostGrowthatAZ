/* Host Grow Your AZ — ROI Calculator logic (client-side only, no backend) */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const adrInput = document.getElementById('adr');
    const occInput = document.getElementById('occupancy');
    const propInput = document.getElementById('properties');
    const revenueInput = document.getElementById('annual-revenue');

    const adrValue = document.getElementById('adr-value');
    const occValue = document.getElementById('occupancy-value');
    const propValue = document.getElementById('properties-value');

    const currentRevenueEl = document.getElementById('current-revenue');
    const uplift5El = document.getElementById('uplift-5');

    const leverEls = {
      ranking: document.getElementById('lever-ranking'),
      conversion: document.getElementById('lever-conversion'),
      pricing: document.getElementById('lever-pricing'),
      staylength: document.getElementById('lever-staylength'),
      upsells: document.getElementById('lever-upsells'),
      total: document.getElementById('lever-total'),
    };

    const gateOverlay = document.getElementById('gate-overlay');
    const gateForm = document.getElementById('gate-form');
    const leverFull = document.getElementById('lever-full');
    const leverPreview = document.getElementById('lever-preview');

    if (!adrInput) return; // not on this page

    function fmt(n) {
      return Math.round(n).toLocaleString('en-US');
    }

    function computeCurrentRevenue() {
      const manual = revenueInput.value.replace(/[^0-9.]/g, '');
      if (manual) {
        return parseFloat(manual);
      }
      const adr = parseFloat(adrInput.value);
      const occ = parseFloat(occInput.value) / 100;
      const props = parseFloat(propInput.value);
      return adr * occ * 365 * props;
    }

    /* Lever share of the "strong case" total uplift (25%) — proportions sum to 1 */
    const LEVER_SHARES = {
      ranking: 0.30, // Better rankings & visibility
      conversion: 0.25, // Higher conversion rate
      pricing: 0.25, // Smarter pricing
      staylength: 0.12, // Longer average stays
      upsells: 0.08, // Upsells & add-ons
    };

    let lastRevenue = 0;

    function recalc(animate) {
      const revenue = computeCurrentRevenue();
      lastRevenue = revenue;

      adrValue.textContent = '$' + fmt(parseFloat(adrInput.value));
      occValue.textContent = parseFloat(occInput.value) + '%';
      propValue.textContent = propInput.value;

      const uplift5 = revenue * 0.05;
      const strongTotal = revenue * 0.25;

      if (animate && window.__hgaz_animateCount) {
        currentRevenueEl.setAttribute('data-count-to', Math.round(revenue));
        currentRevenueEl.removeAttribute('data-prefix');
        window.__hgaz_animateCount(currentRevenueEl);
      } else {
        currentRevenueEl.textContent = fmt(revenue);
      }

      uplift5El.textContent = '$' + fmt(uplift5);

      leverEls.ranking.textContent = '+$' + fmt(strongTotal * LEVER_SHARES.ranking);
      leverEls.conversion.textContent = '+$' + fmt(strongTotal * LEVER_SHARES.conversion);
      leverEls.pricing.textContent = '+$' + fmt(strongTotal * LEVER_SHARES.pricing);
      leverEls.staylength.textContent = '+$' + fmt(strongTotal * LEVER_SHARES.staylength);
      leverEls.upsells.textContent = '+$' + fmt(strongTotal * LEVER_SHARES.upsells);
      leverEls.total.textContent = '+$' + fmt(strongTotal);
    }

    let debounceTimer;
    function onInputChange() {
      clearTimeout(debounceTimer);
      recalc(false);
    }

    [adrInput, occInput, propInput].forEach(function (el) {
      el.addEventListener('input', onInputChange);
    });
    revenueInput.addEventListener('input', onInputChange);

    /* Initial calculation with animated count-up */
    recalc(true);

    /* Email gate reveal. The lead now goes through /api/lead, which emails Andrea
       AND sends the visitor their own copy with a link to book a free diagnostic.
       Previously this posted to FormSubmit with a silent .catch(), so the visitor
       handed over an email address and received absolutely nothing in return —
       which is the fastest way to make a gate feel like a bait-and-switch. */

    function revealFullResults() {
      gateOverlay.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out';
      gateOverlay.style.opacity = '0';
      gateOverlay.style.transform = 'scale(0.98)';
      setTimeout(function () {
        gateOverlay.style.display = 'none';
        leverFull.style.display = 'grid';
        leverFull.style.opacity = '0';
        leverFull.style.transform = 'translateY(0)';
        requestAnimationFrame(function () {
          leverFull.style.transition = 'opacity 400ms ease-out';
          leverFull.style.opacity = '1';
        });
      }, 300);
    }

    if (gateForm) {
      gateForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = document.getElementById('gate-name').value.trim();
        const email = document.getElementById('gate-email').value.trim();
        if (!name || !email || !email.includes('@')) {
          return;
        }

        /* Analytics: unlocking the full results is a qualified lead.
           Only the revenue estimate is reported — never the name or email. */
        if (window.hgTrack) {
          window.hgTrack('generate_lead', {
            form_name: 'roi_calculator',
            lead_source: 'roi_calculator',
            currency: 'USD',
            value: lastRevenue || 0
          });
        }

        if (window.hgSubmitLead) {
          window.hgSubmitLead({
            intent: 'calculator',
            first_name: name,
            email: email,
            message: 'Estimated annual revenue opportunity: $' + fmt(lastRevenue),
            product: 'ROI Calculator unlock',
          }).catch(function () {
            /* The visitor has already earned their results; a delivery failure
               must never hold those back. Andrea's copy is the fallback path. */
          });
        }

        /* Reveal immediately — never make someone wait on a network round-trip
           for something they have already paid for with their email address. */
        revealFullResults();
      });
    }
  });
})();
