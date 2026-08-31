# Exchange

Offline-first currency converter. One pair, one big number.
Live at [exchange.janvier.dev](https://exchange.janvier.dev).

- Zero build. One `index.html` with inline CSS + JS, a service worker, a manifest.
- Rates from [Frankfurter v2](https://frankfurter.dev) — no key, 165 live currencies,
  84 central banks and official sources.
- Cached locally, so it converts with no signal.
- Any pair can be overridden by hand — the rate the kiosk actually gave you, or the
  only option when there's no cache yet.

## Run locally

```sh
python3 -m http.server 5173     # or: npx serve -l 5173 .
```

On `localhost` the service worker is **bypassed**, and any worker or `exchange-*` cache left
over from a previous session is unregistered and deleted on load. Otherwise the worker would
serve a cached `index.html` and hide every edit until `CACHE` changed — and since all the CSS
and JS is inline, that means hiding the entire app.

To test offline behaviour locally, opt in with **`?sw=1`**:

```
http://localhost:5173/?sw=1
```

Then DevTools → Network → Offline. Drop the flag and reload to go back to plain dev.

`file://` won't work either way: service workers need a real origin.

## How a rate is chosen

`resolveRate(from, to)` tries, in order:

1. **manual override** for the pair, or the inverse of the opposite pair — badge `manual`
2. **live** rates fetched this session — badge `31 Aug`
3. **cached** rates from `localStorage` — badge `31 Aug · cached`
4. **nothing** — the manual field becomes the primary action — badge `no rate — set one`

A rate older than 7 days also gets a `stale` marker. Rate age is per currency, not per
fetch: `/v2/rates` carries a `date` on every row, and some sources lag (KPW was 12 days
behind on the day this was written).

## Storage

```
xch:rates       the /v2/rates array, exactly as the API returned it
xch:currencies  the /v2/currencies array, exactly as the API returned it
xch:ui          { from, to, amount, recent }
xch:overrides   { "EUR/DKK": { rate, setAt } }
```

API bodies are stored **verbatim** — no wrapper, no normalized copy, no invented
`fetchedAt`. Cached and freshly-fetched rates are therefore the same type, so there is one
render path and no mapper to keep in sync. Lookup indexes on read
(`Object.fromEntries(rates.map(r => [r.quote, r]))`), keeping whole rows so each
currency's own date survives. Conversion is a cross-rate off a single EUR-based fetch:
`amount * rates[to].rate / rates[from].rate`. The base has a self-row (`EUR: 1.0`), so
that formula needs no special case.

## Refresh

No TTL logic of our own. Every load just fetches; the API sends
`cache-control: max-age=<until next publish>, stale-if-error=86400`, so the browser's HTTP
cache is the throttle. On failure the app falls back to `localStorage`. The service worker
deliberately **does not** intercept cross-origin requests — a cache-first handler would pin
a stale rate forever.

## Deploy

Push to `main` → GitHub Actions → Pages.

Bump `CACHE` in `sw.js` when a **non-HTML** asset changes (`icon.svg`, `manifest.json`) —
those are cache-first. `index.html` is network-first, so it doesn't need a bump. The version
tracks published deploys, not edits: it stays at `v1` until something actually ships.

## Icons

[Lucide](https://lucide.dev) v1.38.0, ISC licensed — `arrow-right-left`, `arrow-up-down`,
`refresh-cw`, `wifi-off`, `chevron-down`, `chevron-right`. The paths are inlined as an SVG
sprite in `index.html` rather than loaded from a CDN, so the page stays self-contained and
works offline. They inherit `currentColor`, so both themes are covered by one copy.

> ISC License. Copyright (c) 2026 Lucide Icons and Contributors.
> Permission to use, copy, modify, and/or distribute this software for any purpose with or
> without fee is hereby granted, provided that the above copyright notice and this permission
> notice appear in all copies.
