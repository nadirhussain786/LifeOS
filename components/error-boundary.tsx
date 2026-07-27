import { Component, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { reportError } from '@/lib/error-reporting';
import i18n from '@/lib/i18n';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Root error boundary. Without one, any render throw (a bad DB read, an
 * unexpected null, a component bug) tears down the entire React tree and leaves
 * a white screen. This catches it, reports it (console + prod sink), and shows a
 * recover UI. Styled with NativeWind tokens so it themes automatically without
 * hooks (class components can't use them).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    reportError(error, { scope: 'render', componentStack: info.componentStack ?? undefined });
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-8">
        <Text variant="heading">{i18n.t('common.somethingWrong')}</Text>
        <Text variant="muted" className="text-center">
          {i18n.t('common.errorBody')}
        </Text>
        <Pressable
          onPress={this.reset}
          className="mt-2 rounded-full border border-border bg-card px-6 py-3"
          accessibilityRole="button"
        >
          <Text className="font-sora-semibold text-foreground">{i18n.t('common.reload')}</Text>
        </Pressable>
      </View>
    );
  }
}
