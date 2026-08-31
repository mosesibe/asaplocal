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

        <Stack.Protected guard={isInApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="leads/[id]" options={{ headerShown: true, title: 'Lead detail' }} />
          <Stack.Screen name="conversations/[id]" options={{ headerShown: true, title: 'Messages' }} />
          <Stack.Screen name="bookings/[id]" options={{ headerShown: true, title: 'Booking' }} />
          <Stack.Screen name="profile/index" options={{ headerShown: true, title: 'Business profile' }} />
          <Stack.Screen name="profile/preview" options={{ headerShown: true, title: 'Preview' }} />
          <Stack.Screen name="services" options={{ headerShown: true, title: 'Services' }} />
          <Stack.Screen name="portfolio" options={{ headerShown: true, title: 'Portfolio' }} />
          <Stack.Screen name="supplies" options={{ headerShown: true, title: 'Supplies' }} />
          <Stack.Screen name="staff/index" options={{ headerShown: true, title: 'Staff' }} />
          <Stack.Screen name="staff/new" options={{ headerShown: true, title: 'Add staff member' }} />
          <Stack.Screen name="staff/[staffId]" options={{ headerShown: true, title: 'Staff member' }} />
          <Stack.Screen name="verification/index" options={{ headerShown: true, title: 'Verification centre' }} />
          <Stack.Screen name="verification/business" options={{ headerShown: true, title: 'Business verification' }} />
          <Stack.Screen name="verification/insurance" options={{ headerShown: true, title: 'Insurance' }} />
          <Stack.Screen name="verification/qualifications" options={{ headerShown: true, title: 'Qualifications' }} />
          <Stack.Screen name="verification/identity" options={{ headerShown: true, title: 'Identity verification' }} />
          <Stack.Screen name="verification/banking" options={{ headerShown: true, title: 'Bank account' }} />
          <Stack.Screen name="reviews" options={{ headerShown: true, title: 'Reviews' }} />
          <Stack.Screen name="references" options={{ headerShown: true, title: 'References' }} />
          <Stack.Screen name="earnings/index" options={{ headerShown: true, title: 'Earnings' }} />
          <Stack.Screen name="earnings/invoices" options={{ headerShown: true, title: 'Invoices & payouts' }} />
          <Stack.Screen name="earnings/subscription" options={{ headerShown: true, title: 'Subscription' }} />
          <Stack.Screen name="earnings/credits" options={{ headerShown: true, title: 'Lead credits' }} />
          <Stack.Screen name="referrals" options={{ headerShown: true, title: 'Referrals' }} />
          <Stack.Screen name="analytics" options={{ headerShown: true, title: 'Analytics' }} />
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
