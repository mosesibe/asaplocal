import { useState } from 'react';
import { Mail } from 'lucide-react-native';
import { Badge, Button } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { SectionRow } from './SectionRow';

// Ports apps/web/components/account/verify-email.tsx.
export function VerifyEmailRow({ email, verified }: { email: string; verified: boolean }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setSending(true);
    setError(null);
    try {
      await api.request('/api/account/email/resend', { method: 'POST' });
      setSent(true);
    } catch {
      setError("Couldn't send the email");
    } finally {
      setSending(false);
    }
  }

  return (
    <SectionRow
      icon={Mail}
      label="Email address"
      description={sent ? `New link sent to ${email}` : (error ?? email)}
      right={
        verified ? (
          <Badge variant="success">Verified</Badge>
        ) : (
          <Button size="sm" variant="outline" onPress={resend} loading={sending} disabled={sending || sent}>
            {sent ? 'Sent' : 'Verify email'}
          </Button>
        )
      }
    />
  );
}
