"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, Input, Select, Textarea } from "@asaplocal/ui";

// Lets an anonymous visitor fill in the whole form before we make them sign
// up: the values are cached here on submit, the signed-out user is bounced
// to /register, and once they're back with a session job-request-form
// replays this exact (already-validated) payload instead of losing it.
const PENDING_JOB_KEY = "asaplocal:pendingJobPost";
type PendingJob = { values: FormValues; targetBusinessId?: string };

const formSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  title: z.string().min(8, "Give a short summary (8+ characters)"),
  description: z.string().min(20, "A few more details would help providers quote accurately (20+ characters)"),
  budgetMinPence: z.coerce.number().int().nonnegative().optional(),
  budgetMaxPence: z.coerce.number().int().nonnegative().optional(),
  preferredDate: z.string().optional(),
  city: z.string().min(2, "City is required"),
  postcode: z.string().optional(),
  addressLine: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function JobRequestForm({
  categories,
  targetBusinessId,
  defaultCategorySlug,
}: {
  categories: { id: string; name: string }[];
  targetBusinessId?: string;
  defaultCategorySlug?: string;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function postJob(values: FormValues, businessId?: string) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          budgetMinPence: values.budgetMinPence ? values.budgetMinPence * 100 : undefined,
          budgetMaxPence: values.budgetMaxPence ? values.budgetMaxPence * 100 : undefined,
          targetBusinessId: businessId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Something went wrong — please try again.");
      }
      const data = await res.json();
      router.push(`/jobs/${data.id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
      setResuming(false);
    }
  }

  // Resume a job post that was cached before a sign-up detour: once a
  // session exists, replay it automatically instead of leaving the visitor
  // to re-type everything.
  useEffect(() => {
    if (status !== "authenticated") return;
    const raw = sessionStorage.getItem(PENDING_JOB_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_JOB_KEY);
    try {
      const pending: PendingJob = JSON.parse(raw);
      reset(pending.values);
      setResuming(true);
      void postJob(pending.values, pending.targetBusinessId ?? targetBusinessId);
    } catch {
      // ignore malformed cache
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function onSubmit(values: FormValues) {
    if (status !== "authenticated") {
      sessionStorage.setItem(PENDING_JOB_KEY, JSON.stringify({ values, targetBusinessId } satisfies PendingJob));
      router.push(`/register?next=${encodeURIComponent("/jobs/new")}&reason=post-job`);
      return;
    }
    await postJob(values, targetBusinessId);
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="text-sm font-medium">Category</label>
          <Select {...register("categoryId")} defaultValue={categories.find((c) => c.name.toLowerCase().startsWith(defaultCategorySlug?.split("-")[0] ?? ""))?.id} className="mt-1">
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Job title</label>
          <Input {...register("title")} placeholder="e.g. Fix leaking kitchen tap" className="mt-1" />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea {...register("description")} rows={5} placeholder="What needs doing? Include any relevant details (access, materials, timing)." className="mt-1" />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Budget min (£)</label>
            <Input type="number" {...register("budgetMinPence")} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Budget max (£)</label>
            <Input type="number" {...register("budgetMaxPence")} className="mt-1" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Preferred date (optional)</label>
          <Input type="date" {...register("preferredDate")} className="mt-1" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">City</label>
            <Input {...register("city")} placeholder="Manchester" className="mt-1" />
            {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Postcode (optional)</label>
            <Input {...register("postcode")} className="mt-1" />
          </div>
        </div>

        {resuming && !serverError && (
          <p className="text-sm text-brand-700">Welcome back — finishing your job post…</p>
        )}
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Posting…" : targetBusinessId ? "Send request" : "Post job & get quotes"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {status === "authenticated"
            ? "Posting is free. Providers pay to access your request — you'll never be charged for quotes."
            : "Posting is free. We'll ask you to create a quick account before your job goes live."}
        </p>
      </form>
    </Card>
  );
}
