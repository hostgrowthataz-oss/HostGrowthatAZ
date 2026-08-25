/* Host Grow Your AZ — Contact form validation, server-side delivery, success state.
 *
 * Submissions now go through /api/lead (see lead.js and api/lead.js), which emails
 * Andrea AND sends the visitor an acknowledgement. Previously this posted straight
 * to FormSubmit and the visitor received nothing at all, so a real inquiry looked
 * identical to a dropped one. lead.js still falls back to the FormSubmit relay
 * automatically if the API route is unavailable, so nothing is ever lost.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('contact-form');
    if (!form) return;

    /* Pre-fill a hidden note if a ?package= query param is present, for context */
    const params = new URLSearchParams(window.location.search);
    const pkg = params.get('package');
    if (pkg) {
      const challenge = document.getElementById('challenge');
      const labelMap = {
        'strategy-session': 'STR Strategy Session ($99)',
        'listing-optimization': 'Listing Optimization',
        'portfolio-optimization': 'Portfolio Optimization',
        'direct-booking-launch': 'Direct Booking Launch',
        'monthly-growth-partner': 'Monthly Growth Partner',
        'vip-day': 'VIP Day',
        'enterprise': 'Enterprise & Investment Consulting',
        'add-on': 'Add-On Service',
        'free-diagnostic': 'Free 15-Minute Listing Visibility Diagnostic',
        'city-request': 'Request an Arizona city compliance guide',
      };
      const label = labelMap[pkg];
      if (label && challenge) {
        challenge.placeholder = 'Interested in: ' + label + '. ' + challenge.placeholder;
      }
    }

    function validateField(field, condition) {
      const wrapper = field.closest('.field');
      if (!condition) {
        wrapper.classList.add('invalid');
        return false;
      }
      wrapper.classList.remove('invalid');
      return true;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('name');
      const email = document.getElementById('email');
      const challenge = document.getElementById('challenge');

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      let valid = true;
      valid = validateField(name, name.value.trim().length > 0) && valid;
      valid = validateField(email, emailPattern.test(email.value.trim())) && valid;
      valid = validateField(challenge, challenge.value.trim().length > 0) && valid;

      if (!valid) {
        const firstInvalid = form.querySelector('.field.invalid input, .field.invalid textarea');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      function showSuccess() {
        /* Analytics: a completed inquiry is the primary lead conversion.
           No name, email, or message text is ever sent to GA4 — only the
           package the visitor selected. */
        if (window.hgTrack) {
          var pkgField = form.querySelector('[name="package"]');
          window.hgTrack('generate_lead', {
            form_name: 'contact',
            service_package: pkgField && pkgField.value ? pkgField.value : 'unspecified'
          });
        }

        form.style.transition = 'opacity 200ms ease-out';
        form.style.opacity = '0';
        setTimeout(function () {
          form.style.display = 'none';
          document.getElementById('success-state').style.display = 'block';
        }, 200);
      }

      var pkgField = form.querySelector('[name="package"]');
      var listingField = form.querySelector('[name="listing_url"]');
      var hpField = form.querySelector('[name="company_website"]');

      window
        .hgSubmitLead({
          intent: 'contact',
          first_name: name.value.trim(),
          email: email.value.trim(),
          message: challenge.value.trim(),
          package: (pkgField && pkgField.value) || pkg || '',
          listing_url: (listingField && listingField.value) || '',
          company_website: (hpField && hpField.value) || '',
        })
        .then(function () {
          showSuccess();
        })
        .catch(function () {
          /* Network/service failure: fall back so the visitor isn't stuck,
             but surface the working mailto option instead of a false success. */
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
          window.location.href =
            'mailto:hostgrowthataz@gmail.com?subject=Inquiry%20from%20website&body=' +
            encodeURIComponent(
              'Name: ' + (name.value || '') + '\nEmail: ' + (email.value || '') + '\nChallenge: ' + (challenge.value || '')
            );
        });
    });

    [document.getElementById('name'), document.getElementById('email'), document.getElementById('challenge')].forEach(
      function (field) {
        field.addEventListener('input', function () {
          field.closest('.field').classList.remove('invalid');
        });
      }
    );
  });
})();
