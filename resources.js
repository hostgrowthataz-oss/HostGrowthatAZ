/* Host Grow Your AZ — Playbook Library capture logic.
   1) Legacy email-capture forms ([data-resource-form]) — retained as a no-op.
      Every playbook is now sold directly through a Stripe preorder link, so no
      [data-resource-form] elements remain on the page. This handler is kept so
      the script stays safe if an email-capture form is reintroduced later.
   2) Free lead magnet form ([data-free-resource-form]) — "10 SEO Mistakes"
      guide. Forwards the lead to hostgrowthataz@gmail.com via FormSubmit and
      triggers an instant client-side download of the free PDF. */
(function () {
  'use strict';
  var RESOURCE_ENDPOINT = 'https://formsubmit.co/ajax/hostgrowthataz@gmail.com';
  var FREE_GUIDE_PDF = '../assets/downloads/10-seo-mistakes-costing-str-hosts-bookings.pdf';

  document.addEventListener('DOMContentLoaded', function () {
    // --- Pre-order / bundle waitlist forms ---
    var forms = document.querySelectorAll('[data-resource-form]');
    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var emailInput = form.querySelector('input[type="email"]');
        if (!emailInput.value || !emailInput.value.includes('@')) return;

        var resourceName = form.getAttribute('data-resource-name') || 'Unknown playbook';

        var fd = new FormData();
        fd.append('email', emailInput.value.trim());
        fd.append('guide_requested', resourceName);
        fd.append('_subject', 'Playbook Library pre-order: ' + resourceName);

        fetch(RESOURCE_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: fd,
        }).catch(function () {
          /* Silent fallback — delivery may fail, but the visitor's confirmation
             should never be blocked by that. */
        });

        var confirm = form.parentElement.querySelector('[data-resource-confirm]');
        form.style.transition = 'opacity 200ms ease-out';
        form.style.opacity = '0';
        setTimeout(function () {
          form.style.display = 'none';
          if (confirm) confirm.style.display = 'flex';
        }, 200);
      });
    });

    // --- Free lead magnet form ("10 SEO Mistakes") ---
    var freeForm = document.querySelector('[data-free-resource-form]');
    if (freeForm) {
      freeForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var firstNameInput = freeForm.querySelector('input[name="first_name"]');
        var emailInput = freeForm.querySelector('input[name="email"]');
        if (!emailInput.value || !emailInput.value.includes('@')) return;
        if (!firstNameInput.value.trim()) return;

        var fd = new FormData();
        fd.append('first_name', firstNameInput.value.trim());
        fd.append('email', emailInput.value.trim());
        fd.append('guide_requested', '10 SEO Mistakes Costing STR Hosts Bookings (Free Guide)');
        fd.append('_subject', 'Free guide download: 10 SEO Mistakes Costing STR Hosts Bookings');

        fetch(RESOURCE_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: fd,
        }).catch(function () {
          /* Silent fallback — the download below still runs regardless. */
        });

        // Instant client-side download of the free PDF.
        var link = document.createElement('a');
        link.href = FREE_GUIDE_PDF;
        link.download = '10-SEO-Mistakes-Costing-STR-Hosts-Bookings.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        var confirm = document.querySelector('[data-free-resource-confirm]');
        freeForm.style.transition = 'opacity 200ms ease-out';
        freeForm.style.opacity = '0';
        setTimeout(function () {
          freeForm.style.display = 'none';
          if (confirm) confirm.style.display = 'block';
        }, 200);
      });
    }
  });
})();
