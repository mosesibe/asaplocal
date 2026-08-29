import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useAppTheme } from '@asaplocal/ui-native';

// expo-router/ui's cross-platform Tabs (rather than unstable-native-tabs) —
// chosen so this renders identically under `expo start --web` for
// verification without a device/simulator, at the cost of not being a true
// native tab bar. Revisit once there's a device to test the native chrome.
export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList style={styles.tabList} asChild>
        <View style={StyleSheet.flatten([styles.tabListInner, { backgroundColor: colors.surface, borderTopColor: colors.border }])}>
          <TabTrigger name="leads" href="/" asChild>
            <TabButton>Leads</TabButton>
          </TabTrigger>
          <TabTrigger name="messages" href="/messages" asChild>
            <TabButton>Messages</TabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton>Account</TabButton>
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable {...props} style={styles.tabButton}>
      <Text variant={isFocused ? 'smallMedium' : 'small'} style={{ color: isFocused ? colors.brand[600] : colors.mutedForeground }}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  tabList: { flexDirection: 'row' },
  tabListInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
