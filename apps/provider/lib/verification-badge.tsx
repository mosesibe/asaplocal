import { Badge } from "@asaplocal/ui";

export function VerificationStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status || status === "UNVERIFIED") return <Badge variant="outline">Not verified</Badge>;
  if (status === "VERIFIED") return <Badge variant="success">Verified</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  if (status === "PENDING") return <Badge variant="warning">Pending review</Badge>;
  if (status === "MORE_INFO_REQUESTED") return <Badge variant="warning">More info needed</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
