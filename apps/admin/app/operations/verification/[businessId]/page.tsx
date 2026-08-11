import { notFound } from "next/navigation";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { DecisionActions } from "../decision-actions";
import { SuspendOwnerButton } from "./suspend-owner-button";

function statusVariant(status: string) {
  if (status === "VERIFIED") return "success" as const;
  if (status === "REJECTED") return "destructive" as const;
  if (status === "PENDING" || status === "MORE_INFO_REQUESTED") return "warning" as const;
  return "outline" as const;
}

export default async function BusinessVerificationDetailPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      owner: true,
      identityVerification: true,
      verificationDocuments: true,
      qualifications: { include: { category: true } },
      insurancePolicies: true,
      portfolioItems: true,
      references: true,
      services: { include: { category: true } },
    },
  });
  if (!business) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-sm text-muted-foreground">{business.owner.email} · Trust tier: {business.trustTier}</p>
        </div>
        <SuspendOwnerButton userId={business.ownerId} suspended={business.owner.status === "SUSPENDED"} />
      </div>

      <div className="mt-6 space-y-4">
        {/* Identity */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Identity</h2>
            <Badge variant={statusVariant(business.identityVerification?.status ?? "UNVERIFIED")}>{business.identityVerification?.status ?? "NOT STARTED"}</Badge>
          </div>
          {business.identityVerification && (
            <>
              {business.identityVerification.docType && <p className="mt-1 text-sm text-muted-foreground">Document: {business.identityVerification.docType}</p>}
              {business.identityVerification.extractedFullName && <p className="text-sm text-muted-foreground">Verified name: {business.identityVerification.extractedFullName}</p>}
              {business.identityVerification.lastError && <p className="text-sm text-red-600">Last error: {business.identityVerification.lastError}</p>}
              {["PENDING", "MORE_INFO_REQUESTED"].includes(business.identityVerification.status) && (
                <DecisionActions endpoint={`/api/verification/identity/${business.identityVerification.id}/decide`} />
              )}
            </>
          )}
        </Card>

        {/* Business */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Business</h2>
            <Badge variant={statusVariant(business.verificationStatus)}>{business.verificationStatus}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{business.businessType ?? "Not set"}</p>
          {business.businessType === "LIMITED_COMPANY" ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>Company number: {business.companyRegistrationNumber ?? "—"}</p>
              <p>Director (self-reported): {business.companyDirectorName ?? "—"}</p>
              {business.companiesHouseCheckedAt && (
                <p className="text-muted-foreground">
                  Companies House checked {business.companiesHouseCheckedAt.toLocaleString("en-GB")} — director match: {business.companiesHouseDirectorMatch ? "yes" : "no"}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-1 text-sm">
              <p className="text-muted-foreground">Proof of trading documents:</p>
              {business.verificationDocuments.length === 0 && <p className="text-muted-foreground">None uploaded yet.</p>}
              {business.verificationDocuments.map((d) => (
                <a key={d.id} href={d.fileUrl} target="_blank" rel="noreferrer" className="block text-brand-700 hover:underline">
                  {d.docType.replace(/_/g, " ")}
                </a>
              ))}
            </div>
          )}
          {["PENDING", "MORE_INFO_REQUESTED"].includes(business.verificationStatus) && (
            <DecisionActions endpoint={`/api/verification/business/${business.id}/decide`} />
          )}
        </Card>

        {/* Insurance */}
        <Card className="p-4">
          <h2 className="font-semibold">Insurance</h2>
          {business.insurancePolicies.length === 0 && <p className="mt-1 text-sm text-muted-foreground">No policies submitted.</p>}
          <div className="mt-2 space-y-3">
            {business.insurancePolicies.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{p.type.replace(/_/g, " ")}</p>
                  <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.provider} · Policy {p.policyNumber} · Expires {p.expiryDate.toLocaleDateString("en-GB")}</p>
                <a href={p.documentUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">View document</a>
                {["PENDING", "MORE_INFO_REQUESTED"].includes(p.status) && <DecisionActions endpoint={`/api/verification/insurance/${p.id}/decide`} />}
              </div>
            ))}
          </div>
        </Card>

        {/* Qualifications */}
        <Card className="p-4">
          <h2 className="font-semibold">Qualifications</h2>
          {business.qualifications.length === 0 && <p className="mt-1 text-sm text-muted-foreground">None submitted.</p>}
          <div className="mt-2 space-y-3">
            {business.qualifications.map((q) => (
              <div key={q.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{q.name}{q.category ? ` — ${q.category.name}` : ""}</p>
                  <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
                </div>
                {q.issuingBody && <p className="mt-1 text-sm text-muted-foreground">{q.issuingBody}</p>}
                {q.documentUrl && <a href={q.documentUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline">View document</a>}
                {["PENDING", "MORE_INFO_REQUESTED"].includes(q.status) && <DecisionActions endpoint={`/api/verification/qualification/${q.id}/decide`} />}
              </div>
            ))}
          </div>
        </Card>

        {/* Display-only completeness indicators */}
        <Card className="p-4">
          <h2 className="font-semibold">Bank</h2>
          <Badge variant={business.payoutsEnabled ? "success" : "outline"} className="mt-1">{business.payoutsEnabled ? "Connected" : "Not connected"}</Badge>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Profile</h2>
          <Badge variant={business.profileCompletedAt ? "success" : "outline"} className="mt-1">{business.profileCompletedAt ? "Complete" : "Incomplete"}</Badge>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Portfolio</h2>
          <Badge variant={business.portfolioItems.length > 0 ? "success" : "outline"} className="mt-1">{business.portfolioItems.length} item(s)</Badge>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Services</h2>
            <Badge variant={business.services.some((s) => s.isActive) ? "success" : "destructive"}>
              {business.services.filter((s) => s.isActive).length} active
            </Badge>
          </div>
          {business.services.length === 0 ? (
            <p className="mt-1 text-sm text-red-600">No services added — this business will not appear in customer search.</p>
          ) : !business.services.some((s) => s.isActive) ? (
            <p className="mt-1 text-sm text-red-600">All services are paused — this business will not appear in customer search.</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {business.services.map((s) => (
              <Badge key={s.id} variant={s.isActive ? "outline" : "destructive"}>
                {s.category.name}{!s.isActive && " (paused)"}
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
