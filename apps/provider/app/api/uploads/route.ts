import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { createPresignedUpload } from "@asaplocal/core";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { purpose, contentType } = await req.json();
  try {
    const result = await createPresignedUpload({ purpose, contentType, ownerId: session.user.id });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
}
