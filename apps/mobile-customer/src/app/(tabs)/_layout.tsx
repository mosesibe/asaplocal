import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, MessageSquare, User } from 'lucide-react-native';
import { BottomNav, BottomNavItem } from '@asaplocal/ui-native';

// expo-router/ui's cross-platform Tabs (rather than unstable-native-tabs) —
// chosen so this renders identically under `expo start --web` for
// verification without a device/simulator, at the cost of not being a true
// native tab bar. Revisit once there's a device to test the native chrome.
export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <BottomNav style={{ position: 'absolute', left: 0, right: 0, bottom: 16 + insets.bottom }}>
          <TabTrigger name="jobs" href="/" asChild>
            <TabButton icon={Activity} label="My jobs" />
          </TabTrigger>
          <TabTrigger name="messages" href="/messages" asChild>
            <TabButton icon={MessageSquare} label="Messages" />
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton icon={User} label="Account" />
          </TabTrigger>
        </BottomNav>
      </TabList>
    </Tabs>
  );
}

function TabButton({ icon, label, isFocused, ...props }: TabTriggerSlotProps & { icon: typeof Activity; label: string }) {
  return <BottomNavItem icon={icon} label={label} active={isFocused} {...props} />;
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
});
