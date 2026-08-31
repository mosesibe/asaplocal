import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Screen, Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { LocationPicker, type LocationValue } from '@/components/LocationPicker';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: 'SOLE_TRADER', label: 'Sole Trader' },
  { value: 'LIMITED_COMPANY', label: 'Limited Company' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'SELF_EMPLOYED', label: 'Self-employed' },
  { value: 'CHARITY', label: 'Charity' },
];

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];

type Step = 1 | 2;

// Ports apps/provider/app/onboarding/{page,onboarding-form}.tsx. No slider
// dependency exists in this app, so service radius is preset chips instead
// of a drag slider — same values web's <input type="range"> allows, just a
// tap instead of a drag.
export default function OnboardingScreen() {
  const { user, refresh } = useSession();
  const { colors, radius, spacing } = useAppTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [businessType, setBusinessType] = useState('SOLE_TRADER');
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  const [location, setLocation] = useState<LocationValue>({ addressLine: '', city: '' });
  const [baseRadiusMiles, setBaseRadiusMiles] = useState(15);
  const [utrNumber, setUtrNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  useEffect(() => {
    api.request<{ categories: Category[] }>('/api/categories').then((res) => setCategories(res.categories)).catch(() => {});
  }, []);

  const parentCategories = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    childrenByParent.set(c.parentId, [...(childrenByParent.get(c.parentId) ?? []), c]);
  }

  function toggleCategory(slug: string) {
    setCategorySlugs((prev) => {
      const selecting = !prev.includes(slug);
      const category = categories.find((c) => c.slug === slug);
      const isParent = category && !category.parentId;
      if (isParent) {
        const childSlugs = (childrenByParent.get(category.id) ?? []).map((c) => c.slug);
        const withoutGroup = prev.filter((s) => s !== slug && !childSlugs.includes(s));
        return selecting ? [...withoutGroup, slug, ...childSlugs] : withoutGroup;
      }
      return selecting ? [...prev, slug] : prev.filter((s) => s !== slug);
    });
  }

  function onNext() {
    setError(null);
    if (categorySlugs.length === 0) return setError('Choose at least one service you offer');
    if (name.trim().length < 2) return setError('Enter your business name');
    if (description.trim().length < 20) return setError('Describe your business (20+ characters)');
    setStep(2);
  }

  const onSubmit = useCallback(async () => {
    setError(null);
    if (!location.addressLine || !location.city) return setError('Add your business address');
    setLoading(true);
    try {
      await api.request('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          businessType,
          categorySlugs,
          name,
          tradingName: tradingName || undefined,
          companyRegistrationNumber: companyRegistrationNumber || undefined,
          yearsInBusiness: yearsInBusiness ? Number(yearsInBusiness) : undefined,
          description,
          website: website || undefined,
          addressLine: location.addressLine,
          city: location.city,
          postcode: location.postcode || undefined,
          baseRadiusMiles,
          utrNumber: utrNumber || undefined,
          vatNumber: vatNumber || undefined,
        }),
      });
      await refresh();
      // Root layout's needsOnboarding gate flips to isInApp once
      // user.hasBusiness is true — no navigation call needed here.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [businessType, categorySlugs, name, tradingName, companyRegistrationNumber, yearsInBusiness, description, website, location, baseRadiusMiles, utrNumber, vatNumber, refresh]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Text variant="title" style={styles.h1}>
          Set up your business profile
        </Text>
        <Text variant="body" color="muted">
          Takes a few minutes — you'll get 2 free lead credits to try the marketplace.
        </Text>

        {step === 1 ? (
          <Card style={styles.card}>
            <Text variant="smallMedium">Business type</Text>
            <View style={styles.chipRow}>
              {BUSINESS_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setBusinessType(t.value)}
                  style={[styles.chip, { borderColor: colors.border, borderRadius: radius.full }, businessType === t.value && { backgroundColor: colors.brand[600], borderColor: colors.brand[600] }]}
                >
                  <Text variant="caption" style={businessType === t.value ? styles.chipTextActive : undefined} color={businessType === t.value ? undefined : 'muted'}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text variant="smallMedium" style={styles.sectionLabel}>
              Services you offer
            </Text>
            <View style={[styles.categoryBox, { borderColor: colors.border, borderRadius: radius.lg }]}>
              {parentCategories.map((parent) => (
                <View key={parent.id} style={styles.categoryGroup}>
                  <Pressable style={styles.checkboxRow} onPress={() => toggleCategory(parent.slug)}>
                    <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: categorySlugs.includes(parent.slug) ? colors.brand[600] : 'transparent' }]} />
                    <Text variant="smallMedium">{parent.name}</Text>
                  </Pressable>
                  {(childrenByParent.get(parent.id) ?? []).map((child) => (
                    <Pressable key={child.id} style={[styles.checkboxRow, styles.childRow]} onPress={() => toggleCategory(child.slug)}>
                      <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: categorySlugs.includes(child.slug) ? colors.brand[600] : 'transparent' }]} />
                      <Text variant="small" color="muted">
                        {child.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            <TextField placeholder="Business name" value={name} onChangeText={setName} />
            <TextField placeholder="Trading name (optional)" value={tradingName} onChangeText={setTradingName} />
            {businessType === 'LIMITED_COMPANY' && (
              <TextField placeholder="Company registration number" value={companyRegistrationNumber} onChangeText={setCompanyRegistrationNumber} />
            )}
            <TextField placeholder="Years in business (optional)" keyboardType="number-pad" value={yearsInBusiness} onChangeText={setYearsInBusiness} />
            <TextField placeholder="Describe your business (20+ characters)" value={description} onChangeText={setDescription} multiline numberOfLines={4} style={styles.textarea} />
            <TextField placeholder="Website (optional)" autoCapitalize="none" value={website} onChangeText={setWebsite} />

            {error && (
              <Text variant="small" style={styles.error}>
                {error}
              </Text>
            )}
            <Button onPress={onNext}>Continue</Button>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text variant="smallMedium" color="muted">
              Contact information
            </Text>
            <Text variant="small">
              We'll use the email from your account — {user?.email}
            </Text>

            <Text variant="smallMedium" style={styles.sectionLabel}>
              Business address
            </Text>
            <LocationPicker value={location} onChange={setLocation} />

            <Text variant="smallMedium" style={styles.sectionLabel}>
              Service radius: {baseRadiusMiles} miles
            </Text>
            <View style={styles.chipRow}>
              {RADIUS_OPTIONS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setBaseRadiusMiles(r)}
                  style={[styles.chip, { borderColor: colors.border, borderRadius: radius.full }, baseRadiusMiles === r && { backgroundColor: colors.brand[600], borderColor: colors.brand[600] }]}
                >
                  <Text variant="caption" color={baseRadiusMiles === r ? undefined : 'muted'} style={baseRadiusMiles === r ? styles.chipTextActive : undefined}>
                    {r} mi
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text variant="smallMedium" style={styles.sectionLabel}>
              Tax information (optional for launch)
            </Text>
            <TextField placeholder="UTR number" value={utrNumber} onChangeText={setUtrNumber} />
            <TextField placeholder="VAT number" value={vatNumber} onChangeText={setVatNumber} />

            {error && (
              <Text variant="small" style={styles.error}>
                {error}
              </Text>
            )}
            <View style={styles.footerRow}>
              <Button variant="outline" style={styles.flex1} onPress={() => setStep(1)}>
                Back
              </Button>
              <Button style={styles.flex1} onPress={onSubmit} loading={loading}>
                Create business profile
              </Button>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 12 },
  h1: { fontSize: 22, lineHeight: 28 },
  card: { gap: 10 },
  sectionLabel: { marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth },
  chipTextActive: { color: '#fff' },
  categoryBox: { borderWidth: StyleSheet.hairlineWidth, padding: 10, gap: 6, maxHeight: 260 },
  categoryGroup: { gap: 2 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  childRow: { marginLeft: 20 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  error: { color: '#dc2626' },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  flex1: { flex: 1 },
});
