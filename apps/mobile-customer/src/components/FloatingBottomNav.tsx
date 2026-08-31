import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Activity, PlusCircle, Wrench, User } from 'lucide-react-native';
import { BottomNav, BottomNavItem } from '@asaplocal/ui-native';

import { useRequireAuth } from '@/lib/auth-guard';

// Ports apps/web/components/web-bottom-nav.tsx as *global* chrome — web's
// fixed bottom nav is present on every page regardless of route or auth
// state, including deep subpages like a booking or job detail (only
// login/register/forgot-password hide it, matching web's own auth pages
// having no site chrome). Rendered once in the root layout, as a sibling to
// the Stack rather than tied to a tab navigator, so it survives navigating
// into any stack screen. Home and Services are public; Activity, Account,
// and Post a job gate through useRequireAuth (see lib/auth-guard.ts) since
// their destinations require a session.
export function FloatingBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();

  return (
    <BottomNav style={{ position: 'absolute', left: 0, right: 0, bottom: 16 + insets.bottom }}>
      <BottomNavItem icon={Home} label="Home" active={pathname === '/'} onPress={() => router.navigate('/')} />
      <BottomNavItem
        icon={Activity}
        label="Activity"
        active={pathname.startsWith('/activity')}
        onPress={() => requireAuth('/activity', () => router.navigate('/activity'))}
      />
      <BottomNavItem
        icon={PlusCircle}
        label="Post a job"
        emphasized
        active={pathname.startsWith('/jobs/new')}
        onPress={() => requireAuth('/jobs/new', () => router.push('/jobs/new'))}
      />
      <BottomNavItem icon={Wrench} label="Services" active={pathname.startsWith('/search')} onPress={() => router.navigate('/search')} />
      <BottomNavItem
        icon={User}
        label="Account"
        active={pathname.startsWith('/account')}
        onPress={() => requireAuth('/account', () => router.navigate('/account'))}
      />
    </BottomNav>
  );
}
