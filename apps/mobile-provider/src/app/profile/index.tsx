import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Trash2, X } from 'lucide-react-native';
import { Screen, Card, Text, Button, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';
import Slider from '@react-native-community/slider';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
import { usePhotoPicker } from '@/lib/photo-picker';
import { LocationPicker, type LocationValue } from '@/components/LocationPicker';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type DayHours = { open: string; close: string } | null;
type WorkingHours = Record<DayKey, DayHours>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const EMPTY_HOURS: WorkingHours = { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null };

interface AddressRow {
  id: string;
  label: string | null;
  addressLine: string;
  city: string;
  postcode: string | null;
}

interface BusinessProfileResponse {
  name: string;
  tradingName: string;
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  phone: string;
  website: string;
  baseRadiusMiles: number;
  photoUrls: string[];
  languagesSpoken: string[];
  emergencyCalloutsAvailable: boolean;
  workingHours: WorkingHours | null;
  targetResponseMins?: number;
  businessType: string | null;
  primaryAddress: { addressLine: string | null; city: string; postcode: string | null };
  addresses: AddressRow[];
}

// Ports apps/provider/app/profile/{page,profile-form,addresses-section}.tsx.
// No Select/Switch/Slider primitives exist in @asaplocal/ui-native, so this
// uses RN's own Switch for toggles and @react-native-community/slider for
// the service-radius range (matches web's <input type="range">).
export default function BusinessProfileScreen() {
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [primaryAddress, setPrimaryAddress] = useState<{ addressLine: string | null; city: string; postcode: string | null } | null>(null);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);

  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [baseRadiusMiles, setBaseRadiusMiles] = useState(10);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [languagesInput, setLanguagesInput] = useState('');
  const [emergencyCalloutsAvailable, setEmergencyCalloutsAvailable] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(EMPTY_HOURS);
  const [targetResponseMins, setTargetResponseMins] = useState('');

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verificationReset, setVerificationReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pick, sheet } = usePhotoPicker();

  // Addresses section
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [newLocation, setNewLocation] = useState<LocationValue>({ addressLine: '', city: '' });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressBusyId, setAddressBusyId] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<BusinessProfileResponse>('/api/business');
      setName(res.name);
      setSavedName(res.name);
      setTradingName(res.tradingName);
      setDescription(res.description);
      setLogoUrl(res.logoUrl);
      setCoverImageUrl(res.coverImageUrl);
      setPhone(res.phone);
      setWebsite(res.website);
      setBaseRadiusMiles(res.baseRadiusMiles);
      setPhotoUrls(res.photoUrls);
      setLanguagesInput(res.languagesSpoken.join(', '));
      setEmergencyCalloutsAvailable(res.emergencyCalloutsAvailable);
      setWorkingHours(res.workingHours ?? EMPTY_HOURS);
      setTargetResponseMins(res.targetResponseMins != null ? String(res.targetResponseMins) : '');
      setBusinessType(res.businessType);
      setPrimaryAddress(res.primaryAddress);
      setAddresses(res.addresses);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickLogo = useCallback(async () => {
    const assets = await pick({ quality: 0.7 });
    if (assets.length === 0) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const asset = assets[0];
      const url = await uploadImage(asset.uri, 'business-logo', asset.mimeType ?? 'image/jpeg');
      setLogoUrl(url);
    } catch {
      setError('Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  }, [pick]);

  const pickCover = useCallback(async () => {
    const assets = await pick({ quality: 0.7 });
    if (assets.length === 0) return;
    setUploadingCover(true);
    setError(null);
    try {
      const asset = assets[0];
      const url = await uploadImage(asset.uri, 'business-cover', asset.mimeType ?? 'image/jpeg');
      setCoverImageUrl(url);
    } catch {
      setError('Cover image upload failed.');
    } finally {
      setUploadingCover(false);
    }
  }, [pick]);

  const pickPhotos = useCallback(async () => {
    const assets = await pick({ quality: 0.7, allowsMultipleSelection: true });
    if (assets.length === 0) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const results = await Promise.allSettled(assets.map((a) => uploadImage(a.uri, 'business-photo', a.mimeType ?? 'image/jpeg')));
      const urls = results.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled').map((r) => r.value);
      const failures = results.length - urls.length;
      if (urls.length > 0) setPhotoUrls((p) => [...p, ...urls]);
      if (failures > 0) setError(`${failures} photo${failures > 1 ? 's' : ''} failed to upload.`);
    } finally {
      setUploadingPhoto(false);
    }
  }, [pick]);

  function removePhoto(url: string) {
    setPhotoUrls((p) => p.filter((u) => u !== url));
  }

  function setDay(key: DayKey, hours: DayHours) {
    setWorkingHours((h) => ({ ...h, [key]: hours }));
  }

  const nameChanged = name.trim() !== savedName.trim() && savedName.length > 0;

  const onSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setVerificationReset(false);
    setError(null);
    try {
      const body = await api.request<{ verificationReset: boolean }>('/api/business', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          tradingName: tradingName || undefined,
          description,
          logoUrl: logoUrl || undefined,
          coverImageUrl: coverImageUrl || undefined,
          phone,
          website: website || undefined,
          baseRadiusMiles,
          photoUrls,
          languagesSpoken: languagesInput.split(',').map((s) => s.trim()).filter(Boolean),
          emergencyCalloutsAvailable,
          workingHours,
          targetResponseMins: targetResponseMins ? Number(targetResponseMins) : undefined,
        }),
      });
      setSavedName(name);
      setVerificationReset(Boolean(body?.verificationReset));
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong — your changes weren't saved.");
    } finally {
      setSaving(false);
    }
  }, [name, tradingName, description, logoUrl, coverImageUrl, phone, website, baseRadiusMiles, photoUrls, languagesInput, emergencyCalloutsAvailable, workingHours, targetResponseMins]);

  const addAddress = useCallback(async () => {
    if (!newLocation.addressLine || !newLocation.city) {
      setAddressError('Choose an address');
      return;
    }
    setAddressSaving(true);
    setAddressError(null);
    try {
      const res = await api.request<{ address: AddressRow }>('/api/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: addressLabel || undefined,
          addressLine: newLocation.addressLine,
          city: newLocation.city,
          postcode: newLocation.postcode,
          lat: newLocation.lat,
          lng: newLocation.lng,
        }),
      });
      setAddresses((a) => [...a, res.address]);
      setAddressLabel('');
      setNewLocation({ addressLine: '', city: '' });
      setAddingAddress(false);
    } catch (e) {
      setAddressError(e instanceof ApiError ? e.message : "Couldn't save that address.");
    } finally {
      setAddressSaving(false);
    }
  }, [addressLabel, newLocation]);

  const removeAddress = useCallback(async (id: string) => {
    setAddressBusyId(id);
    try {
      await api.request(`/api/addresses/${id}`, { method: 'DELETE' });
      setAddresses((a) => a.filter((x) => x.id !== id));
    } catch {
      // best-effort
    } finally {
      setAddressBusyId(null);
    }
  }, []);

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={styles.centered}>
        <Text variant="small" style={styles.error}>
          {loadError}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]}>
        <View style={styles.headerRow}>
          <Text variant="small" color="muted" style={styles.flex1}>
            This is what customers see on your public listing.
          </Text>
          <Pressable onPress={() => router.push('/profile/preview')}>
            <Text variant="smallMedium" color="brand">
              Preview →
            </Text>
          </Pressable>
        </View>

        <Card style={styles.card}>
          <Text variant="smallMedium">Business name</Text>
          <TextField value={name} onChangeText={setName} />
          {nameChanged && (
            <View style={[styles.banner, { backgroundColor: '#fef3c7', borderRadius: radius.md }]}>
              <Text variant="caption" style={styles.bannerText}>
                Changing your business name will remove your verified status — you'll need to re-verify your business.
              </Text>
            </View>
          )}

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Trade name
          </Text>
          <TextField placeholder="Trading name (optional)" value={tradingName} onChangeText={setTradingName} />

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Description
          </Text>
          <TextField value={description} onChangeText={setDescription} multiline numberOfLines={5} style={styles.textarea} />

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Logo
          </Text>
          <View style={styles.imageRow}>
            {!!logoUrl && <Image source={{ uri: logoUrl }} style={[styles.logoThumb, { borderRadius: radius.full }]} />}
            <Button variant="outline" size="sm" onPress={pickLogo} loading={uploadingLogo}>
              {logoUrl ? 'Replace' : 'Upload'}
            </Button>
          </View>

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Cover image
          </Text>
          <View style={styles.imageRow}>
            {!!coverImageUrl && <Image source={{ uri: coverImageUrl }} style={[styles.coverThumb, { borderRadius: radius.md }]} />}
            <Button variant="outline" size="sm" onPress={pickCover} loading={uploadingCover}>
              {coverImageUrl ? 'Replace' : 'Upload'}
            </Button>
          </View>

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Business photos
          </Text>
          <View style={styles.photoGrid}>
            {photoUrls.map((url) => (
              <View key={url} style={styles.photoWrap}>
                <Image source={{ uri: url }} style={[styles.photoThumb, { borderRadius: radius.md }]} />
                <Pressable style={styles.photoRemove} onPress={() => removePhoto(url)}>
                  <X size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            <Pressable
              style={[styles.addPhotoButton, { borderRadius: radius.md, borderColor: colors.border }]}
              onPress={pickPhotos}
              disabled={uploadingPhoto}
            >
              <Text variant="caption" color="muted">
                {uploadingPhoto ? 'Uploading…' : '+ Add'}
              </Text>
            </Pressable>
          </View>

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Phone
          </Text>
          <TextField value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Website
          </Text>
          <TextField value={website} onChangeText={setWebsite} autoCapitalize="none" />

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Service radius: {baseRadiusMiles} miles
          </Text>
          <Slider
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={baseRadiusMiles}
            onValueChange={setBaseRadiusMiles}
            minimumTrackTintColor={colors.brand[600]}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.brand[600]}
          />

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Languages spoken
          </Text>
          <TextField placeholder="English, Polish, Urdu" value={languagesInput} onChangeText={setLanguagesInput} />

          <View style={[styles.switchRow, styles.sectionLabel]}>
            <Text variant="small" style={styles.flex1}>
              Available for emergency callouts
            </Text>
            <Switch
              value={emergencyCalloutsAvailable}
              onValueChange={setEmergencyCalloutsAvailable}
              trackColor={{ true: colors.brand[600] }}
            />
          </View>

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Target response time (minutes)
          </Text>
          <TextField value={targetResponseMins} onChangeText={setTargetResponseMins} keyboardType="number-pad" />

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Working hours
          </Text>
          {DAYS.map(({ key, label }) => {
            const hours = workingHours[key];
            return (
              <View key={key} style={styles.dayRow}>
                <View style={[styles.switchRow, styles.dayToggle]}>
                  <Switch
                    value={hours !== null}
                    onValueChange={(on) => setDay(key, on ? { open: '09:00', close: '17:00' } : null)}
                    trackColor={{ true: colors.brand[600] }}
                  />
                  <Text variant="small">{label}</Text>
                </View>
                {hours && (
                  <View style={styles.hoursRow}>
                    <TextField
                      style={styles.hoursInput}
                      value={hours.open}
                      onChangeText={(open) => setDay(key, { ...hours, open })}
                      placeholder="09:00"
                    />
                    <Text variant="small" color="muted">
                      –
                    </Text>
                    <TextField
                      style={styles.hoursInput}
                      value={hours.close}
                      onChangeText={(close) => setDay(key, { ...hours, close })}
                      placeholder="17:00"
                    />
                  </View>
                )}
              </View>
            );
          })}

          {saved && !verificationReset && (
            <Text variant="small" style={styles.success}>
              Saved.
            </Text>
          )}
          {saved && verificationReset && (
            <View style={[styles.banner, { backgroundColor: '#fef3c7', borderRadius: radius.md }]}>
              <Text variant="caption" style={styles.bannerText}>
                Saved. Your business is no longer verified.
              </Text>
              <Pressable onPress={() => router.push('/verification')}>
                <Text variant="smallMedium" style={styles.bannerLink}>
                  Go to verification centre →
                </Text>
              </Pressable>
            </View>
          )}
          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}
          <Button onPress={onSave} loading={saving} style={styles.sectionLabel}>
            Save changes
          </Button>
        </Card>

        <Card style={styles.card}>
          <View>
            <Text variant="subtitle">{businessType === 'SOLE_TRADER' ? 'Trading address' : 'Addresses'}</Text>
            <Text variant="small" color="muted">
              {businessType === 'SOLE_TRADER'
                ? "Where you're based. This is what we match leads against."
                : 'Your main address is used for lead matching. Add branches or sites you also trade from.'}
            </Text>
          </View>

          {primaryAddress && (
            <View style={[styles.addressRow, { borderColor: colors.border }]}>
              <MapPin size={16} color={colors.brand[600]} style={styles.addressIcon} />
              <View style={styles.flex1}>
                <Text variant="small">
                  {primaryAddress.addressLine ? `${primaryAddress.addressLine}, ` : ''}
                  {primaryAddress.city}
                  {primaryAddress.postcode ? `, ${primaryAddress.postcode}` : ''}
                </Text>
                <Text variant="caption" color="muted">
                  Main address
                </Text>
              </View>
            </View>
          )}

          {addresses.map((a) => (
            <View key={a.id} style={[styles.addressRow, { borderColor: colors.border }]}>
              <MapPin size={16} color={colors.mutedForeground} style={styles.addressIcon} />
              <View style={styles.flex1}>
                <Text variant="small">
                  {a.addressLine}, {a.city}
                  {a.postcode ? `, ${a.postcode}` : ''}
                </Text>
                {a.label && (
                  <Text variant="caption" color="muted">
                    {a.label}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => removeAddress(a.id)} disabled={addressBusyId === a.id}>
                <Trash2 size={15} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}

          {businessType !== 'SOLE_TRADER' &&
            (addingAddress ? (
              <View style={styles.addAddressBlock}>
                <View style={styles.switchRow}>
                  <Text variant="smallMedium" style={styles.flex1}>
                    Add an address
                  </Text>
                  <Pressable onPress={() => { setAddingAddress(false); setAddressError(null); }}>
                    <X size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                <TextField placeholder="Label (e.g. Leeds branch)" value={addressLabel} onChangeText={setAddressLabel} />
                <LocationPicker value={newLocation} onChange={setNewLocation} />
                {addressError && (
                  <Text variant="small" style={styles.error}>
                    {addressError}
                  </Text>
                )}
                <Button onPress={addAddress} loading={addressSaving}>
                  Save address
                </Button>
              </View>
            ) : (
              <Button variant="outline" onPress={() => setAddingAddress(true)} style={styles.sectionLabel}>
                Add another address
              </Button>
            ))}

          {businessType === 'SOLE_TRADER' && (
            <Text variant="caption" color="muted">
              Registered as a sole trader, so you have a single trading address. Change your business type in onboarding if you
              operate from more than one site.
            </Text>
          )}
        </Card>
      </ScrollView>
      {sheet}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { gap: 4 },
  sectionLabel: { marginTop: 12 },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoThumb: { width: 44, height: 44 },
  coverThumb: { width: 72, height: 44 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 64, height: 64 },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#dc2626',
    borderRadius: 999,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    width: 64,
    height: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayRow: { marginTop: 8, gap: 6 },
  dayToggle: { minWidth: 140 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 52 },
  hoursInput: { flex: 1 },
  banner: { padding: 10, marginTop: 8, gap: 4 },
  bannerText: { color: '#92400e' },
  bannerLink: { color: '#92400e', textDecorationLine: 'underline' },
  success: { color: '#047857', marginTop: 8 },
  error: { color: '#dc2626', marginTop: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10, marginTop: 8 },
  addressIcon: { marginTop: 1 },
  addAddressBlock: { gap: 8, marginTop: 12 },
  flex1: { flex: 1 },
});
