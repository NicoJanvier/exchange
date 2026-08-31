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
npx serve -l 5173 .
```

Real HTTP is required: service workers don't register over `file://`.

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

Push to `main` → GitHub Actions → Pages. Bump `CACHE` in `sw.js` on every deploy, or
clients keep the old shell until it changes.
