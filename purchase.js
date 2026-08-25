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
 * De-duplication: the transaction id is recorded in sessionStorage, so a reload
 * or a back-navigation does not fire a second purchase for the same order.
 */
(function () {
  'use strict';

  var KEY = 'hgya_purchases';

  function seen(id) {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (list.indexOf(id) !== -1) { return true; }
      list.push(id);
      window.sessionStorage.setItem(KEY, JSON.stringify(list.slice(-25)));
      return false;
    } catch (e) {
      /* Private mode or storage disabled — better to risk a duplicate than to
         lose the conversion entirely. */
      return false;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.hgTrack) { return; }

    var q = new URLSearchParams(window.location.search);

    var item = q.get('item') || q.get('product') || 'Host Grow Your AZ service';
    var value = parseFloat(q.get('value') || q.get('amount') || '0');
    var currency = (q.get('currency') || 'USD').toUpperCase();

    /* Stripe's checkout session id is the best transaction_id available. Fall
       back to a date-scoped key so repeated same-day reloads still de-duplicate. */
    var txn = q.get('id') || q.get('session_id') ||
      ('order-' + new Date().toISOString().slice(0, 10) + '-' + item);

    if (seen(txn)) { return; }

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
  });
})();
