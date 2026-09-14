import { useState } from 'react';
import { Phone } from 'lucide-react-native';
import { Badge, Button } from '@asaplocal/ui-native';

import { SectionRow } from './SectionRow';
import { PhoneVerificationModal } from './PhoneVerificationModal';

// Ports apps/web/components/account/verify-phone.tsx.
export function VerifyPhoneRow({ phone, verified, onVerified }: { phone: string | null; verified: boolean; onVerified: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SectionRow
        icon={Phone}
        label="Phone number"
        description={phone ?? 'No phone number on file'}
        right={verified ? <Badge variant="success">Verified</Badge> : <Button size="sm" variant="outline" onPress={() => setOpen(true)}>Verify phone</Button>}
      />
      <PhoneVerificationModal visible={open} onClose={() => setOpen(false)} initialPhone={phone} onVerified={onVerified} />
    </>
  );
}
