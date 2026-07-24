import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { ALBUM_CATEGORIES } from '@/features/gallery/config/album-categories';
import { useGalleryMutations } from '@/features/gallery/hooks/use-gallery-mutations';
import type { AlbumCategory } from '@/features/gallery/types/gallery.types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn } from '@/lib/utils';

export default function NewAlbumScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { addAlbum } = useGalleryMutations();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<AlbumCategory>('gym');

  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    addAlbum.mutate(
      { name: name.trim(), category },
      { onSuccess: (album) => router.replace(`/gallery/album/${album.id}`) },
    );
  };

  return (
    <View className="flex-1 bg-background">
      <SheetHeader title="New Album" />

      <ScrollView contentContainerClassName="gap-5 px-5 pt-3 pb-10" keyboardShouldPersistTaps="handled">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Album name"
          placeholderTextColor={colors[scheme].mutedForeground}
          autoFocus
          style={{ fontSize: 24, fontFamily: 'Sora_700Bold', color: colors[scheme].foreground }}
        />

        <View className="gap-2.5">
          <Text variant="caption" className="font-sora-semibold uppercase tracking-wide">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ALBUM_CATEGORIES.map((item) => {
              const selected = item.id === category;
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setCategory(item.id)}
                  style={selected ? { backgroundColor: item.tint, borderColor: item.tint } : undefined}
                  className={cn('flex-row items-center gap-1.5 rounded-full border px-3 py-2', !selected && 'border-border')}
                >
                  <Icon size={15} color={selected ? '#ffffff' : item.tint} strokeWidth={2.2} />
                  <Text className={selected ? 'font-sora-medium text-white' : 'text-muted-foreground'}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button label="Create album" onPress={save} disabled={!canSave} size="lg" variant="accent" />
      </ScrollView>
    </View>
  );
}
