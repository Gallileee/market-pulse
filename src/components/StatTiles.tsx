import type { Coin, Currency, GlobalData } from '../api';
import { trend, type Formatters } from '../format';

interface Props {
  global?: GlobalData;
  coins?: Coin[];
  currency: Currency;
  fmt: Formatters;
}

export function StatTiles({ global, coins, currency, fmt }: Props) {
  if (!global || !coins) {
    return (
      <section className="tiles" aria-busy="true" aria-label="Market overview">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="tile">
            <div className="skeleton" style={{ width: '45%', height: 12 }} />
            <div className="skeleton" style={{ width: '70%', height: 26, marginTop: 12 }} />
            <div className="skeleton" style={{ width: '100%', height: 6, marginTop: 16 }} />
          </div>
        ))}
      </section>
    );
  }

  const capChange = global.market_cap_change_percentage_24h_usd;
  const btc = global.market_cap_percentage.btc ?? 0;
  const eth = global.market_cap_percentage.eth ?? 0;
  const gainers = coins.filter((c) => (c.price_change_percentage_24h_in_currency ?? 0) > 0).length;
  const losers = coins.length - gainers;

  return (
    <section className="tiles" aria-label="Market overview">
      <div className="tile">
        <h2 className="tile-label">Total market cap</h2>
        <div className="tile-value num">{fmt.compact(global.total_market_cap[currency])}</div>
        <div className={`tile-foot ${trend(capChange)}`}>
          <span className="num">{fmt.pct(capChange)}</span> <span className="muted">in 24 h</span>
        </div>
      </div>

      <div className="tile">
        <h2 className="tile-label">24 h volume</h2>
        <div className="tile-value num">{fmt.compact(global.total_volume[currency])}</div>
        <div className="tile-foot muted">
          across {global.active_cryptocurrencies.toLocaleString('en-US')} coins
        </div>
      </div>

      <div className="tile">
        <h2 className="tile-label">Dominance</h2>
        <div className="tile-value num">
          BTC {btc.toFixed(1)}%
        </div>
        <div className="stack" role="img" aria-label={`Bitcoin ${btc.toFixed(1)}%, Ethereum ${eth.toFixed(1)}%, others ${(100 - btc - eth).toFixed(1)}%`}>
          <span style={{ width: `${btc}%`, background: 'var(--series-1)' }} />
          <span style={{ width: `${eth}%`, background: 'var(--series-2)' }} />
          <span style={{ flex: 1, background: 'var(--track)' }} />
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--series-1)' }} />BTC</span>
          <span><i style={{ background: 'var(--series-2)' }} />ETH {eth.toFixed(1)}%</span>
          <span><i style={{ background: 'var(--track)' }} />Other</span>
        </div>
      </div>

      <div className="tile">
        <h2 className="tile-label">Breadth · top {coins.length}</h2>
        <div className="tile-value num">
          <span className="up">{gainers}</span>
          <span className="muted"> / </span>
          <span className="down">{losers}</span>
        </div>
        <div className="stack" role="img" aria-label={`${gainers} coins up, ${losers} down in 24 hours`}>
          <span style={{ width: `${(gainers / coins.length) * 100}%`, background: 'var(--up)' }} />
          <span style={{ flex: 1, background: 'var(--down)' }} />
        </div>
        <div className="tile-foot muted">up vs. down in 24 h</div>
      </div>
    </section>
  );
}
