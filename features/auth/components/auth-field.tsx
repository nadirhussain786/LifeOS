import { useState } from 'react';
import { Pressable, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoComplete?: 'email' | 'password' | 'name' | 'new-password' | 'off';
  autoFocus?: boolean;
};

/** Labeled text field used across the auth screens — themed, with a show/hide
 * toggle for secure fields. */
export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete = 'off',
  autoFocus,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const theme = colors[scheme];
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View className="gap-1.5">
      <Text variant="caption" className="px-1 font-sora-semibold uppercase tracking-wide">
        {label}
      </Text>
      <View
        className="flex-row items-center rounded-2xl border px-4"
        style={{ borderColor: theme.border, backgroundColor: theme.card }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.mutedForeground}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          autoFocus={autoFocus}
          className="flex-1 py-3.5"
          style={{ fontSize: 16, fontFamily: 'Sora_500Medium', color: theme.foreground }}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} className="pl-2">
            {hidden ? <EyeOff size={18} color={theme.mutedForeground} /> : <Eye size={18} color={theme.mutedForeground} />}
          </Pressable>
        )}
      </View>
    </View>
  );
}
