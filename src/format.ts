import type { Currency } from './api';

export interface Formatters {
  price(v: number | null | undefined): string;
  /** Shorter price for chart axes: no cents once the price is in the thousands. */
  axis(v: number): string;
  compact(v: number | null | undefined): string;
  number(v: number | null | undefined): string;
  pct(v: number | null | undefined): string;
  date(unixSeconds: number, withTime: boolean): string;
}

const DASH = '—';

export function makeFormatters(currency: Currency): Formatters {
  const base = {
    style: 'currency',
    currency: currency.toUpperCase(),
    currencyDisplay: 'narrowSymbol',
  } as const;
  const regular = new Intl.NumberFormat('en-US', { ...base, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Sub-unit coins need significant digits, not two decimals (0.00 is useless).
  const tiny = new Intl.NumberFormat('en-US', { ...base, minimumSignificantDigits: 2, maximumSignificantDigits: 4 });
  const compact = new Intl.NumberFormat('en-US', { ...base, notation: 'compact', maximumFractionDigits: 2 });
  const number = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
  const whole = new Intl.NumberFormat('en-US', { ...base, maximumFractionDigits: 0 });

  const price = (v: number | null | undefined) =>
    v == null ? DASH : Math.abs(v) >= 1 ? regular.format(v) : tiny.format(v);

  return {
    price,
    axis: (v) => (Math.abs(v) >= 1000 ? whole.format(v) : price(v)),
    compact: (v) => (v == null ? DASH : compact.format(v)),
    number: (v) => (v == null ? DASH : number.format(v)),
    pct: (v) => {
      if (v == null || !Number.isFinite(v)) return DASH;
      const t = trend(v);
      return t === 'flat' ? '0.00%' : `${t === 'up' ? '+' : ''}${v.toFixed(2)}%`;
    },
    date: (s, withTime) =>
      new Date(s * 1000).toLocaleString(
        'en-GB',
        withTime
          ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
          : { day: 'numeric', month: 'short', year: 'numeric' },
      ),
  };
}

export type Trend = 'up' | 'down' | 'flat';

export function trend(v: number | null | undefined): Trend {
  // Anything that rounds to 0.00% is "flat"; avoids a red "-0.00%" on stablecoins.
  if (v == null || !Number.isFinite(v) || Math.abs(v) < 0.005) return 'flat';
  return v > 0 ? 'up' : 'down';
}
