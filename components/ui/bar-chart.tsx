import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type BarDatum = {
  label: string;
  value: number;
  /** Emphasize this bar (e.g. today, or an over-budget month). */
  highlight?: boolean;
  /** Per-bar override color; falls back to the chart color. */
  color?: string;
};

type Props = {
  data: BarDatum[];
  height?: number;
  color?: string;
  /** Draw a dashed reference line at this value (e.g. the sleep goal). */
  goalValue?: number;
  /** Force the top of the scale; defaults to the max datum (or goal). */
  maxValue?: number;
  /** Show only every Nth x-axis label to avoid crowding (month views). */
  labelEvery?: number;
};

function Bar({ heightRatio, color, delay, barHeight }: { heightRatio: number; color: string; delay: number; barHeight: number }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withDelay(delay, withTiming(heightRatio, { duration: 550 }));
  }, [grow, heightRatio, delay]);

  const style = useAnimatedStyle(() => ({ height: Math.max(2, grow.value * barHeight) }));

  return (
    <View style={{ flex: 1, height: barHeight, justifyContent: 'flex-end', alignItems: 'center' }}>
      <Animated.View style={[style, { width: '72%', maxWidth: 22, borderRadius: 5, backgroundColor: color }]} />
    </View>
  );
}

/**
 * Minimal animated bar chart built from Views (no chart lib — the app only
 * ships react-native-svg). Bars grow on mount with a staggered delay, and an
 * optional dashed goal line overlays the plot. Deliberately generic so Sleep
 * (duration), Study (focus minutes) and Budget (monthly spend) share it.
 */
export function BarChart({ data, height = 160, color, goalValue, maxValue, labelEvery = 1 }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const barColor = color ?? colors[scheme].accent;

  const dataMax = data.reduce((max, d) => Math.max(max, d.value), 0);
  const scaleMax = Math.max(maxValue ?? 0, goalValue ?? 0, dataMax, 1);
  const plotHeight = height - 22; // reserve space for labels

  return (
    <View style={{ height }}>
      <View style={{ height: plotHeight, position: 'relative' }}>
        {goalValue !== undefined && goalValue > 0 && goalValue <= scaleMax && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: (goalValue / scaleMax) * plotHeight,
              borderBottomWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors[scheme].mutedForeground,
              opacity: 0.5,
            }}
          />
        )}
        <View style={{ flexDirection: 'row', height: plotHeight, gap: 6, alignItems: 'flex-end' }}>
          {data.map((datum, index) => (
            <Bar
              key={`${datum.label}-${index}`}
              heightRatio={datum.value / scaleMax}
              barHeight={plotHeight}
              delay={index * 35}
              color={datum.highlight ? colors[scheme].foreground : datum.color ?? barColor}
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {data.map((datum, index) => (
          <View key={`label-${index}`} style={{ flex: 1, alignItems: 'center' }}>
            {index % labelEvery === 0 ? (
              <Text variant="caption" numberOfLines={1} style={{ fontSize: 10 }}>
                {datum.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
