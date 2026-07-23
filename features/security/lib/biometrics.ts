import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Thin wrapper around expo-local-authentication for the optional app lock.
 * Everything degrades gracefully: on a device with no hardware or no enrolled
 * biometrics, `isBiometricAvailable` returns false and the UI hides the option.
 */

/** True only when the device has biometric hardware AND the user has enrolled. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/** Prompt the biometric sheet (with device-passcode fallback). Resolves to
 *  whether authentication succeeded — never throws. */
export async function authenticate(reason = 'Unlock LifeOS'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use passcode',
      cancelLabel: 'Cancel',
      // Let the OS fall back to the device passcode if biometrics fail.
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

/** A human label for the strongest available method — for button/setting copy. */
export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Fingerprint';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'Iris';
  } catch {
    // fall through
  }
  return 'Biometrics';
}
