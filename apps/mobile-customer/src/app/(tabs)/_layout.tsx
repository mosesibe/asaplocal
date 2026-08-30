import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Activity, PlusCircle, Wrench, User } from 'lucide-react-native';
import { BottomNav, BottomNavItem } from '@asaplocal/ui-native';

// expo-router/ui's cross-platform Tabs (rather than unstable-native-tabs) —
// chosen so this renders identically under `expo start --web` for
// verification without a device/simulator, at the cost of not being a true
// native tab bar. Revisit once there's a device to test the native chrome.
//
// 5 items matching apps/web/components/web-bottom-nav.tsx: Home / Activity /
// a raised "Post a job" button / Services / Account. That center button is
// a plain link on web (BottomNavItem as={Link} href="/jobs/new"), not a real
// tab — it has no tab content of its own — so it's a plain Pressable inside
// the same bar rather than a TabTrigger.
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <BottomNav style={{ position: 'absolute', left: 0, right: 0, bottom: 16 + insets.bottom }}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon={Home} label="Home" />
          </TabTrigger>
          <TabTrigger name="activity" href="/activity" asChild>
            <TabButton icon={Activity} label="Activity" />
          </TabTrigger>
          <BottomNavItem icon={PlusCircle} label="Post a job" emphasized onPress={() => router.push('/jobs/new')} />
          <TabTrigger name="search" href="/search" asChild>
            <TabButton icon={Wrench} label="Services" />
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton icon={User} label="Account" />
          </TabTrigger>
        </BottomNav>
      </TabList>
    </Tabs>
  );
}

function TabButton({ icon, label, isFocused, ...props }: TabTriggerSlotProps & { icon: typeof Home; label: string }) {
  return <BottomNavItem icon={icon} label={label} active={isFocused} {...props} />;
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
});
