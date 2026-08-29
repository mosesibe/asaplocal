import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { UiNativeThemeProvider, useAppTheme } from '@asaplocal/ui-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isLoading } = useSession();
  const { colors, font } = useAppTheme();

  // Nothing renders until both the stored-token check and the brand fonts
  // resolve — flashing the login screen for a session that turns out to be
  // valid (or a system-font flash before Inter loads) would be a jarring
  // flicker on every cold start.
  if (isLoading) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: font.semibold, fontSize: 16, color: colors.foreground },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="leads/[id]" options={{ headerShown: true, title: 'Lead detail' }} />
        <Stack.Screen name="conversations/[id]" options={{ headerShown: true, title: 'Messages' }} />
        <Stack.Screen name="bookings/[id]" options={{ headerShown: true, title: 'Booking' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <UiNativeThemeProvider app="provider">
      <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {fontsLoaded && (
          <SessionProvider>
            <RootNavigator />
          </SessionProvider>
        )}
      </NavThemeProvider>
    </UiNativeThemeProvider>
  );
}
