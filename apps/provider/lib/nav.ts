import { LayoutDashboard, UserCog, Target, CalendarDays, MessageSquare, CreditCard, Store, BarChart3, Star, ShieldCheck, Settings, HelpCircle, SlidersHorizontal, Users, Wrench, Package, Gift, Wallet, Receipt, Coins } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Settings;
  children?: NavItem[];
}

const HOME: NavItem = { href: "/dashboard", label: "Home", icon: LayoutDashboard };
const ACCOUNT: NavItem = { href: "/account", label: "Account", icon: UserCog };

/** The four destinations in the bottom bar on small screens — keep it to four. */
export const PRIMARY_NAV: NavItem[] = [
  HOME,
  { href: "/leads", label: "Lead marketplace", icon: Target },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  {
    href: "/earnings",
    label: "Earnings",
    icon: Wallet,
    children: [
      { href: "/earnings", label: "Overview", icon: Wallet },
      { href: "/earnings/invoices", label: "Invoices & payouts", icon: Receipt },
      { href: "/earnings/subscription", label: "Subscription", icon: CreditCard },
      { href: "/earnings/credits", label: "Lead credits", icon: Coins },
    ],
  },
  { href: "/referrals", label: "Referrals", icon: Gift },
  { href: "/profile", label: "Business profile", icon: Store },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/supplies", label: "Supplies", icon: Package },
  { href: "/staff", label: "Staff", icon: Users },
  { href: "/verification", label: "Verification Center", icon: ShieldCheck },
];

export type DrawerPanelId = "help-center" | "preferences";

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
      { href: "/account", label: "Account settings", icon: Settings },
      { id: "help-center", label: "Help center", subtitle: "FAQ", icon: HelpCircle },
      { id: "preferences", label: "Preferences", subtitle: "Contents", icon: SlidersHorizontal },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/profile", label: "Profile", icon: Store },
      { href: "/services", label: "Services", icon: Wrench },
      { href: "/supplies", label: "Supplies", icon: Package },
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/verification", label: "Verification Center", icon: ShieldCheck },
      { href: "/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    title: "Earnings",
    items: [
      { href: "/earnings", label: "Earnings overview", icon: Wallet },
      { href: "/earnings/invoices", label: "Invoices & payouts", icon: Receipt },
      { href: "/earnings/subscription", label: "Subscription", icon: CreditCard },
      { href: "/earnings/credits", label: "Lead credits", icon: Coins },
      { href: "/referrals", label: "Referrals", icon: Gift },
    ],
  },
  {
    title: "Analytics",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }],
  },
];

/**
 * The sidebar's own order: Account sits directly under Home. Deliberately not
 * folded into PRIMARY_NAV, which the bottom bar renders in full — a fifth item
 * there would crowd it on a phone.
 */
export const SIDEBAR_NAV: NavItem[] = [HOME, ACCOUNT, ...PRIMARY_NAV.slice(1), ...SECONDARY_NAV];

/** Flattened for title lookup — children need to resolve too. */
export const ALL_NAV_ITEMS: NavItem[] = SIDEBAR_NAV.flatMap((i) => [i, ...(i.children ?? [])]);
