import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// expo-router/ui's cross-platform Tabs (rather than unstable-native-tabs) —
// chosen so this renders identically under `expo start --web` for
// verification without a device/simulator, at the cost of not being a true
// native tab bar. Revisit once there's a device to test the native chrome.
export default function TabLayout() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList style={styles.tabList} asChild>
        <ThemedView type="backgroundElement" style={styles.tabListInner}>
          <TabTrigger name="leads" href="/" asChild>
            <TabButton>Leads</TabButton>
          </TabTrigger>
          <TabTrigger name="messages" href="/messages" asChild>
            <TabButton>Messages</TabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton>Account</TabButton>
          </TabTrigger>
        </ThemedView>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={[styles.tabButton, isFocused && styles.tabButtonFocused]}>
      <ThemedText type={isFocused ? 'smallBold' : 'small'} themeColor={isFocused ? 'text' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  tabList: { flexDirection: 'row' },
  tabListInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  tabButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  tabButtonFocused: {
    backgroundColor: 'rgba(0,32,89,0.08)',
  },
});
