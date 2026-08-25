/* Host Grow Your AZ — purchase conversion tracking.
 *
 * The problem this solves: GA4 recorded 2 begin_checkout events and 0 purchase
 * events, because Stripe payment links take the visitor off-domain and the sale
 * completes on Stripe's servers. Without a purchase event there is no revenue in
 * GA4, no way to compare channels by revenue, and no conversion signal for ads.
 *
 * This page is the post-payment return URL, so it is the right place to fire it.
 * Values come from query parameters so any Stripe link can pass them through its
 * success URL, for example:
 *
 *   https://hostgrowyouraz.com/pages/order-confirmed.html
 *     ?item=Listing+Optimization&value=500&currency=USD&id={CHECKOUT_SESSION_ID}
 *
 * Stripe substitutes {CHECKOUT_SESSION_ID} automatically, which gives each
 * purchase a stable transaction_id and stops GA4 double-counting on refresh.
 *
 * De-duplication: once the event is sent, the tracking parameters are stripped
 * from the address bar with history.replaceState. A reload or back-navigation
 * then lands on a clean URL with nothing to re-fire, so GA4 cannot double-count
 * the same order. This needs no client-side storage at all, which matters
 * because storage access throws outright in Safari private mode.
 */
(function () {
  'use strict';

  var fired = false;

  /* Remove the purchase parameters so a refresh cannot replay the event. */
  function clearParams() {
    try {
      var u = new URL(window.location.href);
      ['item', 'product', 'value', 'amount', 'currency', 'id', 'session_id']
        .forEach(function (k) { u.searchParams.delete(k); });
      var clean = u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash;
      window.history.replaceState({}, document.title, clean);
    } catch (e) {
      /* replaceState is unavailable in some embedded webviews. The event has
         already been sent at this point, so there is nothing to recover. */
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.hgTrack) { return; }

    var q = new URLSearchParams(window.location.search);

    /* No purchase parameters means a direct visit to the confirmation page,
       not a completed checkout. Do not invent a conversion. */
    if (!q.get('item') && !q.get('product') && !q.get('session_id') && !q.get('id')) {
      return;
    }

    var item = q.get('item') || q.get('product') || 'Host Grow Your AZ service';
    var value = parseFloat(q.get('value') || q.get('amount') || '0');
    var currency = (q.get('currency') || 'USD').toUpperCase();

    /* Stripe's checkout session id is the best transaction_id available. Fall
       back to a date-scoped key so repeated same-day reloads still de-duplicate. */
    var txn = q.get('id') || q.get('session_id') ||
      ('order-' + new Date().toISOString().slice(0, 10) + '-' + item);

    if (fired) { return; }
    fired = true;

    window.hgTrack('purchase', {
      transaction_id: txn,
      currency: currency,
      value: isNaN(value) ? 0 : value,
      items: [{
        item_name: item,
        price: isNaN(value) ? 0 : value,
        quantity: 1,
      }],
    });

    clearParams();
  });
})();
