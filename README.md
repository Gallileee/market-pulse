# Market Pulse

A live crypto market dashboard: the top 50 coins with prices, 1h / 24h / 7d moves and
7-day sparklines, a detailed price chart with volume, market-wide stats and a personal watchlist.
Built with React, TypeScript and Vite on top of the free CoinGecko API, so it runs with no keys
and no backend.

**Live demo: https://gallileee.github.io/market-pulse/**

## What's in it

- **Market overview tiles**: total market cap with its 24 h change, 24 h volume, BTC / ETH
  dominance as a stacked bar, and market breadth (how many of the top 50 are up vs. down).
- **Market table**: sortable by any column, searchable (press `/` to jump to search), with a
  starred watchlist kept in `localStorage`. Prices flash green or red when a refresh moves them.
- **Coin detail**: an interactive area chart with volume bars (24H / 7D / 1M / 3M / 1Y), a
  crosshair legend showing the price and time under the cursor, the 24 h low–high range with
  the current price marked, and key stats (market cap, volume, all-time high, supply).
- **USD / EUR / CZK** switch, **light and dark theme** (follows the system, remembers your choice,
  no flash on load), and a layout that works from a phone up to a wide monitor.
- **Live data** refreshed every minute while the tab is visible, with a "updated Xs ago"
  indicator, a manual refresh button, skeleton loading states, and a readable error with a retry
  when the API's rate limit is hit.

## Running it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (http://localhost:5173 by default). `npm run build` type-checks and
produces a static build in `dist/` that can be hosted anywhere (Vercel, Netlify, GitHub Pages).

## How it's put together

| File | Role |
|---|---|
| `src/api.ts` | Typed CoinGecko client with a small in-memory cache, so switching coins, ranges and currencies doesn't burn the free rate limit. |
| `src/hooks.ts` | `useAsync` (loading / error / auto-refresh, drops stale data when the currency changes), `useLocalStorage`, `useTheme`, `useFlash`. |
| `src/format.ts` | Currency, percentage and compact-number formatting; sub-dollar coins get significant digits instead of `0.00`. |
| `src/components/PriceChart.tsx` | The main chart, built on TradingView's [Lightweight Charts](https://github.com/tradingview/lightweight-charts); colours come from the CSS theme tokens. |
| `src/components/Sparkline.tsx` | A dependency-free SVG sparkline for the table. |
| `src/components/MarketTable.tsx`, `CoinDetail.tsx`, `StatTiles.tsx` | The three main parts of the screen. |

Some details worth pointing out:

- The theme is a set of CSS custom properties. The chart reads the same tokens, so it switches
  theme together with the rest of the page.
- Accessibility: sort state is announced with `aria-sort`, the watchlist stars are toggle buttons
  with `aria-pressed`, the charts have text alternatives, and everything works from the keyboard.
- Animations respect `prefers-reduced-motion`.

## Data

Market data comes from the public [CoinGecko API](https://www.coingecko.com/en/api). The free tier
allows roughly 30 requests a minute, which the cache and the one-minute refresh stay well within.
If the API does answer "too many requests", the client backs off and retries, and keeps showing
the last good data instead of an empty screen.

Every push to `main` is built and published to GitHub Pages by `.github/workflows/deploy.yml`.
This is a demo project, not financial advice.
