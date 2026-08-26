import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface PushRegistration {
  token: string;
  platform: 'ios' | 'android';
}

/**
 * Requests permission and returns an Expo push token, or null if this isn't
 * a real device (simulators can't receive push), permission was denied, or
 * there's no EAS projectId configured yet (set via `eas init` — until then
 * getExpoPushTokenAsync() throws, so this fails closed rather than crashing
 * the login flow that calls it).
 */
export async function registerForPushNotifications(): Promise<PushRegistration | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token, platform: Platform.OS };
}
