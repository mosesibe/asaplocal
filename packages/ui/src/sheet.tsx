"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "./utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const SIDE_CLASSES = {
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t pb-[calc(env(safe-area-inset-bottom)+1.25rem)] data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
  left: "inset-y-0 left-0 h-full w-[85vw] max-w-sm border-r pt-[calc(env(safe-area-inset-top)+1.25rem)] data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
} as const;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: keyof typeof SIDE_CLASSES }
>(({ className, children, side = "bottom", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 overflow-y-auto border-border bg-surface p-5 shadow-card transition-transform duration-200 focus:outline-none",
        SIDE_CLASSES[side],
        className
      )}
      {...props}
    >
      {side === "bottom" && <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />}
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1", className)} {...props} />;
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-5 flex flex-col gap-2", className)} {...props} />;
}
