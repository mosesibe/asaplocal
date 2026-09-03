import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { MapPin, Pencil, Trash2, Plus } from 'lucide-react-native';
import { Button, Card, Text, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { LocationPicker, type LocationValue } from '@/components/LocationPicker';

interface Address {
  id: string;
  addressLine: string;
  city: string;
  postcode: string | null;
}

// Ports apps/web/components/account/addresses-section.tsx: list + add (via
// LocationPicker, same as the job-posting form) + inline edit + delete, all
// optimistic like the web version.
export function AddressesSection({ initial }: { initial: Address[] }) {
  const { colors, radius, spacing } = useAppTheme();
  const [addresses, setAddresses] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [newLocation, setNewLocation] = useState<LocationValue>({ addressLine: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ addressLine: string; city: string; postcode: string }>({ addressLine: '', city: '', postcode: '' });

  async function saveNew() {
    setSaving(true);
    try {
      const res = await api.request<{ address: Address }>('/api/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...newLocation, source: 'new' }),
      });
      setAddresses((prev) => [res.address, ...prev]);
      setAdding(false);
      setNewLocation({ addressLine: '', city: '' });
    } catch {
      // best-effort — leave the sheet open so the user can retry
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: Address) {
    setEditingId(a.id);
    setEditFields({ addressLine: a.addressLine, city: a.city, postcode: a.postcode ?? '' });
  }

  async function saveEdit(id: string) {
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, ...editFields } : a)));
    setEditingId(null);
    try {
      await api.request(`/api/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(editFields) });
    } catch {
      // best-effort, matches web
    }
  }

  async function remove(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    try {
      await api.request(`/api/addresses/${id}`, { method: 'DELETE' });
    } catch {
      // best-effort, matches web
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text variant="subtitle">Addresses</Text>
        <Button size="sm" variant="outline" onPress={() => setAdding(true)}>
          + Add
        </Button>
      </View>

      {addresses.length === 0 ? (
        <Text variant="small" color="muted">
          No saved addresses yet.
        </Text>
      ) : (
        addresses.map((a) => (
          <Card key={a.id} style={[styles.card, { borderRadius: radius.lg }]}>
            {editingId === a.id ? (
              <View style={styles.editForm}>
                <TextField
                  placeholder="Address line"
                  value={editFields.addressLine}
                  onChangeText={(addressLine) => setEditFields((f) => ({ ...f, addressLine }))}
                />
                <View style={styles.row}>
                  <TextField
                    style={styles.flex1}
                    placeholder="City"
                    value={editFields.city}
                    onChangeText={(city) => setEditFields((f) => ({ ...f, city }))}
                  />
                  <TextField
                    style={styles.flex1}
                    placeholder="Postcode"
                    value={editFields.postcode}
                    onChangeText={(postcode) => setEditFields((f) => ({ ...f, postcode }))}
                  />
                </View>
                <View style={styles.row}>
                  <Button size="sm" onPress={() => saveEdit(a.id)} style={styles.flex1}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onPress={() => setEditingId(null)} style={styles.flex1}>
                    Cancel
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.addressRow}>
                <MapPin size={18} color={colors.mutedForeground} />
                <View style={styles.addressInfo}>
                  <Text variant="small">{a.addressLine}</Text>
                  <Text variant="caption" color="muted">
                    {a.city}
                    {a.postcode ? `, ${a.postcode}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => startEdit(a)} hitSlop={8}>
                  <Pencil size={16} color={colors.mutedForeground} />
                </Pressable>
                <Pressable onPress={() => remove(a.id)} hitSlop={8}>
                  <Trash2 size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            )}
          </Card>
        ))
      )}

      <Modal visible={adding} animationType="slide" transparent onRequestClose={() => setAdding(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.backdrop} onPress={() => setAdding(false)} />
          <Card style={[styles.sheet, { backgroundColor: colors.surface, padding: spacing.four }]}>
            <Text variant="subtitle" style={styles.sheetTitle}>
              Add an address
            </Text>
            <LocationPicker value={newLocation} onChange={setNewLocation} />
            <Button onPress={saveNew} loading={saving} disabled={!newLocation.addressLine.trim() || !newLocation.city.trim()} style={styles.saveButton}>
              Save address
            </Button>
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8, marginTop: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { gap: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addressInfo: { flex: 1, minWidth: 0 },
  editForm: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 4, maxHeight: '85%' },
  sheetTitle: { marginBottom: 8 },
  saveButton: { marginTop: 12 },
});
