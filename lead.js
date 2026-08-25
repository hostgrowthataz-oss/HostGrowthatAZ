/* Host Grow Your AZ — shared client-side lead submission.
 *
 * One function used by every form on the site. Posts to the Vercel /api/lead
 * route (Resend-backed, sends the visitor a real email). If that route reports
 * it isn't configured yet, or is unreachable, it transparently falls back to the
 * old FormSubmit relay so a lead is never silently lost — which is exactly what
 * used to happen.
 *
 * Resolves with { ok, delivered, viaFallback }.
 *   ok        — Andrea has the lead.
 *   delivered — the visitor was emailed their copy. When false, show them a
 *               direct download link instead of promising an email.
 */
(function () {
  'use strict';

  var cfg = window.HGYA_CONFIG || {};

  function postJson(url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  function postFallback(payload) {
    var fd = new FormData();
    Object.keys(payload).forEach(function (k) {
      if (payload[k]) { fd.append(k, payload[k]); }
    });
    fd.append('_subject', 'Host Grow Your AZ — ' + (payload.intent || 'lead'));
    return fetch(cfg.FALLBACK_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: fd,
    });
  }

  window.hgSubmitLead = function (payload) {
    payload = payload || {};
    payload.page = window.location.pathname;
    payload.referrer = document.referrer || '';

    return postJson(cfg.LEAD_ENDPOINT || '/api/lead', payload)
      .then(function (res) {
        if (res.ok) {
          return res.json().then(function (j) {
            return { ok: true, delivered: j.delivered !== false, viaFallback: false };
          });
        }
        if (res.status === 503 || res.status === 404 || res.status >= 500) {
          /* Not configured or route unavailable — use the relay. */
          return postFallback(payload).then(function () {
            return { ok: true, delivered: false, viaFallback: true };
          });
        }
        return res.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.error || 'Submission failed');
        });
      })
      .catch(function (err) {
        /* Network-level failure. One last attempt through the relay before we
           tell the visitor anything went wrong. */
        return postFallback(payload)
          .then(function () {
            return { ok: true, delivered: false, viaFallback: true };
          })
          .catch(function () {
            throw err;
          });
      });
  };
})();
