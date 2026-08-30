import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { Text, useAppTheme } from '@asaplocal/ui-native';

import { SectionRow } from './SectionRow';

interface Invoice {
  id: string;
  bookingId: string | null;
  businessName: string | null;
  type: string;
  typeLabel: string;
  amountPence: number;
  createdAt: string;
  invoiceRef: string;
}

function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

// Ports apps/web/components/account/invoices-section.tsx.
export function InvoicesSection({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <SectionRow
        icon={Receipt}
        label="Invoices and receipts"
        description={invoices.length > 0 ? `${invoices.length} payment${invoices.length === 1 ? '' : 's'}` : 'No payments yet'}
        onPress={invoices.length > 0 ? () => setExpanded((v) => !v) : undefined}
      />
      {expanded &&
        invoices.map((inv) => (
          <Pressable
            key={inv.id}
            onPress={() => inv.bookingId && router.push(`/bookings/${inv.bookingId}`)}
            style={[styles.row, { borderColor: colors.border }]}
          >
            <View style={styles.info}>
              <Text variant="small">{inv.businessName ?? inv.typeLabel}</Text>
              <Text variant="caption" color="muted">
                {inv.typeLabel} · {inv.invoiceRef} · {new Date(inv.createdAt).toLocaleDateString('en-GB')}
              </Text>
            </View>
            <Text variant="smallMedium">{formatPence(inv.amountPence)}</Text>
          </Pressable>
        ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, minWidth: 0, gap: 1 },
});
