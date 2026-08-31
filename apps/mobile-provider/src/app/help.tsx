import { ScrollView, StyleSheet } from 'react-native';
import { Screen, Card, Text, useAppTheme } from '@asaplocal/ui-native';

// Ports the account drawer's "Help center" panel content
// (apps/provider/components/account-drawer.tsx's FAQ_ITEMS) verbatim.
const FAQ_ITEMS = [
  {
    q: 'How do lead credits work?',
    a: 'Each lead you unlock uses one credit from your wallet. Top up or manage your plan from Billing & credits.',
  },
  {
    q: 'How is my trust tier calculated?',
    a: 'Your tier reflects your verification status, reviews, and completed jobs. Finish verification to move up a tier.',
  },
  {
    q: 'How do I change my service area?',
    a: 'Update your service radius and areas from Business profile.',
  },
  {
    q: 'Who can I contact for support?',
    a: "Email support@asaplocal.pro and we'll get back to you within one business day.",
  },
];

export default function HelpScreen() {
  const { spacing } = useAppTheme();
  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        {FAQ_ITEMS.map((faq) => (
          <Card key={faq.q} style={styles.card}>
            <Text variant="smallMedium">{faq.q}</Text>
            <Text variant="small" color="muted" style={styles.answer}>
              {faq.a}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 10 },
  card: { gap: 4 },
  answer: { lineHeight: 20 },
});
