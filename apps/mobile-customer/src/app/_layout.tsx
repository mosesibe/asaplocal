import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { UiNativeThemeProvider, useAppTheme } from '@asaplocal/ui-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { HomeHeader } from '@/components/HomeHeader';
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
import { SessionProvider, useSession } from '@/lib/session';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-preference';
import { useNotificationRouting } from '@/lib/push';

SplashScreen.preventAutoHideAsync();

const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];
const PRIMARY_ROUTES = ['/', '/activity', '/search', '/account', '/messages'];

function RootNavigator() {
  const { user, isLoading } = useSession();
  const { colors, font } = useAppTheme();
  const pathname = usePathname();

  useNotificationRouting();

  // Nothing renders until both the stored-token check and the brand fonts
  // resolve — flashing the login screen for a session that turns out to be
  // valid (or a system-font flash before Inter loads) would be a jarring
  // flicker on every cold start.
  if (isLoading) return null;

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  // Home/Search/provider profiles are public, matching web (those pages
  // work signed-out) — chrome (header + floating nav) is global like web's
  // layout.tsx too, present on every page except the auth screens
  // themselves. Activity/Account/Messages/Post-a-job/etc. gate the *action*
  // of navigating there (see lib/auth-guard.ts), not the chrome itself.
  const showHeader = !isAuthRoute && PRIMARY_ROUTES.includes(pathname);
  const showBottomNav = !isAuthRoute;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {showHeader && (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
          <HomeHeader />
        </SafeAreaView>
      )}
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
        {/* Public — no auth required, matching the equivalent web pages */}
        <Stack.Screen name="(tabs)/index" />
        <Stack.Screen name="(tabs)/search" />
        <Stack.Screen name="providers/[slug]" options={{ headerShown: true, title: '' }} />

        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" options={{ headerShown: true, title: 'Sign up' }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: true, title: '' }} />
        </Stack.Protected>

        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)/activity" />
          <Stack.Screen name="(tabs)/account" />
          <Stack.Screen name="jobs/new" options={{ headerShown: true, title: 'Post a job' }} />
          <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Job request' }} />
          <Stack.Screen name="jobs/[id]/edit" options={{ headerShown: true, title: 'Edit job' }} />
          {/* headerShown left false — /messages is a "primary" page (see
              PRIMARY_ROUTES above), so it gets the global HomeHeader like
              web's SiteHeader, not a second native title bar underneath. */}
          <Stack.Screen name="messages" />
          <Stack.Screen name="conversations/[id]" options={{ headerShown: true, title: 'Messages' }} />
          <Stack.Screen name="studio" options={{ headerShown: true, title: 'Redesign Studio' }} />
          <Stack.Screen name="favourites" options={{ headerShown: true, title: 'Saved providers' }} />
          <Stack.Screen name="bookings/[id]" options={{ headerShown: true, title: 'Booking' }} />
        </Stack.Protected>
      </Stack>
      {showBottomNav && <FloatingBottomNav />}
    </View>
  );
}

function ThemedApp({ fontsLoaded }: { fontsLoaded: boolean }) {
  const systemScheme = useColorScheme();
  const { preference } = useThemePreference();
  const effectiveDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  return (
    <UiNativeThemeProvider app="customer" schemeOverride={preference}>
      <NavThemeProvider value={effectiveDark ? DarkTheme : DefaultTheme}>
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

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <ThemedApp fontsLoaded={fontsLoaded} />
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}
