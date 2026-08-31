import { Slot } from 'expo-router';

// Navigation chrome (ProviderTopBar + FloatingBottomNav) moved to the root
// layout as global, always-present elements (matching apps/provider's
// ProviderShell, which wraps every authenticated route the same way) — this
// group is now just a folder for route organisation, not a real tab
// navigator.
export default function TabsGroupLayout() {
  return <Slot />;
}
