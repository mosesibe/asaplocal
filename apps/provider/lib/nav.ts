import { LayoutDashboard, Target, CalendarDays, MessageSquare, CreditCard, Store, BarChart3, Star, ShieldCheck, Settings, HelpCircle, SlidersHorizontal } from "lucide-react";

export const PRIMARY_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/leads", label: "Lead marketplace", icon: Target },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

export const SECONDARY_NAV = [
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/billing", label: "Billing & credits", icon: CreditCard },
  { href: "/profile", label: "Business profile", icon: Store },
  { href: "/verification", label: "Verification Center", icon: ShieldCheck },
];

export type DrawerPanelId = "account-settings" | "help-center" | "preferences";

interface DrawerLinkItem {
  href: string;
  label: string;
  icon: typeof Settings;
}

interface DrawerPanelItem {
  id: DrawerPanelId;
  label: string;
  subtitle?: string;
  icon: typeof Settings;
}

export const ACCOUNT_DRAWER_SECTIONS: { title: string; items: (DrawerLinkItem | DrawerPanelItem)[] }[] = [
  {
    title: "Account",
    items: [
      { id: "account-settings", label: "Account settings", icon: Settings },
      { id: "help-center", label: "Help center", subtitle: "FAQ", icon: HelpCircle },
      { id: "preferences", label: "Preferences", subtitle: "Contents", icon: SlidersHorizontal },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/profile", label: "Business profile", icon: Store },
      { href: "/verification", label: "Verification Center", icon: ShieldCheck },
      { href: "/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    title: "Earnings",
    items: [{ href: "/billing", label: "Billing & credits", icon: CreditCard }],
  },
  {
    title: "Analytics",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }],
  },
];
