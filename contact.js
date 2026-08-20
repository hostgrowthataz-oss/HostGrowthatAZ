/* Host Grow Your AZ — Contact form validation, live email delivery via FormSubmit, + success state */
(function () {
  'use strict';

  /* Every submission is forwarded to this inbox via FormSubmit (formsubmit.co) —
     a free, no-signup form-relay service. The FIRST submission from the live site
     triggers a one-time confirmation email to this address that must be clicked
     to activate delivery; every submission after that lands directly in the inbox. */
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/hostgrowthataz@gmail.com';

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

      const formData = new FormData(form);
      formData.append('_subject', 'New inquiry from Host Grow Your AZ website');

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      })
        .then(function (response) {
          if (!response.ok) throw new Error('FormSubmit request failed');
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
