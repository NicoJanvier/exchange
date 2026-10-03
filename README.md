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

Bump `CACHE` in `sw.js` when a **non-HTML** asset changes (`icons/`, `manifest.json`, `fonts/`) —
those are cache-first. `index.html` is network-first, so it doesn't need a bump. The version
tracks published deploys, not edits: bump it once per shipped change, not per edit.

## Design

The look follows [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) (MIT):
warm parchment card, earth-brown ink (never black), mint accent, 50px pill controls, yellow
input focus, 3D "game button" shadow on primary buttons only, swallowtail ribbon title.
The library is React; this app is not, so the styles are re-implemented in plain CSS from its
design-system specs rather than imported. Its tokens live on `:root` in `index.html`. The
library has no dark theme — the dark palette here is our own navy "starry night" variant.

Two deliberate departures from its rules: the currency sheet uses the Drawer look on desktop
too, not the blob-clipped Modal (a long scrolling list doesn't survive an organic clip-path),
and the swap/refresh buttons are circles rather than pills.

## Fonts

Nunito (SIL OFL 1.1), latin subset, variable weight — self-hosted in `fonts/` and precached
by the service worker so the type survives offline.

## Icons

[naive-icons](https://github.com/guokaigdg/naive-icons) v1.3.0, MIT licensed —
`arrow-up`, `arrow-down`, `refresh`, `chevron-down`, `search`, `cloud`, `close`. The SVGs are
inlined as a sprite in `index.html` rather than loaded from a CDN, so the page stays
self-contained and works offline. Their `#2A2A2A` outline is swapped for `currentColor` so it
follows the theme's ink; the accent fills are kept.

App icons live in `icons/`: `icon.svg` (favicon + manifest "any"), `icon-maskable.svg`
(full-bleed, art inside the 80% safe zone), and PNGs rendered from those two —
`favicon-32`, `apple-touch-icon` (180, iOS ignores SVG), `icon-192`/`icon-512` and
`icon-maskable-512` for Android installs. Re-render the PNGs whenever the SVGs change.

The bell bag in the title and app icon is our own drawing in the same style (the set has no
such icon) — a nod to the island-life games, not a copy of their artwork.

## Credits & licenses

- **animal-island-ui** — visual language (tokens, shapes, component specs), re-implemented in CSS.
  Copyright (c) 2026 guokaigdg. MIT License.
- **naive-icons** — the inlined icon sprite (outline colour adjusted).
  Copyright (c) 2026 Naive Icons. MIT License.
- **Nunito** — `fonts/nunito-latin-wght.woff2`.
  Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito).
  SIL Open Font License 1.1 — https://openfontlicense.org

Both MIT-licensed works above are used under these terms:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software
> and associated documentation files (the "Software"), to deal in the Software without
> restriction, including without limitation the rights to use, copy, modify, merge, publish,
> distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
> Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or
> substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
> BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
> NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
> DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The bell bag and the dark "starry night" palette are original to this project.
