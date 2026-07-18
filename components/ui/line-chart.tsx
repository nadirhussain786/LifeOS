import { useId, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { alpha } from '@/lib/color';

export type SeriesPoint = { t: number; v: number };

type Props = {
  /** Points with v in 0–1, plotted over [rangeStart, rangeEnd]. */
  series: SeriesPoint[];
  color: string;
  height?: number;
  rangeStart: number;
  rangeEnd: number;
  /** Draw a dashed diagonal from (rangeStart, 0) to (rangeEnd, 1) — the ideal
   * pace a time-bound goal should follow. */
  showExpected?: boolean;
};

const PAD = 6;

/**
 * Minimal area+line chart for a 0–1 series over a time range (hand-rolled on
 * react-native-svg — the app ships no chart lib). Fills under the line with a
 * vertical gradient and can overlay a dashed "expected pace" line so a goal's
 * actual trajectory reads against where it should be. Width is measured via
 * onLayout so it fits any container.
 */
export function LineChart({ series, color, height = 160, rangeStart, rangeEnd, showExpected }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const fillId = `lc${useId().replace(/:/g, '')}`;
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const plotW = Math.max(1, width - PAD * 2);
  const plotH = height - PAD * 2;
  const span = Math.max(1, rangeEnd - rangeStart);

  const xFor = (t: number) => PAD + (Math.max(rangeStart, Math.min(rangeEnd, t)) - rangeStart) / span * plotW;
  const yFor = (v: number) => PAD + (1 - Math.max(0, Math.min(1, v))) * plotH;

  const sorted = [...series].sort((a, b) => a.t - b.t);
  const linePath = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.t).toFixed(1)} ${yFor(p.v).toFixed(1)}`).join(' ');
  const areaPath =
    sorted.length > 0
      ? `${linePath} L ${xFor(sorted[sorted.length - 1].t).toFixed(1)} ${(PAD + plotH).toFixed(1)} L ${xFor(sorted[0].t).toFixed(1)} ${(PAD + plotH).toFixed(1)} Z`
      : '';

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={alpha(color, 0.35)} />
              <Stop offset="100%" stopColor={alpha(color, 0.02)} />
            </LinearGradient>
          </Defs>

          {/* 50% & 100% guide lines */}
          {[0, 0.5, 1].map((g) => (
            <Line key={g} x1={PAD} y1={yFor(g)} x2={PAD + plotW} y2={yFor(g)} stroke={colors[scheme].border} strokeWidth={1} strokeDasharray="2 4" opacity={0.5} />
          ))}

          {showExpected && (
            <Line
              x1={xFor(rangeStart)}
              y1={yFor(0)}
              x2={xFor(rangeEnd)}
              y2={yFor(1)}
              stroke={colors[scheme].mutedForeground}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              opacity={0.7}
            />
          )}

          {areaPath ? <Path d={areaPath} fill={`url(#${fillId})`} /> : null}
          {linePath ? <Path d={linePath} stroke={color} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
        </Svg>
      )}
    </View>
  );
}
