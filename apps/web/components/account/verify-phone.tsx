"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { Badge, Button } from "@asaplocal/ui";
import { SectionRow } from "./section-row";
import { PhoneVerificationSheet } from "./phone-verification-sheet";

export function VerifyPhoneRow({ phone, verified }: { phone: string | null; verified: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <SectionRow
        icon={Phone}
        label="Phone number"
        description={phone ?? "No phone number on file"}
        right={
          verified ? (
            <Badge variant="success">Verified</Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              Verify phone
            </Button>
          )
        }
      />
      <PhoneVerificationSheet open={open} onOpenChange={setOpen} initialPhone={phone} onVerified={() => router.refresh()} />
    </>
  );
}
