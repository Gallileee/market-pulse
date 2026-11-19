import { useEffect, useMemo, useRef, useState } from 'react';
import type { Coin } from '../api';
import { trend, type Formatters } from '../format';
import { useFlash } from '../hooks';
import { Sparkline } from './Sparkline';

type SortKey = 'rank' | 'name' | 'price' | 'h1' | 'h24' | 'd7' | 'mcap' | 'volume';
type View = 'all' | 'watch';

const sortValue: Record<SortKey, (c: Coin) => number | string> = {
  rank: (c) => c.market_cap_rank,
  name: (c) => c.name.toLowerCase(),
  price: (c) => c.current_price,
  h1: (c) => c.price_change_percentage_1h_in_currency ?? -Infinity,
  h24: (c) => c.price_change_percentage_24h_in_currency ?? -Infinity,
  d7: (c) => c.price_change_percentage_7d_in_currency ?? -Infinity,
  mcap: (c) => c.market_cap,
  volume: (c) => c.total_volume,
};

const columns: { key: SortKey; label: string; className?: string }[] = [
  { key: 'rank', label: '#', className: 'col-rank' },
  { key: 'name', label: 'Coin', className: 'col-name' },
  { key: 'price', label: 'Price', className: 'right' },
  { key: 'h1', label: '1h', className: 'right hide-md' },
  { key: 'h24', label: '24h', className: 'right' },
  { key: 'd7', label: '7d', className: 'right hide-sm' },
  { key: 'mcap', label: 'Market cap', className: 'right hide-md' },
  { key: 'volume', label: 'Volume 24h', className: 'right hide-lg' },
];

interface Props {
  coins?: Coin[];
  fmt: Formatters;
  selectedId: string;
  onSelect: (id: string) => void;
  watchlist: string[];
  onToggleWatch: (id: string) => void;
}

export function MarketTable({ coins, fmt, selectedId, onSelect, watchlist, onToggleWatch }: Props) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'rank', dir: 1 });
  const search = useRef<HTMLInputElement>(null);

  // "/" jumps to search, like on GitHub.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rows = useMemo(() => {
    if (!coins) return [];
    const q = query.trim().toLowerCase();
    const get = sortValue[sort.key];
    return coins
      .filter((c) => view === 'all' || watchlist.includes(c.id))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
      .sort((a, b) => {
        const x = get(a);
        const y = get(b);
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      });
  }, [coins, query, view, sort, watchlist]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'rank' || key === 'name' ? 1 : -1 },
    );

  return (
    <section className="card table-card" aria-label="Markets">
      <div className="table-toolbar">
        <div className="segmented" role="tablist" aria-label="Which coins to show">
          <button role="tab" aria-selected={view === 'all'} onClick={() => setView('all')}>
            Top 50
          </button>
          <button role="tab" aria-selected={view === 'watch'} onClick={() => setView('watch')}>
            Watchlist <span className="count">{watchlist.length}</span>
          </button>
        </div>
        <label className="search">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M8.5 3a5.5 5.5 0 1 0 3.4 9.8l3.6 3.7 1.1-1.1-3.7-3.6A5.5 5.5 0 0 0 8.5 3Zm0 1.6a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8Z" />
          </svg>
          <input
            ref={search}
            type="search"
            placeholder="Search coins"
            aria-label="Search coins by name or symbol"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="col-star"><span className="sr-only">Watchlist</span></th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.className}
                  aria-sort={sort.key === col.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                >
                  <button className="sort" onClick={() => toggleSort(col.key)}>
                    {col.label}
                    <span className="sort-arrow" aria-hidden="true">
                      {sort.key === col.key ? (sort.dir === 1 ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
              ))}
              <th className="right hide-sm">Last 7 days</th>
            </tr>
          </thead>
          <tbody>
            {!coins &&
              Array.from({ length: 10 }, (_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan={10}>
                    <div className="skeleton" style={{ height: 18 }} />
                  </td>
                </tr>
              ))}
            {rows.map((coin) => (
              <Row
                key={coin.id}
                coin={coin}
                fmt={fmt}
                selected={coin.id === selectedId}
                watched={watchlist.includes(coin.id)}
                onSelect={onSelect}
                onToggleWatch={onToggleWatch}
              />
            ))}
          </tbody>
        </table>
        {coins && rows.length === 0 && (
          <p className="empty">
            {view === 'watch' && !query
              ? 'Your watchlist is empty. Star a coin to keep it here.'
              : `Nothing matches “${query}”.`}
          </p>
        )}
      </div>
    </section>
  );
}

interface RowProps {
  coin: Coin;
  fmt: Formatters;
  selected: boolean;
  watched: boolean;
  onSelect: (id: string) => void;
  onToggleWatch: (id: string) => void;
}

function Row({ coin, fmt, selected, watched, onSelect, onToggleWatch }: RowProps) {
  const flash = useFlash(coin.current_price);
  const change = (v: number | null, className = '') => (
    <td className={`right num ${trend(v)} ${className}`}>{fmt.pct(v)}</td>
  );

  return (
    <tr className={selected ? 'selected' : undefined} onClick={() => onSelect(coin.id)}>
      <td className="col-star">
        <button
          className={`star ${watched ? 'on' : ''}`}
          aria-pressed={watched}
          aria-label={`${watched ? 'Remove' : 'Add'} ${coin.name} ${watched ? 'from' : 'to'} watchlist`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatch(coin.id);
          }}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m10 2.5 2.3 4.9 5.2.6-3.9 3.6 1 5.2L10 14.2l-4.6 2.6 1-5.2-3.9-3.6 5.2-.6Z" />
          </svg>
        </button>
      </td>
      <td className="col-rank muted num">{coin.market_cap_rank}</td>
      <td className="col-name">
        <button className="coin" onClick={() => onSelect(coin.id)} aria-current={selected || undefined}>
          <img src={coin.image} alt="" width={24} height={24} loading="lazy" />
          <span className="coin-name" title={coin.name}>{coin.name}</span>
          <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
        </button>
      </td>
      <td className={`right num price ${flash ? `flash-${flash}` : ''}`}>{fmt.price(coin.current_price)}</td>
      {change(coin.price_change_percentage_1h_in_currency, 'hide-md')}
      {change(coin.price_change_percentage_24h_in_currency)}
      {change(coin.price_change_percentage_7d_in_currency, 'hide-sm')}
      <td className="right num hide-md">{fmt.compact(coin.market_cap)}</td>
      <td className="right num hide-lg">{fmt.compact(coin.total_volume)}</td>
      <td className="right hide-sm">
        <Sparkline values={coin.sparkline_in_7d?.price ?? []} />
      </td>
    </tr>
  );
}
