import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { jobRequestEditSchema, checkRateLimit, geocodeAddress, stripHtml, writeAuditLog } from "@asaplocal/core";

const EDITABLE_STATUSES = ["OPEN", "MATCHING", "QUOTED"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const job = await prisma.jobRequest.findUnique({ where: { id } });
  if (!job || job.customerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!(EDITABLE_STATUSES as readonly string[]).includes(job.status)) {
    return NextResponse.json({ message: "This job can no longer be edited" }, { status: 409 });
  }

  try {
    await checkRateLimit("job-edit", session.user.id, 10, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });

  let lat = body.lat;
  let lng = body.lng;
  if ((body.addressLine || body.city || body.postcode) && typeof lat !== "number" && typeof lng !== "number") {
    const geo = await geocodeAddress(`${body.addressLine ?? ""} ${body.postcode ?? ""} ${body.city ?? job.city}, UK`).catch(() => null);
    if (!geo) return NextResponse.json({ message: "Couldn't locate that address — please check the city/postcode." }, { status: 400 });
    lat = geo.lat;
    lng = geo.lng;
  }

  const parsed = jobRequestEditSchema.safeParse({
    ...body,
    ...(typeof lat === "number" ? { lat } : {}),
    ...(typeof lng === "number" ? { lng } : {}),
    ...(typeof body.description === "string" ? { description: stripHtml(body.description) } : {}),
    ...(typeof body.title === "string" ? { title: stripHtml(body.title) } : {}),
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check the form for errors.", issues: parsed.error.flatten() }, { status: 422 });
  }

  await prisma.jobRequest.update({ where: { id }, data: parsed.data });
  await writeAuditLog({ actorId: session.user.id, actorRole: session.user.role, action: "job.edit", targetType: "JobRequest", targetId: id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const job = await prisma.jobRequest.findUnique({ where: { id } });
  if (!job || job.customerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!(EDITABLE_STATUSES as readonly string[]).includes(job.status)) {
    return NextResponse.json({ message: "This job can no longer be deleted" }, { status: 409 });
  }

  try {
    await checkRateLimit("job-delete", session.user.id, 10, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  await prisma.$transaction([
    prisma.jobRequest.update({ where: { id }, data: { status: "CANCELLED" } }),
    prisma.lead.updateMany({ where: { jobRequestId: id }, data: { status: "CLOSED" } }),
    prisma.quote.updateMany({ where: { jobRequestId: id, status: { in: ["PENDING", "SENT"] } }, data: { status: "DECLINED" } }),
  ]);

  await writeAuditLog({ actorId: session.user.id, actorRole: session.user.role, action: "job.delete", targetType: "JobRequest", targetId: id });

  return NextResponse.json({ ok: true });
}
