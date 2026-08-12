import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackToVerificationCenter() {
  return (
    <Link href="/verification" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft size={16} />
      Verification Center
    </Link>
  );
}
