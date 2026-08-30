import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Gift, Copy, Check } from 'lucide-react-native';
import { Text, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { SectionRow } from './SectionRow';

interface ReferralSummary {
  code: string;
  link: string;
  rewardPence: number;
  creditBalancePence: number;
  referralCount: number;
  completedCount: number;
}

function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

// Ports apps/web/components/account/referral-card.tsx.
export function ReferralCard() {
  const { colors, radius } = useAppTheme();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .request<ReferralSummary>('/api/account/referral')
      .then(setSummary)
      .catch(() => {});
  }, []);

  async function copyLink() {
    if (!summary) return;
    await Clipboard.setStringAsync(summary.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const description = summary
    ? `You both get ${formatPence(summary.rewardPence)} in credit — you've earned ${formatPence(summary.creditBalancePence)} from ${summary.completedCount} referral${summary.completedCount === 1 ? '' : 's'}.`
    : "Share your link — you and your friend both get credit when they book.";

  return (
    <View>
      <SectionRow icon={Gift} label="Refer a friend" description={description} />
      {summary && (
        <View style={[styles.linkRow, { borderColor: colors.border }]}>
          <Text variant="caption" color="muted" numberOfLines={1} style={styles.linkText}>
            {summary.link}
          </Text>
          <Pressable onPress={copyLink} style={[styles.copyButton, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
            {copied ? <Check size={14} color={colors.brand[600]} /> : <Copy size={14} color={colors.mutedForeground} />}
            <Text variant="caption" color={copied ? 'brand' : 'muted'}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkText: { flex: 1 },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
});
