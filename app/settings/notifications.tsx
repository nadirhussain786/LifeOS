import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, set } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { BellRing } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, View } from 'react-native';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { applyDeliveryMode } from '@/features/notifications/services/delivery';
import { formatQuietWindow } from '@/features/notifications/services/quiet-hours';
import { useNotificationsStore, type DeliveryMode } from '@/features/notifications/store/notifications-store';
import { CATEGORY_META, CONFIGURABLE_CATEGORIES, type NotificationCategory } from '@/features/notifications/types/notification.types';
import {
  cancelAllScheduled,
  cancelScheduledInCategory,
  hasNotificationPermission,
  notificationsAvailable,
  requestNotificationPermission,
} from '@/lib/notifications';
import { useColorScheme } from '@/hooks/use-color-scheme';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="caption" className="px-1 font-sora-semibold uppercase tracking-wide">
      {children}
    </Text>
  );
}

/** A labelled time value with the platform-appropriate picker (inline compact
 * on iOS, tap-to-open modal on Android). */
function TimeRow({
  label,
  minutes,
  onChange,
  borderTop,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  borderTop?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const value = set(new Date(), { hours: Math.floor(minutes / 60), minutes: minutes % 60, seconds: 0, milliseconds: 0 });

  const handle = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && next) onChange(next.getHours() * 60 + next.getMinutes());
  };

  return (
    <View className={borderTop ? 'flex-row items-center justify-between border-t border-border py-3.5' : 'flex-row items-center justify-between py-3.5'}>
      <Text className="font-sora-medium text-foreground">{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker value={value} mode="time" display="compact" onChange={handle} />
      ) : (
        <>
          <Pressable onPress={() => setShowPicker(true)} className="rounded-full border border-border px-3 py-1.5">
            <Text variant="muted">{format(value, 'h:mm a')}</Text>
          </Pressable>
          {showPicker && <DateTimePicker value={value} mode="time" display="default" onChange={handle} />}
        </>
      )}
    </View>
  );
}

const DELIVERY_OPTIONS: { value: DeliveryMode; label: string }[] = [
  { value: 'digest', label: 'Smart digest' },
  { value: 'individual', label: 'Individual' },
];

