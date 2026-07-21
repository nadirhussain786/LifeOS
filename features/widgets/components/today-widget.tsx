import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { WIDGET_LINKS } from '@/features/widgets/config';
import type { TodaySnapshot } from '@/features/widgets/services/widget-snapshot';

/**
 * The "Today at a glance" home-screen widget: tasks due, habits left, and water
 * progress. Built with react-native-android-widget primitives (NOT React Native
 * View/Text) — this tree is rendered by the OS, so only widget components,
 * numeric dp sizes, Android system font families, and hex colors are allowed.
 * Tapping anywhere opens the app (clickAction OPEN_APP).
 */

// Self-contained dark palette — the widget can't read the app's theme tokens at
// render time, and a dark card reads well over most wallpapers.
type HexColor = `#${string}`;

const C = {
  bg: '#0f172a',
  muted: '#94a3b8',
  text: '#f8fafc',
  tasks: '#818cf8',
  habits: '#34d399',
  water: '#38bdf8',
} satisfies Record<string, HexColor>;

function liters(ml: number): string {
  return (ml / 1000).toFixed(1);
}

function Row({ color, text, uri }: { color: HexColor; text: string; uri: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', paddingVertical: 4 }}
    >
      <FlexWidget style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 10 }} />
      <TextWidget text={text} style={{ fontSize: 15, color: C.text, fontFamily: 'sans-serif-medium' }} />
    </FlexWidget>
  );
}

export function TodayWidget({ snapshot }: { snapshot: TodaySnapshot }) {
  const { tasksDue, habitsLeft, waterMl, waterGoalMl } = snapshot;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: C.bg,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 16,
      }}
    >
      <TextWidget text="TODAY" style={{ fontSize: 12, color: C.muted, fontFamily: 'sans-serif-medium', letterSpacing: 1 }} />
      <Row color={C.tasks} uri={WIDGET_LINKS.tasks} text={`${tasksDue} ${tasksDue === 1 ? 'task' : 'tasks'} due`} />
      <Row color={C.habits} uri={WIDGET_LINKS.habits} text={`${habitsLeft} ${habitsLeft === 1 ? 'habit' : 'habits'} left`} />
      <Row color={C.water} uri={WIDGET_LINKS.water} text={`${liters(waterMl)} / ${liters(waterGoalMl)} L water`} />
    </FlexWidget>
  );
}
