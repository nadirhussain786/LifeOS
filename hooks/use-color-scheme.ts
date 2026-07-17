import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

/**
 * Drop-in replacement for React Native's own `useColorScheme` — every screen
 * already calls this the same way (`useColorScheme() ?? 'light'`). Backed by
 * NativeWind's runtime override instead of React Native's `Appearance` API
 * directly, because NativeWind's `dark:` utility classes only ever react to
 * its own `colorScheme` observable — an override applied any other way (e.g.
 * a plain Zustand store) would desync manual color lookups like
 * `colors[scheme]` from Tailwind classes like `bg-background`. Setting the
 * preference (Settings → Appearance) goes through the same observable via
 * `colorScheme.set()` in features/settings/store/appearance-store.ts.
 */
export function useColorScheme(): 'light' | 'dark' | undefined {
  const { colorScheme } = useNativeWindColorScheme();
  return colorScheme;
}
