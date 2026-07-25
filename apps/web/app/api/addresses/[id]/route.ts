import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { deleteUserAddress, updateUserAddress } from "@asaplocal/core";

const patchSchema = z.object({
  addressLine: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postcode: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await deleteUserAddress(session.user.id, id);
  return NextResponse.json({ deleted: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });

  await updateUserAddress(session.user.id, id, parsed.data);
  return NextResponse.json({ updated: true });
}
