// Thin client for the public CoinGecko API (no key needed).
// Responses are cached in memory so switching back and forth between coins,
// ranges and currencies doesn't burn through the free rate limit.

export type Currency = 'usd' | 'eur' | 'czk';
export type Range = '1' | '7' | '30' | '90' | '365';

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number | null;
  low_24h: number | null;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  circulating_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  sparkline_in_7d: { price: number[] };
}

export interface GlobalData {
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
  market_cap_change_percentage_24h_usd: number;
  active_cryptocurrencies: number;
}

export interface Point {
  time: number; // unix seconds
  value: number;
}

export interface History {
  prices: Point[];
  volumes: Point[];
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const BASE = 'https://api.coingecko.com/api/v3';
const cache = new Map<string, { at: number; data: unknown }>();

async function get<T>(path: string, ttlMs: number, signal?: AbortSignal): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;

  const res = await fetch(BASE + path, { signal });
  if (!res.ok) {
    throw new ApiError(
      res.status === 429
        ? 'The free API is rate limited (about 30 requests a minute). Give it a moment and retry.'
        : `The data provider answered with an error (${res.status}).`,
      res.status,
    );
  }
  const data = (await res.json()) as T;
  cache.set(path, { at: Date.now(), data });
  return data;
}

export function fetchMarkets(currency: Currency, signal?: AbortSignal) {
  return get<Coin[]>(
    `/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=50&page=1` +
      '&sparkline=true&price_change_percentage=1h,24h,7d',
    30_000,
    signal,
  );
}

export async function fetchGlobal(signal?: AbortSignal) {
  const res = await get<{ data: GlobalData }>('/global', 60_000, signal);
  return res.data;
}

// The chart library needs strictly increasing timestamps; the API occasionally
// repeats the last sample, so drop anything that doesn't move time forward.
function toPoints(rows: [number, number][]): Point[] {
  const out: Point[] = [];
  for (const [ms, value] of rows) {
    const time = Math.floor(ms / 1000);
    if (out.length && time <= out[out.length - 1].time) continue;
    out.push({ time, value });
  }
  return out;
}

export async function fetchHistory(
  id: string,
  currency: Currency,
  days: Range,
  signal?: AbortSignal,
): Promise<History> {
  const res = await get<{ prices: [number, number][]; total_volumes: [number, number][] }>(
    `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${currency}&days=${days}`,
    5 * 60_000,
    signal,
  );
  return { prices: toPoints(res.prices), volumes: toPoints(res.total_volumes) };
}
