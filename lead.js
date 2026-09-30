/* Host Grow Your AZ — shared client-side lead submission.
 *
 * One function used by every form on the site. Posts to the Vercel /api/lead
 * route (Resend-backed, sends the visitor a real email). If that route reports
 * it isn't configured yet, or is unreachable, it transparently falls back to the
 * old FormSubmit relay. Both services must explicitly confirm acceptance.
 *
 * Resolves with { ok, delivered, viaFallback }.
 *   ok        — the provider accepted the lead, not proof of inbox delivery.
 *   delivered — the visitor email was accepted by the provider. When false, show a
 *               direct download link instead of promising an email.
 */
(function () {
  'use strict';

  var cfg = window.HGYA_CONFIG || {};

  function request(url, options) {
    var controller = new AbortController();
    options.signal = controller.signal;
    var timer = setTimeout(function () { controller.abort(); }, 15000);
    return fetch(url, options).then(function (res) {
      clearTimeout(timer);
      return res;
    }, function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  function checkedJson(res, fallback) {
    return res.json().catch(function () {
      throw new Error('The email service returned an invalid response.');
    }).then(function (j) {
      var accepted = j && (fallback
        ? (j.success === true || j.success === 'true')
        : j.ok === true);
      if (!res.ok || !accepted) {
        throw new Error('Your submission was not confirmed. Please email hostgrowthataz@gmail.com.');
      }
      return {
        ok: true,
        delivered: !fallback && j.delivered === true,
        viaFallback: fallback
      };
    });
  }

  function postJson(url, payload) {
    return request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  function postFallback(payload) {
    if (!cfg.FALLBACK_ENDPOINT) {
      return Promise.reject(new Error('Email is unavailable. Please email hostgrowthataz@gmail.com.'));
    }
    var fd = new FormData();
    Object.keys(payload).forEach(function (k) {
      if (payload[k]) { fd.append(k, payload[k]); }
    });
    fd.append('_subject', 'Host Grow Your AZ — ' + (payload.intent || 'lead'));
    fd.append('_replyto', payload.email || '');
    return request(cfg.FALLBACK_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: fd,
    }).then(function (res) { return checkedJson(res, true); });
  }

  window.hgSubmitLead = function (payload) {
    payload = payload || {};
    payload.page = window.location.pathname;
    payload.referrer = document.referrer || '';

    return postJson(cfg.LEAD_ENDPOINT || '/api/lead', payload).then(
      function (res) {
        if (res.ok) {
          return checkedJson(res, false);
        }
        if (res.status === 503 || res.status === 404 || res.status >= 500) {
          return postFallback(payload);
        }
        return res.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.error || 'Submission failed');
        });
      },
      function (err) {
        /* Only a primary network failure triggers this branch. Never retry a
           failed relay or bypass a validation rejection. */
        if (err.name === 'AbortError') {
          /* The primary may have accepted the request before timing out.
             Do not automatically send the same lead through a second service. */
          throw new Error('Your submission was not confirmed. Please email hostgrowthataz@gmail.com.');
        }
        return postFallback(payload);
      }
    );
  };
})();
