import { Image } from 'expo-image';
import { Camera, ImagePlus, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { PrivateScreen } from '@/features/private/components/private-screen';
import { tinted, useVaultTheme } from '@/features/private/components/vault-theme';
import { VaultStamp } from '@/features/private/components/well';
import { privateModule } from '@/features/private/config/private-modules';
import { MAX_VAULT_MB, pickIntoVault } from '@/features/private/services/vault-files';
import {
  addVaultItems,
  listVaultItems,
  removeVaultItem,
  vaultItemDataUri,
  type VaultItem,
} from '@/features/private/services/vault-items';
import { confirm } from '@/lib/dialog-store';
import { toast } from '@/lib/toast-store';

const TINT = privateModule('vault')?.tint ?? '#7c6cf0';
const GAP = 8;

/**
 * The vault grid.
 *
 * Every thumbnail is a decrypt. That is the cost of the guarantee — there is no
 * plaintext preview cached anywhere, so nothing survives a lock and nothing is
 * left behind for the OS gallery to find. The grid decrypts lazily and holds
 * the results only for the life of this screen.
 */
export default function VaultScreen() {
  const vault = useVaultTheme();
  const { t } = useTranslation();

  // See cycle.tsx: explicit reload rather than a counter dependency.
  const [items, setItems] = useState(listVaultItems);
  const reload = useCallback(() => setItems(listVaultItems()), []);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<VaultItem | null>(null);

  const columns = 3;
  const size = (Dimensions.get('window').width - 40 - GAP * (columns - 1)) / columns;

  const add = useCallback(
    async (source: 'library' | 'camera') => {
      setBusy(true);
      try {
        const { items: picked, rejectedOversize } = await pickIntoVault(source);
        if (picked.length > 0) {
          addVaultItems(picked);
          reload();
        }
        if (rejectedOversize > 0) {
          toast.error(t('private.tooLargeBody', { count: rejectedOversize, mb: MAX_VAULT_MB }));
        }
      } finally {
        setBusy(false);
      }
    },
    [t, reload],
  );

  const confirmDelete = (item: VaultItem) =>
    void confirm({
      title: t('private.deleteItem'),
      message: t('private.deleteItemBody'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      removeVaultItem(item);
      setSelected(null);
      reload();
    });

  return (
    <PrivateScreen
      title={t('private.vaultTitle')}
      subtitle={t('private.itemCount', { count: items.length })}
      tint={TINT}
      stamp={t('private.stampVault')}
      footer={
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void add('library')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 52,
              borderRadius: 16,
              backgroundColor: tinted(TINT, 0.2),
              borderTopWidth: 1,
              borderTopColor: tinted(TINT, 0.35),
              opacity: busy ? 0.5 : 1,
            }}
          >
            <ImagePlus size={19} color={TINT} strokeWidth={1.9} />
            <Text className="font-sora-medium" style={{ color: TINT }}>
              {t('private.addFromLibrary')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('private.takePhoto')}
            disabled={busy}
            onPress={() => void add('camera')}
            style={{
              width: 52,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 16,
              backgroundColor: tinted(TINT, 0.2),
              borderTopWidth: 1,
              borderTopColor: tinted(TINT, 0.35),
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Camera size={20} color={TINT} strokeWidth={1.9} />
          </Pressable>
        </View>
      }
    >
      {items.length === 0 ? (
        // An empty vault is a normal state, not an error, so it gets the same
        // quiet treatment as a full one rather than an illustration.
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 72 }}>
          <VaultStamp label={t('private.stampEmpty')} tint={tinted(TINT, 0.8)} />
          <Text className="font-sora-semibold text-base" style={{ color: vault.ink }}>
            {t('private.vaultEmptyTitle')}
          </Text>
          <Text
            className="text-center text-xs"
            style={{ color: vault.faint, lineHeight: 18, maxWidth: 250 }}
          >
            {t('private.vaultEmptyBody')}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: GAP }}>
          {items.map((item) => (
            <VaultThumbnail
              key={item.id}
              item={item}
              size={size}
              onPress={() => setSelected(item)}
              onLongPress={() => confirmDelete(item)}
            />
          ))}
        </View>
      )}

      {/* Full-size viewer. Also decrypted in memory, and dropped on close. */}
      {selected ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setSelected(null)}
          className="absolute inset-0 items-center justify-center px-4"
          // Solid black, not a translucent wash: anything showing through
          // behind a vault image is the vault leaking round its own viewer.
          style={{ backgroundColor: '#000000' }}
        >
          <VaultFullImage item={selected} />
          <Pressable
            accessibilityRole="button"
            onPress={() => confirmDelete(selected)}
            style={{
              marginTop: 22,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              paddingHorizontal: 18,
              borderRadius: 999,
              backgroundColor: tinted(vault.alarm, 0.14),
            }}
          >
            <Trash2 size={16} color={vault.alarm} strokeWidth={1.9} />
            <Text className="font-sora-medium text-sm" style={{ color: vault.alarm }}>
              {t('common.delete')}
            </Text>
          </Pressable>
        </Pressable>
      ) : null}
    </PrivateScreen>
  );
}

function VaultThumbnail({
  item,
  size,
  onPress,
  onLongPress,
}: {
  item: VaultItem;
  size: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  // Decrypted once per mount and held only in this component's memory.
  const uri = useMemo(() => vaultItemDataUri(item), [item]);

  return (
    <Pressable
      accessibilityRole="imagebutton"
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        overflow: 'hidden',
        // The empty tile is a recess, so a still-decrypting thumbnail reads as
        // a slot waiting rather than as a missing image.
        backgroundColor: '#05070699',
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          // No disk cache: a cached copy of a vault image is a plaintext copy
          // of a vault image, sitting outside the vault.
          cachePolicy="none"
        />
      ) : null}
    </Pressable>
  );
}

function VaultFullImage({ item }: { item: VaultItem }) {
  const uri = useMemo(() => vaultItemDataUri(item), [item]);
  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', height: '75%' }}
      contentFit="contain"
      cachePolicy="none"
    />
  );
}
