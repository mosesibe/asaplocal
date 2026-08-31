import { Slot } from 'expo-router';

// Navigation chrome (header + floating bottom nav) moved to the root layout
// as global, always-present elements (matching web's layout.tsx, where
// SiteHeader/BottomNav render on every page) — this group is now just a
// folder for route organisation, not a real tab navigator. Kept as a
// (tabs) group rather than moving the four files to the top level so their
// route paths (/, /activity, /search, /account) don't change.
export default function TabsGroupLayout() {
  return <Slot />;
}
