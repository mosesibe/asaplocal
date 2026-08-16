"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { cn } from "./utils";

export interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

export type PushState = "unsupported" | "default" | "granted" | "denied" | "enabling";

export function NotificationBell({
  notifications,
  unreadCount,
  onItemClick,
  onMarkAllRead,
  pushState,
  onEnablePush,
  className,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  onItemClick: (notification: NotificationItem) => void;
  onMarkAllRead: () => void;
  pushState?: PushState;
  onEnablePush?: () => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <Bell size={19} />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />}
      </button>
      {open && (
        /*
         * z-50 so the panel clears the page chrome it drops over: MobileTopBar
         * is sticky z-30 and MobileBottomNav is fixed z-40, and the hosts that
         * mount this bell (e.g. ProviderTopBar) add no stacking context of
         * their own — at the panel's old z-30 the sticky sub-header simply won
         * on DOM order and painted over the first notification. Dialog/Sheet
         * are also z-50 but portal to the end of <body>, so modals still win
         * the tie and render above this.
         */
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] rounded-xl border border-border bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={onMarkAllRead} className="text-xs text-brand-600 hover:underline dark:text-brand-300">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onItemClick(n);
                }}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-border/60 px-3.5 py-2.5 text-left last:border-b-0 hover:bg-muted",
                  !n.isRead && "bg-brand-50/60 dark:bg-brand-950/20"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                  {n.title}
                </span>
                {n.body && <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>}
                <span className="text-[11px] text-muted-foreground/70">{formatRelativeTime(n.createdAt)}</span>
              </button>
            ))}
          </div>
          {pushState && pushState !== "unsupported" && pushState !== "granted" && onEnablePush && (
            <div className="border-t border-border p-2.5">
              <button
                type="button"
                onClick={onEnablePush}
                disabled={pushState === "enabling" || pushState === "denied"}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pushState === "enabling" ? "Enabling…" : pushState === "denied" ? "Push notifications blocked" : "Enable push notifications"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
