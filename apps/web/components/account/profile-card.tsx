import { Badge, Card, formatPence } from "@asaplocal/ui";
import { AvatarUpload } from "./avatar-upload";

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  PENDING_VERIFICATION: { label: "Pending verification", variant: "warning" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
  DEACTIVATED: { label: "Deactivated", variant: "outline" },
};

export function ProfileCard({
  name,
  avatarUrl,
  contact,
  status,
  memberSince,
  totalSpentPence,
  servicesRequested,
}: {
  name: string;
  avatarUrl?: string | null;
  contact: string;
  status: string;
  memberSince: Date;
  totalSpentPence: number;
  servicesRequested: number;
}) {
  const statusInfo = STATUS_LABEL[status] ?? { label: status, variant: "outline" as const };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AvatarUpload avatarUrl={avatarUrl} name={name} size={56} />
          <div>
            <p className="text-lg font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{contact}</p>
          </div>
        </div>
        <Badge variant={statusInfo.variant} className="shrink-0">{statusInfo.label}</Badge>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
        <div>
          <p className="text-base font-semibold">{formatPence(totalSpentPence)}</p>
          <p className="text-xs text-muted-foreground">Total spent</p>
        </div>
        <div>
          <p className="text-base font-semibold">
            {memberSince.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
          </p>
          <p className="text-xs text-muted-foreground">Member since</p>
        </div>
        <div>
          <p className="text-base font-semibold">{servicesRequested}</p>
          <p className="text-xs text-muted-foreground">Services requested</p>
        </div>
      </div>
    </Card>
  );
}
