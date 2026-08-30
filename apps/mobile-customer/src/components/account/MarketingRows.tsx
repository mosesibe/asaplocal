import { useState } from 'react';
import { Switch } from 'react-native';
import { Mail, MessageSquare } from 'lucide-react-native';
import { Text, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { SectionRow } from './SectionRow';

// Ports apps/web/components/account/marketing-rows.tsx: optimistic toggles,
// rolled back on failure.
export function MarketingRows({ initialEmail, initialSms }: { initialEmail: boolean; initialSms: boolean }) {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState(initialEmail);
  const [sms, setSms] = useState(initialSms);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: 'email' | 'sms', value: boolean) {
    setError(null);
    if (key === 'email') setEmail(value);
    else setSms(value);
    try {
      await api.request('/api/account/marketing', { method: 'PATCH', body: JSON.stringify({ [key]: value }) });
    } catch {
      if (key === 'email') setEmail(!value);
      else setSms(!value);
      setError("Couldn't save that — please try again.");
    }
  }

  return (
    <>
      <SectionRow
        icon={Mail}
        label="Marketing emails"
        description="Tips and offers. Booking and payment emails are unaffected."
        right={<Switch value={email} onValueChange={(v) => toggle('email', v)} trackColor={{ true: colors.brand[600] }} />}
      />
      <SectionRow
        icon={MessageSquare}
        label="Marketing texts"
        description="Occasional SMS offers"
        right={<Switch value={sms} onValueChange={(v) => toggle('sms', v)} trackColor={{ true: colors.brand[600] }} />}
      />
      {error && (
        <Text variant="caption" style={{ color: '#dc2626', paddingHorizontal: 16, paddingBottom: 8 }}>
          {error}
        </Text>
      )}
    </>
  );
}
