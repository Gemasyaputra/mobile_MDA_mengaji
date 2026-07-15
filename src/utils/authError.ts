import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Call this from a screen's catch block whenever an axios call to a
 * `/api/mobile/teacher/*` endpoint fails. If the failure was an auth error
 * (401 — invalid/expired token, e.g. after a server-side token format change),
 * this clears the stale token and bounces the user back to the login screen
 * instead of leaving them staring at a silently-empty screen.
 *
 * Returns true if it was an auth error (and was handled), false otherwise —
 * so callers can skip their normal generic error alert/log when this returns true.
 */
export async function handleTeacherAuthError(err: any, navigation: any): Promise<boolean> {
  if (err?.response?.status !== 401) return false;

  await AsyncStorage.removeItem('teacher_token');
  Alert.alert('Sesi Berakhir', 'Sesi Anda tidak valid atau sudah kedaluwarsa. Silakan login ulang.', [
    {
      text: 'OK',
      onPress: () => {
        const rootNavigation = navigation.getParent?.() || navigation;
        rootNavigation.replace('DevLogin');
      },
    },
  ]);
  return true;
}
