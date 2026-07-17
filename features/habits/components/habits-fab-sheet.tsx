import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Repeat, Plus as PlusIcon } from 'lucide-react-native';
import { forwardRef, useCallback } from 'react';
import { Pressable } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

export const HabitsFabSheet = forwardRef<BottomSheetModal>(function HabitsFabSheet(_props, ref) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />,
    [],
  );

  const go = (href: '/habit/new' | '/routine/new') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (ref && 'current' in ref) ref.current?.dismiss();
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
        <Pressable onPress={() => go('/habit/new')} className="flex-row items-center gap-3 rounded-md px-2 py-3 active:bg-muted">
          <PlusIcon color={colors[scheme].foreground} size={20} />
          <Text>New habit</Text>
        </Pressable>
        <Pressable onPress={() => go('/routine/new')} className="flex-row items-center gap-3 rounded-md px-2 py-3 active:bg-muted">
          <Repeat color={colors[scheme].foreground} size={20} />
          <Text>New routine</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
