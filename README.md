# HostGrowthatAZ

Production source for **[hostgrowyouraz.com](https://hostgrowyouraz.com)** — the Host Grow Your AZ site.

Arizona short-term-rental listing optimization and revenue strategy, by Andrea Nava, former Airbnb Market Manager.

## Stack

Static HTML, CSS, and vanilla JS. No build step, no framework, no dependencies. Deployed on Vercel from the repository root.

## Layout

```
index.html              Home
pages/                  About, Services, Pricing, Calculator, FAQ,
                        Resources, Partners, Contact, Order Confirmed
pages/legal/            Privacy, Terms, Sales & Refund, Affiliate
                        Disclosure, Accessibility, Cookie Policy
style.css               Site styles + design tokens
base.css                Resets and base typography
app.js                  Nav, theme toggle, shared behavior
analytics.js            GA4 + Consent Mode v2 banner
resources.js            Lead capture + guide downloads
calculator.js           Revenue calculator
contact.js              Contact form
assets/                 Images, brand, downloadable guides
robots.txt sitemap.xml  Crawl directives (16 pages)
```

## Conventions

Sixteen pages, all sharing one header and footer. When editing anything global, apply it across all sixteen.

**Two disclaimers are legally mandated and must not be altered or removed.** The platform-affiliation disclaimer appears in the footer of every page. The results disclaimer appears on five pages plus `order-confirmed.html`.

**Credential accuracy matters.** The approved phrasing is "Former Airbnb Market Manager." Never imply any current affiliation with, or endorsement by, Airbnb or any other booking platform.

**Never promise guaranteed rankings, bookings, occupancy, revenue, or visibility.**

Commerce runs on Stripe Payment Links. All links redirect to `pages/order-confirmed.html`. Prices and delivery dates appear in the page copy, in the `ItemList` JSON-LD schema, and in Stripe — all three must be kept in sync.

Analytics is GA4 `G-R51YJX0NJK`, gated behind consent (default denied, Global Privacy Control honored). Track events through `window.hgTrack(name, params)`.

## Local preview

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Deploying

Vercel deploys from the repository root; `.vercelignore` excludes `.git` and `.vercel`.

**Changes are reviewed and approved before going live.** Preview first, confirm, then push.
