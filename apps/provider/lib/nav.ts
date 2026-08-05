import { LayoutDashboard, Target, CalendarDays, MessageSquare, CreditCard, Store, BarChart3, Star, ShieldCheck } from "lucide-react";

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
