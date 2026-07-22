import Link from "next/link";
import Image from "next/image";
import { Badge, Card, StarRating, formatPence } from "@asaplocal/ui";
import { BadgeCheck } from "lucide-react";

export interface ProviderCardData {
  slug: string;
  name: string;
  logoUrl: string | null;
  city: string;
  avgRating: number;
  reviewCount: number;
  completedJobsCount: number;
  isFeatured: boolean;
  verificationStatus: string;
  fromPricePence?: number | null;
  categoryName?: string;
}

export function ProviderCard({ p }: { p: ProviderCardData }) {
  return (
    <Link href={`/providers/${p.slug}`}>
      <Card className="flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-lg">
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {p.logoUrl && <Image src={p.logoUrl} alt={p.name} fill className="object-cover" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-semibold">{p.name}</h3>
              {p.verificationStatus === "VERIFIED" && <BadgeCheck size={16} className="shrink-0 text-brand-600" />}
            </div>
            <p className="text-sm text-muted-foreground">{p.categoryName ?? ""} · {p.city}</p>
          </div>
          {p.isFeatured && <Badge variant="warning" className="ml-auto shrink-0">Featured</Badge>}
        </div>
        <StarRating rating={p.avgRating} count={p.reviewCount} />
        <div className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>{p.completedJobsCount} jobs completed</span>
          {p.fromPricePence && <span className="font-medium text-foreground">from {formatPence(p.fromPricePence)}</span>}
        </div>
      </Card>
    </Link>
  );
}
