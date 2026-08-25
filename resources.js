/* Host Grow Your AZ — Resource Library capture logic.
 *
 * Rewritten alongside the move from Stripe preorders to email waitlists.
 *
 * What changed and why:
 *   - The free guide used to POST to FormSubmit with a silent .catch(), so a
 *     failed submission looked identical to a successful one and the visitor
 *     never received an email. It now goes through /api/lead, which emails the
 *     guide to the visitor and notifies Andrea, and it reports failures honestly.
 *   - The nine product buttons no longer leave the site to a Stripe preorder.
 *     Each opens an inline waitlist form in place, so a visitor who is interested
 *     in an unfinished guide becomes a subscriber instead of a bounce.
 *   - A file_download event fires on the free guide, and join_waitlist fires with
 *     the product name, so GA4 finally shows which guides people actually want.
 */
(function () {
  'use strict';

  var FREE_GUIDE_PDF = '../assets/downloads/10-seo-mistakes-costing-str-hosts-bookings.pdf';
  var FREE_GUIDE_NAME = '10 SEO Mistakes Costing STR Hosts Bookings (Free Guide)';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function track(name, params) {
    if (window.hgTrack) { window.hgTrack(name, params || {}); }
  }

  function downloadFreeGuide() {
    var link = document.createElement('a');
    link.href = FREE_GUIDE_PDF;
    link.download = '10-SEO-Mistakes-Costing-STR-Hosts-Bookings.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* ---------------------------------------------------------------
     * 1. Waitlist buttons (one per unfinished guide)
     * ------------------------------------------------------------- */
    document.querySelectorAll('[data-waitlist]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var product = btn.getAttribute('data-waitlist') || 'Host Grow Your AZ guide';
        var price = btn.getAttribute('data-price') || '';
        var host = btn.parentElement;
        if (!host || host.querySelector('.waitlist-form')) { return; }

        track('join_waitlist_start', { item_name: product });

        var form = document.createElement('form');
        form.className = 'waitlist-form';
        form.noValidate = true;
        var uid = 'wl-' + Math.random().toString(36).slice(2, 8);
        form.innerHTML =
          '<div class="field"><label class="sr-only" for="' + uid + '">Email address</label>' +
          '<input id="' + uid + '" name="email" type="email" placeholder="Email address" ' +
          'autocomplete="email" required></div>' +
          '<div class="field" hidden aria-hidden="true">' +
          '<input name="company_website" type="text" tabindex="-1" autocomplete="off"></div>' +
          '<button class="btn btn-primary" type="submit">Notify me at launch</button>' +
          '<p class="waitlist-note" role="status" aria-live="polite">' +
          'Free to join. ' + (price ? 'Founder price $' + price + ' at launch. ' : '') +
          'No card, no charge, unsubscribe any time.</p>';

        btn.hidden = true;
        host.appendChild(form);
        form.querySelector('input[type="email"]').focus();

        var note = form.querySelector('.waitlist-note');
        var submit = form.querySelector('button[type="submit"]');

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var email = form.elements.email.value.trim();
          if (!EMAIL_RE.test(email)) {
            note.textContent = 'Please enter a valid email address.';
            return;
          }
          submit.disabled = true;
          submit.textContent = 'Adding you…';

          window
            .hgSubmitLead({
              intent: 'waitlist',
              email: email,
              product: product,
              company_website: form.elements.company_website.value,
            })
            .then(function (r) {
              track('join_waitlist', { item_name: product, value: Number(price) || 0 });
              form.querySelectorAll('.field, button').forEach(function (n) { n.hidden = true; });
              note.textContent = r.delivered
                ? "You're on the list. Check your inbox for confirmation — you'll hear from me the moment it's ready."
                : "You're on the list. I'll email you the moment it's ready.";
            })
            .catch(function () {
              submit.disabled = false;
              submit.textContent = 'Notify me at launch';
              note.innerHTML =
                'That did not go through. Please email ' +
                '<a href="mailto:hostgrowthataz@gmail.com?subject=Waitlist: ' +
                encodeURIComponent(product) + '">hostgrowthataz@gmail.com</a> and I will add you manually.';
            });
        });
      });
    });

    /* ---------------------------------------------------------------
     * 2. Free lead magnet — "10 SEO Mistakes"
     * ------------------------------------------------------------- */
    var freeForm = document.querySelector('[data-free-resource-form]');
    if (freeForm) {
      var confirmEl = document.querySelector('[data-free-resource-confirm]');
      var freeBtn = freeForm.querySelector('button[type="submit"]');
      var freeNote = freeForm.querySelector('.fine-print');

      freeForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var firstName = (freeForm.querySelector('input[name="first_name"]') || {}).value || '';
        var email = (freeForm.querySelector('input[name="email"]') || {}).value || '';
        firstName = firstName.trim();
        email = email.trim();

        if (!firstName) {
          if (freeNote) { freeNote.textContent = 'Please add your first name so I know who I am writing to.'; }
          return;
        }
        if (!EMAIL_RE.test(email)) {
          if (freeNote) { freeNote.textContent = 'Please enter a valid email address so I can send the guide.'; }
          return;
        }

        if (freeBtn) { freeBtn.disabled = true; freeBtn.textContent = 'Sending…'; }

        window
          .hgSubmitLead({
            intent: 'free_guide',
            first_name: firstName,
            email: email,
            product: FREE_GUIDE_NAME,
          })
          .then(function (r) {
            /* Download immediately regardless — the visitor asked for a file and
               should get it without waiting on an inbox. */
            downloadFreeGuide();
            track('file_download', {
              file_name: '10-seo-mistakes-costing-str-hosts-bookings.pdf',
              file_extension: 'pdf',
              item_name: FREE_GUIDE_NAME,
            });
            track('generate_lead', { lead_source: 'free_guide', value: 0, currency: 'USD' });

            freeForm.style.transition = 'opacity 200ms ease-out';
            freeForm.style.opacity = '0';
            setTimeout(function () {
              freeForm.style.display = 'none';
              if (confirmEl) {
                confirmEl.style.display = 'block';
                if (!r.delivered) {
                  var p = document.createElement('p');
                  p.className = 'fine-print';
                  p.innerHTML =
                    'Your download has started. If the email does not arrive, ' +
                    '<a href="' + FREE_GUIDE_PDF + '" download>download the guide directly</a>.';
                  confirmEl.appendChild(p);
                }
              }
            }, 200);
          })
          .catch(function () {
            /* Still give them the file — they asked for it. */
            downloadFreeGuide();
            if (freeBtn) { freeBtn.disabled = false; freeBtn.textContent = 'Download Free Guide'; }
            if (freeNote) {
              freeNote.innerHTML =
                'Your download has started, but I could not save your email. ' +
                'Send me a note at <a href="mailto:hostgrowthataz@gmail.com">hostgrowthataz@gmail.com</a> if you want the follow-up tips.';
            }
          });
      });
    }
  });
})();
