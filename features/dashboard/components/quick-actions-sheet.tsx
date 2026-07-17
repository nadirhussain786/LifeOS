import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BookOpen, CheckSquare, Clock3, Repeat, StickyNote, type LucideIcon } from 'lucide-react-native';
import { forwardRef, useCallback } from 'react';
import { Pressable, useColorScheme } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { toDateKey } from '@/lib/date';

type Action = {
  label: string;
  icon: LucideIcon;
  getHref: () => '/task/new' | '/note/new' | '/habit/new' | `/journal/${string}` | { pathname: '/timeline/event/new'; params: { date: string } };
};

const ACTIONS: Action[] = [
  { label: 'New task', icon: CheckSquare, getHref: () => '/task/new' },
  { label: 'New note', icon: StickyNote, getHref: () => '/note/new' },
  { label: 'New journal entry', icon: BookOpen, getHref: () => `/journal/${toDateKey(new Date())}` },
  { label: 'New habit', icon: Repeat, getHref: () => '/habit/new' },
  { label: 'New event', icon: Clock3, getHref: () => ({ pathname: '/timeline/event/new', params: { date: toDateKey(new Date()) } }) },
];

export const QuickActionsSheet = forwardRef<BottomSheetModal>(function QuickActionsSheet(_props, ref) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    [],
  );

  const handleActionPress = (action: Action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (ref && 'current' in ref) {
      ref.current?.dismiss();
    }
    router.push(action.getHref());
  };

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors[scheme].card }}
      handleIndicatorStyle={{ backgroundColor: colors[scheme].border }}
    >
      <BottomSheetView className="gap-1 px-4 pb-8 pt-2">
        <Text variant="subheading" className="px-2 pb-2">
          Quick actions
        </Text>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => handleActionPress(action)}
            className="flex-row items-center gap-3 rounded-md px-2 py-3 active:bg-muted"
          >
            <action.icon color={colors[scheme].foreground} size={20} />
            <Text>{action.label}</Text>
          </Pressable>
        ))}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
