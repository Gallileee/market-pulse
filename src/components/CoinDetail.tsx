import type { Coin, History, Range } from '../api';
import { trend, type Formatters } from '../format';
import type { AsyncState, Theme } from '../hooks';
import { PriceChart } from './PriceChart';

const RANGES: { value: Range; label: string; long: string }[] = [
  { value: '1', label: '24H', long: '24 hours' },
  { value: '7', label: '7D', long: '7 days' },
  { value: '30', label: '1M', long: '1 month' },
  { value: '90', label: '3M', long: '3 months' },
  { value: '365', label: '1Y', long: '1 year' },
];

interface Props {
  coin?: Coin;
  history: AsyncState<History>;
  range: Range;
  onRange: (r: Range) => void;
  fmt: Formatters;
  theme: Theme;
}

export function CoinDetail({ coin, history, range, onRange, fmt, theme }: Props) {
  const current = RANGES.find((r) => r.value === range)!;

  if (!coin) {
    return (
      <section className="card detail" aria-busy="true">
        <div className="skeleton" style={{ width: '50%', height: 28 }} />
        <div className="skeleton" style={{ width: '35%', height: 36, marginTop: 14 }} />
        <div className="skeleton" style={{ height: 300, marginTop: 20 }} />
      </section>
    );
  }

  const change24 = coin.price_change_percentage_24h_in_currency;
  const low = coin.low_24h ?? coin.current_price;
  const high = coin.high_24h ?? coin.current_price;
  const dayPos = high > low ? ((coin.current_price - low) / (high - low)) * 100 : 50;
  const supplyPct = coin.max_supply ? (coin.circulating_supply / coin.max_supply) * 100 : null;

  return (
    <section className="card detail" aria-label={`${coin.name} details`}>
      <header className="detail-head">
        <img src={coin.image} alt="" width={36} height={36} />
        <div>
          <h2>
            {coin.name} <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
          </h2>
          <span className="chip">Rank #{coin.market_cap_rank}</span>
        </div>
      </header>

      <div className="detail-price">
        <span className="big num">{fmt.price(coin.current_price)}</span>
        <span className={`pill ${trend(change24)}`}>{fmt.pct(change24)} 24h</span>
      </div>

      <div className="segmented small" role="tablist" aria-label="Chart range">
        {RANGES.map((r) => (
          <button key={r.value} role="tab" aria-selected={r.value === range} onClick={() => onRange(r.value)}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="chart-wrap">
        {history.data ? (
          <PriceChart
            history={history.data}
            theme={theme}
            fmt={fmt}
            intraday={range === '1' || range === '7'}
            rangeLabel={current.long}
          />
        ) : history.error ? (
          <div className="chart-placeholder">
            <p>{history.error.message}</p>
            <button className="btn" onClick={history.reload}>Try again</button>
          </div>
        ) : (
          <div className="chart-placeholder skeleton" aria-label="Loading chart" />
        )}
      </div>

      <div className="range-bar">
        <div className="range-labels">
          <span className="muted">24h low</span>
          <span className="muted">24h high</span>
        </div>
        <div className="range-track" role="img" aria-label={`Current price is ${dayPos.toFixed(0)}% of the way from the 24 hour low to the high`}>
          <span className="range-fill" style={{ width: `${dayPos}%` }} />
          <span className="range-marker" style={{ left: `${dayPos}%` }} />
        </div>
        <div className="range-labels num">
          <span>{fmt.price(low)}</span>
          <span>{fmt.price(high)}</span>
        </div>
      </div>

      <dl className="stats">
        <div>
          <dt>Market cap</dt>
          <dd className="num">{fmt.compact(coin.market_cap)}</dd>
        </div>
        <div>
          <dt>Volume 24h</dt>
          <dd className="num">{fmt.compact(coin.total_volume)}</dd>
        </div>
        <div>
          <dt>All-time high</dt>
          <dd className="num">
            {fmt.price(coin.ath)} <small className={trend(coin.ath_change_percentage)}>{fmt.pct(coin.ath_change_percentage)}</small>
          </dd>
        </div>
        <div>
          <dt>Circulating supply</dt>
          <dd className="num">
            {fmt.number(coin.circulating_supply)} {coin.symbol.toUpperCase()}
            {supplyPct != null && (
              <span className="mini-bar" title={`${supplyPct.toFixed(1)}% of max supply`}>
                <span style={{ width: `${supplyPct}%` }} />
              </span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
