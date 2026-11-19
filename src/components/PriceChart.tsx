import { useEffect, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { History } from '../api';
import type { Formatters } from '../format';
import type { Theme } from '../hooks';

interface Props {
  history: History;
  theme: Theme;
  fmt: Formatters;
  intraday: boolean;
  rangeLabel: string;
}

interface Hover {
  time: number;
  price: number;
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function PriceChart({ history, theme, fmt, intraday, rangeLabel }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const area = useRef<ISeriesApi<'Area'> | null>(null);
  const volume = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const first = history.prices[0]?.value;
  const last = history.prices[history.prices.length - 1]?.value;
  const up = last >= first;

  // Create the chart once; the effects below only update it.
  useEffect(() => {
    const c = createChart(host.current!, {
      autoSize: true,
      handleScroll: false,
      handleScale: false,
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { labelVisible: false, style: LineStyle.Dashed },
        horzLine: { style: LineStyle.Dashed },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
    });
    area.current = c.addAreaSeries({ lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
    area.current.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.24 } });
    volume.current = c.addHistogramSeries({
      priceScaleId: '',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.current.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    c.subscribeCrosshairMove((param) => {
      const point = param.seriesData.get(area.current!) as { value?: number } | undefined;
      if (!param.time || point?.value == null) setHover(null);
      else setHover({ time: param.time as number, price: point.value });
    });

    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
    };
  }, []);

  // Colours come from the CSS tokens so the chart follows the theme.
  useEffect(() => {
    chart.current?.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: cssVar('--surface') },
        textColor: cssVar('--text-muted'),
        fontFamily: cssVar('--font-sans'),
        fontSize: 11,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: cssVar('--grid') } },
      crosshair: {
        vertLine: { color: cssVar('--text-faint') },
        horzLine: { color: cssVar('--text-faint'), labelBackgroundColor: cssVar('--text') },
      },
      localization: { priceFormatter: (v: number) => fmt.axis(v) },
      timeScale: { timeVisible: intraday, secondsVisible: false },
    });
    const tone = up ? 'up' : 'down';
    area.current?.applyOptions({
      lineColor: cssVar(`--${tone}`),
      topColor: cssVar(`--${tone}-fill`),
      bottomColor: 'rgba(0,0,0,0)',
      crosshairMarkerBackgroundColor: cssVar(`--${tone}`),
    });
    volume.current?.applyOptions({ color: cssVar('--volume') });
  }, [theme, up, fmt, intraday]);

  useEffect(() => {
    area.current?.setData(history.prices.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    volume.current?.setData(history.volumes.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    chart.current?.timeScale().fitContent();
  }, [history]);

  const change = first ? ((last - first) / first) * 100 : null;

  return (
    <div className="chart">
      <div className="chart-legend" aria-live="polite">
        {hover ? (
          <>
            <strong className="num">{fmt.price(hover.price)}</strong>
            <span className="muted">{fmt.date(hover.time, intraday)}</span>
          </>
        ) : (
          <>
            <span className={`pill ${up ? 'up' : 'down'}`}>{fmt.pct(change)}</span>
            <span className="muted">over {rangeLabel}</span>
          </>
        )}
      </div>
      <div ref={host} className="chart-canvas" role="img" aria-label={`Price chart, ${fmt.pct(change)} over ${rangeLabel}`} />
    </div>
  );
}
