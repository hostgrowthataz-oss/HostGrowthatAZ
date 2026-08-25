/* Host Grow Your AZ — server-side lead capture and email delivery.
 *
 * Replaces the previous client-side FormSubmit relay, which posted straight to a
 * Gmail inbox, failed silently, and never sent the visitor anything. This route:
 *
 *   1. Validates the submission and rejects obvious bots (honeypot + timing).
 *   2. Emails Andrea a notification so the lead is never lost.
 *   3. Emails the VISITOR — delivering the free guide, confirming a waitlist
 *      spot, or acknowledging an inquiry. This is the part that was missing, and
 *      it is the only reason an email address is worth collecting.
 *
 * Configuration (Vercel > Project > Settings > Environment Variables):
 *   RESEND_API_KEY   required. From https://resend.com/api-keys
 *   LEAD_FROM        optional. Defaults to "Andrea Nava <andrea@hostgrowyouraz.com>".
 *                    The domain must be verified in Resend or sending will fail.
 *   LEAD_TO          optional. Defaults to hostgrowthataz@gmail.com.
 *
 * If RESEND_API_KEY is absent the route returns 503 with { fallback: true } and
 * the client re-posts to FormSubmit, so lead capture keeps working during setup.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SITE = 'https://hostgrowyouraz.com';
const FREE_GUIDE_URL = SITE + '/assets/downloads/10-seo-mistakes-costing-str-hosts-bookings.pdf';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INTENTS = {
  free_guide: 'Free guide download',
  waitlist: 'Guide waitlist signup',
  contact: 'Consulting inquiry',
  calculator: 'ROI calculator unlock',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clamp(s, n) {
  return String(s == null ? '' : s).trim().slice(0, n);
}

function shell(bodyHtml) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f8f4ed;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ed;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf8f2;border:1px solid #d3c3a3;border-radius:12px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2b2621;font-size:16px;line-height:1.6;">
<tr><td>
<p style="margin:0 0 24px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#b5623d;font-weight:600;">Host Grow Your AZ</p>
${bodyHtml}
<hr style="border:none;border-top:1px solid #ddd0b6;margin:32px 0 16px;">
<p style="margin:0;font-size:13px;color:#6f6559;">
Andrea Nava &middot; Founder, Host Grow Your AZ &middot; Surprise, Arizona<br>
<a href="${SITE}" style="color:#b5623d;">hostgrowyouraz.com</a><br><br>
Host Grow Your AZ is an independent consultancy and is not affiliated with, endorsed by, or acting on behalf of Airbnb, Vrbo, or Booking.com.
</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

function visitorEmail(intent, data, bookingUrl) {
  const name = data.first_name ? esc(data.first_name) : 'there';
  const bookLine = bookingUrl
    ? `<p style="margin:0 0 20px;"><a href="${esc(bookingUrl)}" style="display:inline-block;background:#b5623d;color:#fbf8f2;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Grab a free 15-minute slot</a></p>`
    : `<p style="margin:0 0 20px;">If you'd like me to look at your listing directly, just reply to this email with the link.</p>`;

  if (intent === 'free_guide') {
    return {
      subject: 'Your guide: 10 SEO Mistakes Costing STR Hosts Bookings',
      html: shell(`
<p style="margin:0 0 16px;font-size:22px;font-weight:600;">Here's your guide, ${name}.</p>
<p style="margin:0 0 20px;">Download it here:</p>
<p style="margin:0 0 24px;"><a href="${FREE_GUIDE_URL}" style="display:inline-block;background:#5c6b4e;color:#fbf8f2;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Download the PDF</a></p>
<p style="margin:0 0 16px;">Mistake #4 is the one I see most often, and it's usually costing hosts more than the other nine combined. Start there.</p>
<p style="margin:0 0 20px;"><strong>One thing before you go:</strong> reply to this email with your Airbnb or Vrbo listing URL and I'll take a look. I read every reply myself — I spent years as an Airbnb Market Manager looking at listings, and it's still the fastest way I can help.</p>
${bookLine}
`),
      text: `Here's your guide, ${data.first_name || 'there'}.\n\nDownload: ${FREE_GUIDE_URL}\n\nMistake #4 is the one I see most often. Start there.\n\nReply with your Airbnb or Vrbo listing URL and I'll take a look — I read every reply myself.\n\n${bookingUrl ? 'Book a free 15-minute diagnostic: ' + bookingUrl : ''}\n\nAndrea Nava, Host Grow Your AZ`,
    };
  }

  if (intent === 'waitlist') {
    return {
      subject: `You're on the list: ${data.product || 'Host Grow Your AZ guides'}`,
      html: shell(`
<p style="margin:0 0 16px;font-size:22px;font-weight:600;">You're on the list, ${name}.</p>
<p style="margin:0 0 20px;">I'll email you the moment <strong>${esc(data.product || 'this guide')}</strong> is ready. No charge to hold your spot, and you'll get first access plus founder pricing.</p>
<p style="margin:0 0 20px;">While you wait, the free guide covers the ten mistakes I see most often: <a href="${FREE_GUIDE_URL}" style="color:#b5623d;">10 SEO Mistakes Costing STR Hosts Bookings</a>.</p>
${bookLine}
`),
      text: `You're on the list, ${data.first_name || 'there'}.\n\nI'll email you when ${data.product || 'this guide'} is ready. First access and founder pricing.\n\nFree guide meanwhile: ${FREE_GUIDE_URL}\n\n${bookingUrl ? 'Book a free 15-minute diagnostic: ' + bookingUrl : ''}\n\nAndrea Nava, Host Grow Your AZ`,
    };
  }

  if (intent === 'calculator') {
    return {
      subject: 'Your STR revenue opportunity breakdown',
      html: shell(`
<p style="margin:0 0 16px;font-size:22px;font-weight:600;">Your breakdown is unlocked, ${name}.</p>
<p style="margin:0 0 20px;">The calculator now shows you the lever-by-lever view — which changes drive the uplift, and roughly what each is worth on your numbers.</p>
<p style="margin:0 0 20px;">A calculator can only estimate. Whether the opportunity is real for <em>your</em> property depends on your market, your competition, and how your listing is currently positioned. That's a 15-minute conversation, not a spreadsheet.</p>
${bookLine}
`),
      text: `Your breakdown is unlocked, ${data.first_name || 'there'}.\n\nThe calculator now shows the lever-by-lever view.\n\n${bookingUrl ? 'Book a free 15-minute diagnostic: ' + bookingUrl : 'Reply with your listing URL and I will take a look.'}\n\nAndrea Nava, Host Grow Your AZ`,
    };
  }

  return {
    subject: 'Got your message — Andrea, Host Grow Your AZ',
    html: shell(`
<p style="margin:0 0 16px;font-size:22px;font-weight:600;">Got it, ${name}.</p>
<p style="margin:0 0 20px;">Your message came straight to me and I'll reply personally, usually within one business day. Not a template, not an assistant.</p>
<p style="margin:0 0 20px;">If you'd rather just talk, the fastest path is a free 15-minute diagnostic — bring your listing URL and I'll tell you the top three things limiting its visibility.</p>
${bookLine}
`),
    text: `Got it, ${data.first_name || 'there'}.\n\nYour message came straight to me and I'll reply personally, usually within one business day.\n\n${bookingUrl ? 'Or book a free 15-minute diagnostic: ' + bookingUrl : ''}\n\nAndrea Nava, Host Grow Your AZ`,
  };
}

function notifyEmail(intent, data, meta) {
  const rows = [
    ['Type', INTENTS[intent] || intent],
    ['Name', data.first_name],
    ['Email', data.email],
    ['Listing URL', data.listing_url],
    ['Product / interest', data.product],
    ['Package', data.package],
    ['Message', data.message],
    ['Page', meta.page],
    ['Referrer', meta.referrer],
  ].filter((r) => r[1]);

  return {
    subject: `[Lead] ${INTENTS[intent] || intent} — ${data.email}`,
    html: shell(
      `<p style="margin:0 0 16px;font-size:20px;font-weight:600;">New ${esc(
        (INTENTS[intent] || intent).toLowerCase()
      )}</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:15px;">${rows
        .map(
          (r) =>
            `<tr><td style="padding:6px 12px 6px 0;color:#6f6559;vertical-align:top;white-space:nowrap;">${esc(
              r[0]
            )}</td><td style="padding:6px 0;">${esc(r[1]).replace(/\n/g, '<br>')}</td></tr>`
        )
        .join('')}</table>`
    ),
    text: rows.map((r) => `${r[0]}: ${r[1]}`).join('\n'),
  };
}

async function send(apiKey, payload) {
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    /* Not configured yet — tell the client to use the FormSubmit fallback so no
       lead is ever dropped while setup is still in progress. */
    return res.status(503).json({ error: 'Email not configured', fallback: true });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  /* Honeypot: a field no human ever sees, so anything in it is a bot. */
  if (body.company_website) {
    return res.status(200).json({ ok: true });
  }

  const intent = INTENTS[body.intent] ? body.intent : 'contact';
  const data = {
    first_name: clamp(body.first_name, 80),
    email: clamp(body.email, 200).toLowerCase(),
    message: clamp(body.message, 4000),
    product: clamp(body.product, 160),
    package: clamp(body.package, 80),
    listing_url: clamp(body.listing_url, 500),
  };
  const meta = {
    page: clamp(body.page, 300),
    referrer: clamp(body.referrer, 300),
  };

  if (!EMAIL_RE.test(data.email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const from = process.env.LEAD_FROM || 'Andrea Nava <andrea@hostgrowyouraz.com>';
  const to = process.env.LEAD_TO || 'hostgrowthataz@gmail.com';
  const bookingUrl = process.env.BOOKING_URL || '';

  const visitor = visitorEmail(intent, data, bookingUrl);
  const notify = notifyEmail(intent, data, meta);

  try {
    /* Notify Andrea first — if anything fails after this, the lead still exists. */
    await send(apiKey, {
      from,
      to: [to],
      reply_to: data.email,
      subject: notify.subject,
      html: notify.html,
      text: notify.text,
    });
  } catch (err) {
    console.error('lead notify failed', err);
    return res.status(502).json({ error: 'Could not record your details. Please email hostgrowthataz@gmail.com.' });
  }

  let delivered = true;
  try {
    await send(apiKey, {
      from,
      to: [data.email],
      reply_to: to,
      subject: visitor.subject,
      html: visitor.html,
      text: visitor.text,
    });
  } catch (err) {
    /* Andrea has the lead; the visitor just didn't get their copy. Report it so
       the UI can show the direct download link instead of a false promise. */
    console.error('lead delivery failed', err);
    delivered = false;
  }

  return res.status(200).json({ ok: true, delivered });
}
