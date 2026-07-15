import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BookOpen, CheckSquare, Repeat, StickyNote, type LucideIcon } from 'lucide-react-native';
import { forwardRef, useCallback } from 'react';
import { Pressable, useColorScheme } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

type Action = {
  label: string;
  icon: LucideIcon;
  href: '/(tabs)/tasks' | '/(tabs)/notes' | '/(tabs)/journal' | '/(tabs)/habits';
};

// TODO: once each module ships its own creation flow, replace these
// navigations with opening the module's "create" screen/modal directly.
const ACTIONS: Action[] = [
  { label: 'New task', icon: CheckSquare, href: '/(tabs)/tasks' },
  { label: 'New note', icon: StickyNote, href: '/(tabs)/notes' },
  { label: 'New journal entry', icon: BookOpen, href: '/(tabs)/journal' },
  { label: 'New habit', icon: Repeat, href: '/(tabs)/habits' },
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

  const handleActionPress = (href: Action['href']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (ref && 'current' in ref) {
      ref.current?.dismiss();
    }
    router.push(href);
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
            onPress={() => handleActionPress(action.href)}
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
