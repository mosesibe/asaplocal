import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { EditJobForm } from "./edit-job-form";
import type { LocationValue } from "@/components/location-picker";
import type { PreferredDateValue } from "@/components/preferred-date-picker";

const EDITABLE_STATUSES = ["OPEN", "MATCHING", "QUOTED"];

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/jobs/${id}/edit`);

  const [job, categories] = await Promise.all([
    prisma.jobRequest.findUnique({ where: { id } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!job || job.customerId !== session.user.id) notFound();
  if (!EDITABLE_STATUSES.includes(job.status)) redirect(`/jobs/${id}`);

  const defaultLocation: LocationValue = {
    addressLine: job.addressLine ?? "",
    city: job.city,
    postcode: job.postcode ?? undefined,
    lat: Number(job.lat),
    lng: Number(job.lng),
    source: "saved",
  };

  const defaultPreferredDate: PreferredDateValue | null =
    job.preferredDate && !job.flexibleDate
      ? {
          date: job.preferredDate.toISOString().slice(0, 10),
          time: job.preferredDate.toISOString().slice(11, 16),
        }
      : job.preferredDate
        ? { date: job.preferredDate.toISOString().slice(0, 10), time: null }
        : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Edit job</h1>
      <p className="mt-2 text-muted-foreground">You can edit this job until a provider is booked.</p>
      <div className="mt-8">
        <EditJobForm
          jobId={job.id}
          categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId }))}
          defaults={{
            categoryId: job.categoryId,
            title: job.title,
            description: job.description,
            budgetMinPence: job.budgetMinPence ? job.budgetMinPence / 100 : undefined,
            budgetMaxPence: job.budgetMaxPence ? job.budgetMaxPence / 100 : undefined,
          }}
          defaultLocation={defaultLocation}
          defaultPreferredDate={defaultPreferredDate}
        />
      </div>
    </div>
  );
}
