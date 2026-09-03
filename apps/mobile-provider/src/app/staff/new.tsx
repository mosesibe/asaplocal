import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { StaffForm } from '@/components/StaffForm';

// Ports apps/provider/app/staff/new/page.tsx.
export default function NewStaffScreen() {
  const router = useRouter();
  const { spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]} keyboardShouldPersistTaps="handled">
        <Text variant="title" style={styles.heading}>
          Add a staff member
        </Text>
        <StaffForm onSaved={() => router.replace('/staff')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 12 },
  heading: { fontSize: 22, lineHeight: 28 },
});
