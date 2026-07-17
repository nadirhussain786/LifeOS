import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Tracks live keyboard height instead of relying on KeyboardAvoidingView —
 * SDK 54's Android edge-to-edge changes made KeyboardAvoidingView's
 * 'height'/'padding' modes unreliable (content silently clips instead of
 * becoming scrollable). Feed the returned height into a ScrollView's
 * contentContainerStyle paddingBottom so every field stays reachable.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => setHeight(event.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
