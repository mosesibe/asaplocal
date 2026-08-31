import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, findNodeHandle, Image, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { Screen, Card, Text, Badge, Button, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth-guard';
import { SaveButton } from '@/components/SaveButton';

interface Service {
  id: string;
  title: string;
  description: string;
  categoryName: string;
  priceType: 'FIXED' | 'HOURLY' | 'QUOTE_ONLY';
  priceMinPence: number | null;
  priceMaxPence: number | null;
}
interface Review {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[];
  authorName: string;
  createdAt: string;
  providerResponse: string | null;
}
interface ProviderDetail {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  city: string;
  baseRadiusMiles: number;
  avgRating: number;
  reviewCount: number;
  isFeatured: boolean;
  isFavourited: boolean;
  badges: { key: string; label: string }[];
  stats: { completedJobsCount: number; avgResponseMins: number | null; responseRatePct: number | null; yearsInBusiness: number | null };
  description: string | null;
  workingHours: Record<string, { open: string; close: string } | null> | null;
  languagesSpoken: string[];
  emergencyCalloutsAvailable: boolean;
  services: Service[];
  qualifications: { id: string; name: string; status: string }[];
  reviews: Review[];
  companyInfo: {
    companyDirectorName: string | null;
    businessTypeLabel: string;
    tradingName: string | null;
    companyRegistrationNumber: string | null;
    vatNumber: string | null;
    employeeCount: number | null;
  };
  insurancePolicies: { id: string; type: string; status: string; provider: string; coverageAmountPence: number }[];
  photoUrls: string[];
}

const DAY_LABELS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

// Mirrors apps/web/app/providers/[slug]/page.tsx's NAV_ITEMS (Accreditations
// has no entry of its own there either — it lives inside the "company-info"
// section and scrolling to that section reveals it right below).
const NAV_ITEMS: { id: string; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'services', label: 'Categories & services' },
  { id: 'skills', label: 'Skills' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'company-info', label: 'Company info' },
  { id: 'photos', label: 'Photos' },
];

function formatPence(pence: number): string {
  return `£${Math.round(pence / 100).toLocaleString('en-GB')}`;
}
function priceLine(s: Service): string {
  if (s.priceType === 'QUOTE_ONLY') return 'Quote on request';
  const min = s.priceMinPence != null ? formatPence(s.priceMinPence) : '?';
  const max = s.priceMaxPence != null ? ` – ${formatPence(s.priceMaxPence)}` : '';
  return `${min}${max}${s.priceType === 'HOURLY' ? ' / hr' : ''}`;
}

