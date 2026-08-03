import { prisma } from "@asaplocal/db";
import { Card } from "@asaplocal/ui";
import { ReferenceVerifyForm } from "./reference-verify-form";

export default async function ReferenceVerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reference = await prisma.businessReference.findUnique({ where: { verificationToken: token }, include: { business: true } });

  if (!reference) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
        <Card className="p-6">
          <h1 className="text-xl font-bold">Link no longer valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">This reference link is invalid or has already been used.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <Card className="p-6">
        <h1 className="text-xl font-bold">Confirm reference for {reference.business.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {reference.business.name} listed you, {reference.refereeName}, as someone who can vouch for their work.
        </p>
        <ReferenceVerifyForm token={token} alreadyVerified={reference.status === "VERIFIED"} />
      </Card>
    </div>
  );
}
