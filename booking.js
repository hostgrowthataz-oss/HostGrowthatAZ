/* Host Grow Your AZ — booking page behaviour.
 *
 * Renders the Google Calendar appointment-schedule embed when a booking URL has
 * been set in config.js. When it hasn't been set yet, renders a short request
 * form instead of an empty box, so the page is never a dead end during setup.
 *
 * Fires a `schedule_call` GA4 event when a visitor engages with the booking
 * surface. A cross-origin iframe can't tell us the booking completed, so the
 * event marks intent, and the confirmation email from Google is the source of
 * truth for actual bookings.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var mount = document.querySelector('[data-booking-embed]');
    if (!mount) { return; }

    var cfg = window.HGYA_CONFIG || {};

    if (cfg.hasBooking && cfg.hasBooking()) {
      var wrap = document.createElement('div');
      wrap.className = 'booking-embed';

      var frame = document.createElement('iframe');
      frame.src = cfg.bookingEmbedUrl();
      frame.title = 'Book a free 15-minute listing diagnostic';
      frame.style.border = '0';
      frame.width = '100%';
      frame.height = '640';
      frame.setAttribute('frameborder', '0');
      frame.loading = 'lazy';
      wrap.appendChild(frame);

      var direct = document.createElement('p');
      direct.className = 'breadcrumb-note';
      direct.innerHTML =
        'Calendar not loading? <a href="' + cfg.BOOKING_URL +
        '" target="_blank" rel="noopener">Open the booking page directly</a>.';
      wrap.appendChild(direct);

      mount.appendChild(wrap);

      /* Mark intent once, when the visitor first interacts with the embed area. */
      var fired = false;
      function markIntent() {
        if (fired) { return; }
        fired = true;
        if (window.hgTrack) {
          window.hgTrack('schedule_call', {
            method: 'google_calendar_embed',
            service_package: 'free-diagnostic',
          });
        }
      }
      /* Clicking into a cross-origin iframe blurs the parent window — a
         reliable proxy for "started interacting with the calendar". */
      window.addEventListener('blur', function () {
        if (document.activeElement === frame) { markIntent(); }
      });
      direct.addEventListener('click', markIntent);
      return;
    }

    /* ---------- No booking link configured yet: request-a-time form ---------- */
    /* Deliberately NOT .resource-form: that class is a horizontal wrapping flex
       row built for the single inline email field in the resource library, and
       reusing it here laid these five stacked fields out side by side. */
    var form = document.createElement('form');
    form.className = 'booking-form';
    form.noValidate = true;
    form.innerHTML =
      '<p class="breadcrumb-note" style="margin-bottom:var(--space-4)">Send me your listing and I\'ll reply with times that work, within one business day.</p>' +
      '<div class="field"><label for="bk-name">First name</label>' +
      '<input id="bk-name" name="first_name" type="text" autocomplete="given-name" required></div>' +
      '<div class="field"><label for="bk-email">Email</label>' +
      '<input id="bk-email" name="email" type="email" autocomplete="email" required></div>' +
      '<div class="field"><label for="bk-listing">Airbnb or Vrbo listing URL</label>' +
      '<input id="bk-listing" name="listing_url" type="url" placeholder="https://www.airbnb.com/rooms/..." required></div>' +
      '<div class="field"><label for="bk-msg">Anything I should know? (optional)</label>' +
      '<textarea id="bk-msg" name="message" rows="3"></textarea></div>' +
      '<div class="field" hidden aria-hidden="true"><label for="bk-hp">Leave blank</label>' +
      '<input id="bk-hp" name="company_website" type="text" tabindex="-1" autocomplete="off"></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Request a time</button>' +
      '<p class="resource-confirm" role="status" aria-live="polite" hidden></p>';

    mount.appendChild(form);

    var status = form.querySelector('.resource-confirm');
    var button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = form.elements.email.value.trim();
      var listing = form.elements.listing_url.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        status.hidden = false;
        status.textContent = 'Please enter a valid email address so I can reply.';
        return;
      }
      if (!listing) {
        status.hidden = false;
        status.textContent = 'Please add your listing URL — it is the whole point of the call.';
        return;
      }

      button.disabled = true;
      button.textContent = 'Sending…';
      status.hidden = true;

      window
        .hgSubmitLead({
          intent: 'contact',
          first_name: form.elements.first_name.value.trim(),
          email: email,
          listing_url: listing,
          message: form.elements.message.value.trim(),
          package: 'free-diagnostic',
          company_website: form.elements.company_website.value,
        })
        .then(function () {
          if (window.hgTrack) {
            window.hgTrack('schedule_call', {
              method: 'request_form',
              service_package: 'free-diagnostic',
            });
          }
          form.querySelectorAll('.field, button').forEach(function (n) { n.hidden = true; });
          status.hidden = false;
          status.textContent =
            'Got it. I\'ll look at your listing and email you times within one business day.';
        })
        .catch(function () {
          button.disabled = false;
          button.textContent = 'Request a time';
          status.hidden = false;
          status.innerHTML =
            'Something went wrong on my end. Please email <a href="mailto:hostgrowthataz@gmail.com">hostgrowthataz@gmail.com</a> and I\'ll get right back to you.';
        });
    });
  });
})();