// Ports apps/web/app/providers/[slug]/page.tsx, backed by the new
// GET /api/providers/[slug] route (no such JSON endpoint existed before —
// the web page reads Prisma directly). "Similar tradespeople" and video
// portfolio items are intentionally left out: the former is a discovery
// nicety better served by Search, the latter isn't rendered on web either
// (PortfolioItem exists in the schema but this page never includes it).
export default function ProviderProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [biz, setBiz] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, View | null>>({});

  function registerSection(id: string, node: View | null) {
    sectionRefs.current[id] = node;
  }

  function scrollToSection(id: string) {
    const node = sectionRefs.current[id];
    const scrollHandle = findNodeHandle(scrollRef.current);
    if (!node || !scrollHandle) return;
    node.measureLayout(
      scrollHandle,
      (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true }),
      () => {}
    );
  }

  useEffect(() => {
    api
      .request<ProviderDetail>(`/api/providers/${slug}`)
      .then(setBiz)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }
  if (!biz) {
    return (
      <Screen style={styles.centered}>
        <Text>Provider not found.</Text>
      </Screen>
    );
  }

  const navItems = NAV_ITEMS.filter((item) => item.id !== 'details' || biz.description);

  return (
    <Screen>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}>
        <View style={[styles.cover, { backgroundColor: colors.muted }]}>
          {biz.coverImageUrl && <Image source={{ uri: biz.coverImageUrl }} style={styles.coverImg} />}
        </View>

        <View style={[styles.content, { padding: spacing.four }]}>
        <View style={styles.headerRow}>
          <View style={[styles.logo, { backgroundColor: colors.muted, borderColor: colors.background }]}>
            {biz.logoUrl && <Image source={{ uri: biz.logoUrl }} style={styles.logoImg} />}
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text variant="title" style={styles.name}>
                {biz.name}
              </Text>
              {biz.isFeatured && <Badge variant="warning">Featured</Badge>}
            </View>
            <Text variant="small" color="muted">
              {biz.city} · serves {biz.baseRadiusMiles} mile radius
            </Text>
            <Text variant="small" color="muted">
              ★ {biz.avgRating.toFixed(1)} ({biz.reviewCount})
            </Text>
          </View>
          <View style={styles.headerActions}>
            <SaveButton businessId={biz.id} initialFavourited={biz.isFavourited} loginCallbackPath={`/providers/${biz.slug}`} />
            <Pressable onPress={() => Share.share({ title: biz.name, message: `Check out ${biz.name} on AsapLocal` })} hitSlop={8}>
              <Share2 size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {biz.badges.length > 0 && (
          <View style={styles.badgeRow}>
            {biz.badges.map((b) => (
              <Badge key={b.key} variant="secondary">
                {b.label}
              </Badge>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <StatCard label="Jobs completed" value={String(biz.stats.completedJobsCount)} />
          <StatCard label="Avg. response" value={biz.stats.avgResponseMins != null ? `${biz.stats.avgResponseMins}m` : '—'} />
          <StatCard label="Response rate" value={biz.stats.responseRatePct != null ? `${biz.stats.responseRatePct}%` : '—'} />
          <StatCard label="Years trading" value={biz.stats.yearsInBusiness != null ? String(biz.stats.yearsInBusiness) : '—'} />
        </View>

        <Button
          onPress={() =>
            requireAuth('/jobs/new', () => router.push({ pathname: '/jobs/new', params: { businessId: biz.id, businessName: biz.name } }))
          }
        >
          Request a quote
        </Button>

        {navItems.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.navBar, { borderColor: colors.border }]}
            contentContainerStyle={styles.navBarContent}
          >
            {navItems.map((item) => (
              <Pressable key={item.id} onPress={() => scrollToSection(item.id)} style={styles.navItem} hitSlop={4}>
                <Text variant="smallMedium" color="muted">
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {biz.description && (
          <Section id="details" onRef={registerSection} title="Details">
            <Text variant="small" style={styles.paragraph}>
              {biz.description}
            </Text>
            {biz.workingHours && (
              <View style={styles.hoursBlock}>
                {DAY_LABELS.map((d) => (
                  <View key={d.key} style={styles.hourRow}>
                    <Text variant="small" color="muted">
                      {d.label}
                    </Text>
                    <Text variant="small">
                      {biz.workingHours?.[d.key] ? `${biz.workingHours[d.key]!.open} – ${biz.workingHours[d.key]!.close}` : 'Closed'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {biz.languagesSpoken.length > 0 && (
              <View style={styles.badgeRow}>
                {biz.languagesSpoken.map((l) => (
                  <Badge key={l} variant="outline">
                    {l}
                  </Badge>
                ))}
              </View>
            )}
            {biz.emergencyCalloutsAvailable && <Badge variant="secondary">Available for emergency callouts</Badge>}
          </Section>
        )}

        <Section id="services" onRef={registerSection} title="Categories & services">
          {biz.services.length === 0 ? (
            <Text variant="small" color="muted">
              No services listed yet.
            </Text>
          ) : (
            biz.services.map((s) => (
              <Card key={s.id} style={[styles.innerCard, { borderRadius: radius.lg }]}>
                <View style={styles.serviceHeader}>
                  <Text variant="bodyMedium" style={styles.flexShrink}>
                    {s.title}
                  </Text>
                  <Badge variant="outline">{s.categoryName}</Badge>
                </View>
                <Text variant="small" color="muted">
                  {s.description}
                </Text>
                <Text variant="smallMedium">{priceLine(s)}</Text>
              </Card>
            ))
          )}
        </Section>

        <Section id="skills" onRef={registerSection} title="Skills">
          {biz.qualifications.length === 0 ? (
            <Text variant="small" color="muted">
              No skills or certifications listed yet.
            </Text>
          ) : (
            <View style={styles.badgeRow}>
              {biz.qualifications.map((q) => (
                <Badge key={q.id} variant={q.status === 'VERIFIED' ? 'success' : 'outline'}>
                  {q.name}
                </Badge>
              ))}
            </View>
          )}
        </Section>

        <Section id="reviews" onRef={registerSection} title={`Reviews (${biz.reviewCount})`}>
          {biz.reviews.length === 0 ? (
            <Text variant="small" color="muted">
              No reviews yet — be the first to book and review.
            </Text>
          ) : (
            biz.reviews.map((r) => (
              <Card key={r.id} style={[styles.innerCard, { borderRadius: radius.lg }]}>
                <View style={styles.reviewHeader}>
                  <Text variant="smallMedium">{r.authorName}</Text>
                  <Text variant="small" color="muted">
                    ★ {r.rating}
                  </Text>
                </View>
                {r.comment && <Text variant="small">{r.comment}</Text>}
                {r.providerResponse && (
                  <View style={[styles.responseBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                    <Text variant="caption" color="muted">
                      Response from the business
                    </Text>
                    <Text variant="small">{r.providerResponse}</Text>
                  </View>
                )}
              </Card>
            ))
          )}
        </Section>

        <Section id="company-info" onRef={registerSection} title="Company info">
          {!biz.companyInfo.companyDirectorName && !biz.companyInfo.companyRegistrationNumber ? (
            <Text variant="small" color="muted">
              No company information provided yet.
            </Text>
          ) : (
            <View style={styles.infoGrid}>
              {biz.companyInfo.companyDirectorName && <InfoRow label="Owner" value={biz.companyInfo.companyDirectorName} />}
              <InfoRow label="Company type" value={biz.companyInfo.businessTypeLabel} />
              {biz.companyInfo.tradingName && <InfoRow label="Trading as" value={biz.companyInfo.tradingName} />}
              {biz.companyInfo.companyRegistrationNumber && <InfoRow label="Company no." value={biz.companyInfo.companyRegistrationNumber} />}
              {biz.companyInfo.vatNumber && <InfoRow label="VAT no." value={biz.companyInfo.vatNumber} />}
              {biz.companyInfo.employeeCount != null && <InfoRow label="Employees" value={String(biz.companyInfo.employeeCount)} />}
            </View>
          )}
        </Section>

        <Section title="Accreditations & insurance">
          {biz.insurancePolicies.length === 0 ? (
            <Text variant="small" color="muted">
              No accreditations or insurance on file yet.
            </Text>
          ) : (
            biz.insurancePolicies.map((p) => (
              <Card key={p.id} style={[styles.innerCard, { borderRadius: radius.lg }]}>
                <View style={styles.serviceHeader}>
                  <Text variant="smallMedium">{p.type.replace(/_/g, ' ')}</Text>
                  {p.status === 'VERIFIED' && <Badge variant="success">Verified</Badge>}
                </View>
                <Text variant="small" color="muted">
                  {p.provider} · covers up to {formatPence(p.coverageAmountPence)}
                </Text>
              </Card>
            ))
          )}
        </Section>

        <Section id="photos" onRef={registerSection} title="Photos">
          {biz.photoUrls.length === 0 ? (
            <Text variant="small" color="muted">
              No photos added yet.
            </Text>
          ) : (
            <View style={styles.photoGrid}>
              {biz.photoUrls.map((url) => (
                <Image key={url} source={{ uri: url }} style={[styles.photo, { borderRadius: radius.md }]} />
              ))}
            </View>
          )}
        </Section>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Section({
  id,
  onRef,
  title,
  children,
}: {
  id?: string;
  onRef?: (id: string, node: View | null) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section} ref={id && onRef ? (node) => onRef(id, node) : undefined}>
      <Text variant="subtitle" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.statCard}>
      <Text variant="bodyMedium">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="small" color="muted">
        {label}
      </Text>
      <Text variant="small">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: {},
  cover: { width: '100%', height: 200 },
  coverImg: { width: '100%', height: '100%' },
  content: { gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  logo: { width: 64, height: 64, borderRadius: 18, overflow: 'hidden', marginTop: -32, borderWidth: 3 },
  logoImg: { width: '100%', height: '100%' },
  navBar: { marginTop: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  navBarContent: { gap: 4 },
  navItem: { paddingVertical: 10, paddingHorizontal: 10 },
  headerInfo: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 20, lineHeight: 26 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 12, gap: 2 },
  section: { marginTop: 24, gap: 8 },
  sectionTitle: { marginBottom: 4 },
  paragraph: { lineHeight: 20 },
  hoursBlock: { marginTop: 8, gap: 4 },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between' },
  innerCard: { gap: 4 },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  flexShrink: { flexShrink: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  responseBox: { padding: 10, marginTop: 4, gap: 2 },
  infoGrid: { gap: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: '31%', aspectRatio: 1 },
});
