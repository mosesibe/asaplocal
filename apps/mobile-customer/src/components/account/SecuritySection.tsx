import { useState } from 'react';
import { Switch } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { KeyRound, Fingerprint } from 'lucide-react-native';

import { api } from '@/lib/api';
import { SectionCard, SectionRow } from './SectionRow';

// Ports apps/web/components/account/security-section.tsx. Passkey
// *registration* is deliberately not implemented here: web's version drives
// @simplewebauthn/browser's startRegistration() against a cookie-session
// CSRF-protected NextAuth-internal endpoint — there's no bearer-token-
// compatible REST contract for it, and the actual credential ceremony would
// need a native passkey API (a different SDK entirely) to replace the
// browser's navigator.credentials.create(). Removing an existing passkey
// (DELETE /api/account/webauthn) IS plain bearer-auth JSON and works as-is,
// so that half of the toggle is real; turning it on deep-links to the web
// dashboard instead of a broken native flow.
export function SecuritySection({ signInMethods, hasPasskey, onChanged }: { signInMethods: string[]; hasPasskey: boolean; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleToggle(next: boolean) {
    if (next) {
      // Goes through the same base-URL resolution every other request in
      // this app uses (production URL, or a dev override if one's set from
      // the Account screen) — a separate ad-hoc `process.env` read here had
      // its own independent fallback to localhost, out of sync with
      // whatever the rest of the app was actually configured to hit.
      const baseUrl = await api.getBaseUrl();
      WebBrowser.openBrowserAsync(`${baseUrl}/dashboard`);
      return;
    }
    setLoading(true);
    try {
      await api.request('/api/account/webauthn', { method: 'DELETE' });
      onChanged();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="Security">
      <SectionRow icon={KeyRound} label="Sign-in methods" description={signInMethods.join(', ') || 'None'} />
      <SectionRow
        icon={Fingerprint}
        label="Biometric unlock"
        description={hasPasskey ? 'Enabled on this device via passkey' : 'Manage passkeys on web'}
        right={<Switch value={hasPasskey} onValueChange={handleToggle} disabled={loading} />}
      />
    </SectionCard>
  );
}
