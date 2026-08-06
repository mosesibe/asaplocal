"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  bookingId: string;
  assignedStaffId: string | null;
  staffOptions: { id: string; fullName: string; jobTitle: string | null }[];
}

export function AssignStaffSelect({ bookingId, assignedStaffId, staffOptions }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const staffMemberId = e.target.value || null;
    setLoading(true);
    await fetch(`/api/bookings/${bookingId}/assign-staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffMemberId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      defaultValue={assignedStaffId ?? ""}
      onChange={onChange}
      disabled={loading}
      className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
    >
      <option value="">Unassigned</option>
      {staffOptions.map((s) => (
        <option key={s.id} value={s.id}>
          {s.fullName}{s.jobTitle ? ` — ${s.jobTitle}` : ""}
        </option>
      ))}
    </select>
  );
}
