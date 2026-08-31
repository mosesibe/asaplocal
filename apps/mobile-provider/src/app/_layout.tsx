import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { UiNativeThemeProvider, useAppTheme } from '@asaplocal/ui-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ProviderTopBar } from '@/components/ProviderTopBar';
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
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

  // Matches web's own gate order (register → /verify → /onboarding →
  // dashboard): email verification blocks everything else, then a missing
  // Business row sends the provider to onboarding instead of the app shell.
  // Phone verification is nudged inside /verify but doesn't hard-block here
  // — web's own requirement is toggled by a server env var
  // (NEXT_PUBLIC_REQUIRE_PHONE_VERIFICATION) this client has no visibility
  // into, so blocking on it unconditionally could strand a provider on a
  // build where it's actually optional.
  const needsVerification = !!user && !user.isEmailVerified;
  const needsOnboarding = !!user && user.isEmailVerified && !user.hasBusiness;
  const isInApp = !!user && user.isEmailVerified && !!user.hasBusiness;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isInApp && (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
          <ProviderTopBar />
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
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" options={{ headerShown: true, title: 'Sign up' }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: true, title: '' }} />
        </Stack.Protected>

        <Stack.Protected guard={needsVerification}>
          <Stack.Screen name="verify" />
        </Stack.Protected>

        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        {/* No per-screen headerShown/title here: ProviderTopBar (below) is
            persistent chrome on every in-app screen, same as web's — it
            shows the page title via its own TITLES lookup and swaps its
            left icon to a back chevron on these pushed screens. A native
            Stack header here as well would just duplicate that title in a
            second bar stacked underneath it. */}
        <Stack.Protected guard={isInApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="leads/[id]" />
          <Stack.Screen name="conversations/[id]" />
          <Stack.Screen name="bookings/[id]" />
          <Stack.Screen name="profile/index" />
          <Stack.Screen name="profile/preview" />
          <Stack.Screen name="services" />
          <Stack.Screen name="portfolio" />
          <Stack.Screen name="supplies" />
          <Stack.Screen name="staff/index" />
          <Stack.Screen name="staff/new" />
          <Stack.Screen name="staff/[staffId]" />
          <Stack.Screen name="verification/index" />
          <Stack.Screen name="verification/business" />
          <Stack.Screen name="verification/insurance" />
          <Stack.Screen name="verification/qualifications" />
          <Stack.Screen name="verification/identity" />
          <Stack.Screen name="verification/banking" />
          <Stack.Screen name="reviews" />
          <Stack.Screen name="references" />
          <Stack.Screen name="help" />
          <Stack.Screen name="preferences" />
          <Stack.Screen name="earnings/index" />
          <Stack.Screen name="earnings/invoices" />
          <Stack.Screen name="earnings/subscription" />
          <Stack.Screen name="earnings/credits" />
          <Stack.Screen name="referrals" />
          <Stack.Screen name="analytics" />
        </Stack.Protected>
      </Stack>
      {isInApp && <FloatingBottomNav />}
    </View>
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
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