export default function NotificationSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const theme = colors[scheme];

  const store = useNotificationsStore();
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    hasNotificationPermission().then(setPermissionGranted);
  }, []);

  // Any change to delivery mode, digest time, quiet hours or the master switch
  // can change which reminders should be queued and whether/when the morning
  // digest fires — reconcile scheduled notifications and the digest.
  const resyncDigest = () => {
    applyDeliveryMode();
  };

  const handleMasterToggle = async (enabled: boolean) => {
    Haptics.selectionAsync();
    if (enabled && !permissionGranted) {
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
    }
    store.setMasterEnabled(enabled);
    if (enabled) {
      resyncDigest();
    } else {
      // True kill switch: silence everything already queued, not just future
      // scheduling. Reminders return as each item is re-saved once re-enabled.
      store.setDigestNotificationId(null);
      await cancelAllScheduled();
    }
  };

  const handleCategoryToggle = (category: NotificationCategory, enabled: boolean) => {
    store.setCategoryEnabled(category, enabled);
    if (!enabled) {
      // Clear the category's already-queued reminders immediately.
      cancelScheduledInCategory(category);
    }
    if (category === 'digest') resyncDigest();
  };

  const disabled = !store.masterEnabled;

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Notifications" eyebrow="Settings" tint="#737373" />
      <ScrollView contentContainerClassName="gap-6 px-5 py-4 pb-12" showsVerticalScrollIndicator={false}>
      {/* Master */}
      <View className="rounded-2xl border border-border bg-card px-4">
        <View className="flex-row items-center gap-3 py-3.5">
          <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: theme.muted }}>
            <BellRing size={18} color={theme.accent} />
          </View>
          <View className="flex-1">
            <Text className="font-sora-semibold text-foreground">All notifications</Text>
            <Text variant="caption">Master switch for every LifeOS reminder</Text>
          </View>
          <Switch value={store.masterEnabled} onValueChange={handleMasterToggle} trackColor={{ true: theme.accent, false: theme.border }} />
        </View>
      </View>

      {!notificationsAvailable && (
        <Text variant="caption" className="px-1">
          Notifications aren&apos;t available on this device.
        </Text>
      )}
      {notificationsAvailable && store.masterEnabled && !permissionGranted && (
        <Text variant="caption" className="px-1" style={{ color: theme.destructive }}>
          System notifications are turned off for LifeOS. Enable them in your device settings to receive reminders.
        </Text>
      )}

      {/* Delivery mode */}
      <View className="gap-2" style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
        <SectionLabel>Delivery</SectionLabel>
        <Segmented
          options={DELIVERY_OPTIONS}
          value={store.deliveryMode}
          onChange={(mode) => {
            store.setDeliveryMode(mode);
            resyncDigest();
          }}
          activeColor={theme.accent}
        />
        <Text variant="caption" className="px-1">
          {store.deliveryMode === 'digest'
            ? 'One morning summary of your day, plus only time-critical pings (due tasks, events, money).'
            : 'Every reminder fires on its own, exactly when scheduled.'}
        </Text>
        {store.deliveryMode === 'digest' && (
          <View className="rounded-2xl border border-border bg-card px-4">
            <TimeRow
              label="Digest time"
              minutes={store.digestHour * 60 + store.digestMinute}
              onChange={(m) => {
                store.setDigestTime(Math.floor(m / 60), m % 60);
                resyncDigest();
              }}
            />
          </View>
        )}
      </View>

      {/* Quiet hours */}
      <View className="gap-2" style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
        <SectionLabel>Quiet hours</SectionLabel>
        <View className="rounded-2xl border border-border bg-card px-4">
          <View className="flex-row items-center justify-between py-3.5">
            <View className="flex-1 pr-3">
              <Text className="font-sora-medium text-foreground">Silence nudges overnight</Text>
              <Text variant="caption">
                {store.quietHoursEnabled ? formatQuietWindow(store.quietStartMinutes, store.quietEndMinutes) : 'Off'}
              </Text>
            </View>
            <Switch
              value={store.quietHoursEnabled}
              onValueChange={(v) => {
                store.setQuietHoursEnabled(v);
                resyncDigest();
              }}
              trackColor={{ true: theme.accent, false: theme.border }}
            />
          </View>
          {store.quietHoursEnabled && (
            <>
              <TimeRow
                label="From"
                minutes={store.quietStartMinutes}
                borderTop
                onChange={(m) => store.setQuietHours(m, store.quietEndMinutes)}
              />
              <TimeRow
                label="Until"
                minutes={store.quietEndMinutes}
                borderTop
                onChange={(m) => store.setQuietHours(store.quietStartMinutes, m)}
              />
            </>
          )}
        </View>
        <Text variant="caption" className="px-1">
          Due tasks, calendar events, money reminders and your bedtime nudge always come through.
        </Text>
      </View>

      {/* Categories */}
      <View className="gap-2" style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
        <SectionLabel>What you hear about</SectionLabel>
        <View className="rounded-2xl border border-border bg-card px-4">
          {CONFIGURABLE_CATEGORIES.map((category, index) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            return (
              <View
                key={category}
                className={index === 0 ? 'flex-row items-center gap-3 py-3.5' : 'flex-row items-center gap-3 border-t border-border py-3.5'}
              >
                <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.tint}22` }}>
                  <Icon size={17} color={meta.tint} />
                </View>
                <View className="flex-1">
                  <Text className="font-sora-medium text-foreground">{meta.label}</Text>
                  <Text variant="caption">{meta.description}</Text>
                </View>
                <Switch
                  value={store.categories[category] ?? true}
                  onValueChange={(v) => handleCategoryToggle(category, v)}
                  trackColor={{ true: meta.tint, false: theme.border }}
                />
              </View>
            );
          })}
        </View>
        <Text variant="caption" className="px-1">
          Turning a category off clears its queued reminders right away. They come back as you edit each item once it&apos;s on again.
        </Text>
      </View>
      </ScrollView>
    </View>
  );
}
