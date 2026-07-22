import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { jobRequestSchema, createJobRequestWithLead, checkRateLimit, geocodeAddress, stripHtml, categoriseJobRequest } from "@asaplocal/core";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ message: "Please sign in as a customer to post a job." }, { status: 401 });
  }

  try {
    await checkRateLimit("job-post", session.user.id, 5, 300); // 5 job posts per 5 minutes
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });

  let lat: number, lng: number;
  if (typeof body.lat === "number" && typeof body.lng === "number") {
    lat = body.lat;
    lng = body.lng;
  } else {
    const geo = await geocodeAddress(`${body.addressLine ?? ""} ${body.postcode ?? ""} ${body.city}, UK`).catch(() => null);
    if (!geo) return NextResponse.json({ message: "Couldn't locate that address — please check the city/postcode." }, { status: 400 });
    lat = geo.lat;
    lng = geo.lng;
  }

  const parsed = jobRequestSchema.safeParse({ ...body, lat, lng, description: stripHtml(body.description ?? ""), title: stripHtml(body.title ?? "") });
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check the form for errors.", issues: parsed.error.flatten() }, { status: 422 });
  }

  // AI auto-categorisation as a sanity check / fallback if the customer's chosen category looks off
  const categories = await prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const aiSuggestion = await categoriseJobRequest(parsed.data.description, categories).catch(() => null);

  const jobRequest = await createJobRequestWithLead({ ...parsed.data, customerId: session.user.id });

  if (aiSuggestion?.categoryId) {
    await prisma.jobRequest.update({
      where: { id: jobRequest.id },
      data: { aiSuggestedCategoryId: aiSuggestion.categoryId, aiCategoryConfidence: aiSuggestion.confidence },
    });
  }

  // Direct-to-provider request: grant that business free claimed access so they see it immediately.
  const targetBusinessId = typeof body.targetBusinessId === "string" ? body.targetBusinessId : undefined;
  if (targetBusinessId && jobRequest.lead) {
    await prisma.leadAccess
      .create({ data: { leadId: jobRequest.lead.id, businessId: targetBusinessId, acquisitionType: "CLAIM", pricePaidPence: 0 } })
      .catch(() => {}); // ignore if already exists
  }

  return NextResponse.json({ id: jobRequest.id }, { status: 201 });
}
