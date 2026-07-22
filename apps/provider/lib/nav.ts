import { LayoutDashboard, Target, CalendarDays, MessageSquare, CreditCard, Store, BarChart3, Star } from "lucide-react";

export const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Lead marketplace", icon: Target },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

export const SECONDARY_NAV = [
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/billing", label: "Billing & credits", icon: CreditCard },
  { href: "/profile", label: "Business profile", icon: Store },
];
