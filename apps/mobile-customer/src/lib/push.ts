import { useEffect } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter, type Href } from 'expo-router';

export interface PushRegistration {
  token: string;
  platform: 'ios' | 'android';
}

// Without this, a notification that arrives while the app is foregrounded
// is delivered silently — no banner, easy to mistake for "push isn't
// working" when it actually is. Guarded to native platforms for the same
// reason as useNotificationRouting below.
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
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

// Every customer-facing notify() call on the backend (packages/core/src/
// notify.ts callers) sets `link` to one of a small set of web paths:
// /jobs/{id}, /bookings/{id}, /messages/{id}. The first two map onto
// identically-shaped mobile routes; only "messages" was renamed to
// "conversations" here, so that's the one substitution needed.
function toMobileRoute(link: string): Href | null {
  const messageMatch = link.match(/^\/messages\/([^/?]+)/);
  if (messageMatch) return `/conversations/${messageMatch[1]}` as Href;
  if (/^\/(jobs|bookings)\/[^/?]+/.test(link)) return link as Href;
  return null;
}

/**
 * Wires a tap on a delivered notification (app backgrounded, or cold-started
 * from one) to navigation, using the same `link` the notification carries
 * end to end from notify() → sendExpoPush() → this payload's `data.link`.
 * Call once near the app root, after the router exists.
 */
export function useNotificationRouting() {
  const router = useRouter();

  useEffect(() => {
    // expo-notifications' response APIs aren't implemented on web (used only
    // for the `expo start --web` preview target in this app) — calling them
    // there throws and crashes the whole tree, so this hook is a no-op
    // there, same as registerForPushNotifications() already is.
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    function handleResponse(response: Notifications.NotificationResponse) {
      const link = response.notification.request.content.data?.link;
      if (typeof link !== 'string') return;
      const route = toMobileRoute(link);
      if (route) router.push(route);
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [router]);
}
