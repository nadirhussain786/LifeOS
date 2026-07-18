import { format } from 'date-fns';
import { CalendarClock, CheckCircle2, Target } from 'lucide-react-native';
import { View } from 'react-native';

import { HeroCard } from '@/components/ui/hero-card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Text } from '@/components/ui/text';
import { formatProgressPercent } from '@/features/goals/services/goal-format';
import { alpha } from '@/lib/color';

type Props = {
  activeCount: number;
  completedCount: number;
  avgProgress: number;
  nextDue: number | null;
};

const GOALS_TINT = '#f97316';
const WHITE = '#ffffff';

export function GoalsStatsHeader({ activeCount, completedCount, avgProgress, nextDue }: Props) {
  const rows = [
    { icon: Target, text: `${activeCount} active ${activeCount === 1 ? 'goal' : 'goals'}` },
    { icon: CheckCircle2, text: `${completedCount} completed` },
    { icon: CalendarClock, text: nextDue ? `Next due ${format(nextDue, 'MMM d')}` : 'No deadlines set' },
  ];

  return (
    <HeroCard tint={GOALS_TINT}>
      <View className="flex-row items-center gap-5">
        <ProgressRing progress={avgProgress} size={104} strokeWidth={10} color={WHITE} trackColor={alpha(WHITE, 0.25)}>
          <View className="items-center">
            <Text className="font-sora-extrabold text-xl" style={{ color: WHITE }}>
              {formatProgressPercent(avgProgress)}
            </Text>
            <Text style={{ color: alpha(WHITE, 0.8), fontSize: 11 }}>avg</Text>
          </View>
        </ProgressRing>

        <View className="flex-1 gap-2.5">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <View key={row.text} className="flex-row items-center gap-2">
                <Icon size={15} color={WHITE} />
                <Text className="font-sora-medium" style={{ color: WHITE }}>
                  {row.text}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </HeroCard>
  );
}
