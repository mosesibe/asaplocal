import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@asaplocal/db";
import { checkRateLimit, suggestJobFromDescription } from "@asaplocal/core";

const schema = z.object({
  description: z.string().trim().min(10, "Tell us a bit more so we can find the right pro.").max(1000),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("job-suggest", ip, 10, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const categories = await prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true } });
  const suggestion = await suggestJobFromDescription(parsed.data.description, categories);
  const category = categories.find((c) => c.id === suggestion.categoryId);

  return NextResponse.json({
    categoryId: suggestion.categoryId,
    categorySlug: category?.slug ?? null,
    categoryName: suggestion.categoryName,
    title: suggestion.title,
    description: suggestion.description,
    confidence: suggestion.confidence,
  });
}
