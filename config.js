/* Host Grow Your AZ — shared site configuration.
 *
 * One place to change values that appear across many pages. Loaded before
 * app.js on every page.
 *
 * BOOKING_URL
 * -----------
 * The public Google Calendar appointment-schedule ("booking page") link for the
 * free 15-minute Listing Visibility Diagnostic. Paste the full URL here once the
 * schedule exists in Google Calendar. It looks like:
 *
 *   https://calendar.google.com/calendar/appointments/schedules/AcZssZ...
 *   or a https://calendar.app.google/... short link
 *
 * Until this is filled in, every "book a call" surface on the site degrades
 * gracefully to the contact form instead of showing a broken embed. Nothing
 * breaks and no visitor hits a dead end.
 */
(function () {
  'use strict';

  window.HGYA_CONFIG = {
    /* Paste the Google Calendar booking link between the quotes. */
    BOOKING_URL: '',

    /* Google embeds an appointment schedule when ?gv=true is appended. */
    bookingEmbedUrl: function () {
      var u = this.BOOKING_URL;
      if (!u) { return ''; }
      return u + (u.indexOf('?') === -1 ? '?gv=true' : '&gv=true');
    },

    hasBooking: function () {
      return !!this.BOOKING_URL;
    },

    /* Lead-capture endpoint. Falls back to FormSubmit automatically if the
       Resend API key is not configured in Vercel — see /api/lead.js. */
    LEAD_ENDPOINT: '/api/lead',
    FALLBACK_ENDPOINT: 'https://formsubmit.co/ajax/hostgrowthataz@gmail.com',

    FREE_GUIDE_PATH: '/assets/downloads/10-seo-mistakes-costing-str-hosts-bookings.pdf',
  };
})();
