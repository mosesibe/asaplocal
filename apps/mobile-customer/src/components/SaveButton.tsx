import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

// Ports apps/web/components/save-button.tsx: optimistic toggle, reverts on
// failure. POST/DELETE /api/favourites/{businessId} take no body — the
// business id is a path param, both bearer-compatible.
export function SaveButton({ businessId, initialFavourited, size = 20 }: { businessId: string; initialFavourited: boolean; size?: number }) {
  const { colors } = useAppTheme();
  const [favourited, setFavourited] = useState(initialFavourited);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !favourited;
    setFavourited(next);
    setPending(true);
    try {
      await api.request(`/api/favourites/${businessId}`, { method: next ? 'POST' : 'DELETE' });
    } catch {
      setFavourited(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <Pressable onPress={toggle} disabled={pending} style={styles.button} hitSlop={8}>
      <Heart size={size} color={favourited ? '#dc2626' : colors.mutedForeground} fill={favourited ? '#dc2626' : 'transparent'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
});
