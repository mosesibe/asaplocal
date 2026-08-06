"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, Input, Select, Textarea } from "@asaplocal/ui";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { PreferredDatePicker, toPreferredDateTime, type PreferredDateValue } from "@/components/preferred-date-picker";

const formSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  title: z.string().min(8, "Give a short summary (8+ characters)"),
  description: z.string().min(20, "A few more details would help providers quote accurately (20+ characters)"),
  budgetMinPence: z.coerce.number().int().nonnegative().optional(),
  budgetMaxPence: z.coerce.number().int().nonnegative().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  jobId: string;
  categories: { id: string; name: string; slug: string; parentId: string | null }[];
  defaults: FormValues;
  defaultLocation: LocationValue;
  defaultPreferredDate: PreferredDateValue | null;
}

export function EditJobForm({ jobId, categories, defaults, defaultLocation, defaultPreferredDate }: Props) {
  const parentCategories = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, typeof categories>();
  for (const c of categories) {
    if (!c.parentId) continue;
    childrenByParent.set(c.parentId, [...(childrenByParent.get(c.parentId) ?? []), c]);
  }
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationValue | null>(defaultLocation);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState<PreferredDateValue | null>(defaultPreferredDate);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });

  async function onSubmit(values: FormValues) {
    if (!location) {
      setLocationError("Please choose a service location");
      return;
    }
    setLocationError(null);
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: values.categoryId,
          title: values.title,
          description: values.description,
          preferredDate: preferredDate ? toPreferredDateTime(preferredDate) : undefined,
          flexibleDate: preferredDate ? preferredDate.time === null : true,
          budgetMinPence: values.budgetMinPence ? values.budgetMinPence * 100 : undefined,
          budgetMaxPence: values.budgetMaxPence ? values.budgetMaxPence * 100 : undefined,
          addressLine: location.addressLine,
          city: location.city,
          postcode: location.postcode,
          lat: location.lat,
          lng: location.lng,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Something went wrong — please try again.");
      }
      router.push(`/jobs/${jobId}`);
      router.refresh();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="text-sm font-medium">Category</label>
          <Select {...register("categoryId")} defaultValue={defaults.categoryId} className="mt-1">
            <option value="">Select a category</option>
            {parentCategories.map((p) => (
              <optgroup key={p.id} label={p.name}>
                <option value={p.id}>{p.name} (general)</option>
                {(childrenByParent.get(p.id) ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
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
          <label className="text-sm font-medium">Preferred date & arrival time (optional)</label>
          <div className="mt-1">
            <PreferredDatePicker value={preferredDate} onChange={setPreferredDate} location={location} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Service location</label>
          <div className="mt-1">
            <LocationPicker value={location} onChange={setLocation} />
          </div>
          {locationError && <p className="mt-1 text-xs text-red-600">{locationError}</p>}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}
