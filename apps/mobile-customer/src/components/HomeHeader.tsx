import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageSquare, Bell } from 'lucide-react-native';
import { Text, useAppTheme } from '@asaplocal/ui-native';

// Matches apps/web/components/site-header.tsx: logo mark + wordmark
// ("Asap" foreground, "Local" brand-500), then search/messages/bell icon
// buttons. The mark reuses the app's own processed brand-mark asset
// (android-icon-foreground.png) rather than shipping a second copy.
export function HomeHeader() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        <Image source={require('@/assets/images/android-icon-foreground.png')} style={styles.mark} contentFit="contain" />
        <Text variant="title" style={styles.wordmark}>
          Asap<Text variant="title" style={{ color: colors.brand[500] }}>Local</Text>
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.iconButton} onPress={() => router.push('/search')}>
          <Search size={20} color={colors.foreground} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push('/messages')}>
          <MessageSquare size={20} color={colors.foreground} />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={() => router.push('/notifications')}>
          <Bell size={20} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 28, height: 28 },
  wordmark: { fontSize: 20, lineHeight: 24 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
});
