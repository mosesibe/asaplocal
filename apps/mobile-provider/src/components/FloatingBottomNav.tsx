import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Target, CalendarDays, MessageSquare } from 'lucide-react-native';
import { BottomNav, BottomNavItem } from '@asaplocal/ui-native';

// Matches apps/provider/lib/nav.ts's PRIMARY_NAV exactly: Home (dashboard),
// Lead marketplace, Calendar, Messages — no 5th "Post a job"-style raised
// button (that's a customer-app-only action) and no Account tab (Account
// lives behind the hamburger menu on web, see AccountMenu.tsx here).
// Rendered once in the root layout as global chrome, same reasoning as the
// customer app: present on every authenticated screen, not tied to a tab
// navigator, so it survives pushing into leads/[id], bookings/[id], etc.
export function FloatingBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // This is fixed-positioned at the window level (not scoped to any one
  // screen's KeyboardAvoidingView), so on Android — where the window itself
  // resizes for the keyboard — it would otherwise end up floating right on
  // top of whatever composer/input is now docked above the keyboard (e.g.
  // the conversation screen's message bar). Hiding it while the keyboard is
  // up avoids that stacking and matches how a real chat app's nav behaves.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <BottomNav style={{ position: 'absolute', left: 0, right: 0, bottom: 16 + insets.bottom }}>
      <BottomNavItem icon={LayoutDashboard} label="Home" active={pathname === '/'} onPress={() => router.navigate('/')} />
      <BottomNavItem icon={Target} label="Leads" active={pathname.startsWith('/leads')} onPress={() => router.navigate('/leads')} />
      <BottomNavItem
        icon={CalendarDays}
        label="Calendar"
        active={pathname.startsWith('/calendar')}
        onPress={() => router.navigate('/calendar')}
      />
      <BottomNavItem
        icon={MessageSquare}
        label="Messages"
        active={pathname.startsWith('/messages')}
        onPress={() => router.navigate('/messages')}
      />
    </BottomNav>
  );
}
