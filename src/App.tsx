import { useCallback, useMemo, useState } from 'react';
import { fetchGlobal, fetchHistory, fetchMarkets, type Currency, type Range } from './api';
import { makeFormatters } from './format';
import { useAsync, useLocalStorage, useNow, useTheme } from './hooks';
import { CoinDetail } from './components/CoinDetail';
import { MarketTable } from './components/MarketTable';
import { StatTiles } from './components/StatTiles';
import './App.css';

const CURRENCIES: Currency[] = ['usd', 'eur', 'czk'];
const REFRESH_MS = 60_000;

export default function App() {
  const { theme, toggle } = useTheme();
  const [currency, setCurrency] = useLocalStorage<Currency>('mp:currency', 'usd');
  const [watchlist, setWatchlist] = useLocalStorage<string[]>('mp:watchlist', ['bitcoin', 'ethereum']);
  const [selectedId, setSelectedId] = useState('bitcoin');
  const [range, setRange] = useState<Range>('7');

  const markets = useAsync((s) => fetchMarkets(currency, s), [currency], REFRESH_MS);
  const global = useAsync((s) => fetchGlobal(s), [], REFRESH_MS * 2);
  const history = useAsync((s) => fetchHistory(selectedId, currency, range, s), [selectedId, currency, range]);

  const fmt = useMemo(() => makeFormatters(currency), [currency]);
  const selected = markets.data?.find((c) => c.id === selectedId);

  const toggleWatch = useCallback(
    (id: string) => setWatchlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id])),
    [setWatchlist],
  );

  const select = useCallback((id: string) => {
    setSelectedId(id);
    // On narrow screens the detail panel sits above the table; bring it into view.
    if (matchMedia('(max-width: 1099px)').matches) {
      document.getElementById('detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const error = markets.error ?? global.error;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--accent)" />
            <path d="M5 17h5l3-7 5 13 3-6h6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Market Pulse</span>
        </div>

        <div className="topbar-actions">
          <LiveStatus
            updatedAt={markets.updatedAt}
            loading={markets.loading}
            onRefresh={() => {
              markets.reload();
              global.reload();
            }}
          />
          <div className="segmented" role="radiogroup" aria-label="Currency">
            {CURRENCIES.map((c) => (
              <button key={c} role="radio" aria-checked={c === currency} onClick={() => setCurrency(c)}>
                {c.toUpperCase()}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? (
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="3.6" />
                <path d="M10 1.5v2.3M10 16.2v2.3M1.5 10h2.3M16.2 10h2.3M4 4l1.6 1.6M14.4 14.4 16 16M4 16l1.6-1.6M14.4 5.6 16 4" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {error && (
        <div className="banner" role="alert">
          <span>{error.message}</span>
          <button
            className="btn"
            onClick={() => {
              markets.reload();
              global.reload();
            }}
          >
            Retry
          </button>
        </div>
      )}

      <main>
        <StatTiles global={global.data} coins={markets.data} currency={currency} fmt={fmt} />
        <div className="layout">
          <div id="detail" className="layout-detail">
            <CoinDetail coin={selected} history={history} range={range} onRange={setRange} fmt={fmt} theme={theme} />
          </div>
          <div className="layout-table">
            <MarketTable
              coins={markets.data}
              fmt={fmt}
              selectedId={selectedId}
              onSelect={select}
              watchlist={watchlist}
              onToggleWatch={toggleWatch}
            />
          </div>
        </div>
      </main>

      <footer className="footer muted">
        Data from the public{' '}
        <a href="https://www.coingecko.com/en/api" target="_blank" rel="noreferrer">
          CoinGecko API
        </a>
        , refreshed every minute. Not financial advice.
      </footer>
    </div>
  );
}

function LiveStatus({ updatedAt, loading, onRefresh }: { updatedAt?: number; loading: boolean; onRefresh: () => void }) {
  const now = useNow();
  const seconds = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const label = seconds == null ? 'Connecting…' : seconds < 5 ? 'Updated just now' : `Updated ${seconds}s ago`;
  return (
    <div className="live">
      <span className={`live-dot ${loading ? 'busy' : ''}`} aria-hidden="true" />
      <span className="live-label" aria-live="polite">{label}</span>
      <button className="icon-btn" onClick={onRefresh} disabled={loading} aria-label="Refresh data now">
        <svg viewBox="0 0 20 20" aria-hidden="true" className={loading ? 'spin' : undefined}>
          <path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.2h-3.2" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
