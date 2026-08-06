"use client";
import { Select } from "@asaplocal/ui";

export function AutoSubmitSelect(props: React.ComponentPropsWithoutRef<typeof Select>) {
  return <Select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
