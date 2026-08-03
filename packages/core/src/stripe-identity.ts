import { stripe } from "./stripe";

/**
 * Creates a Stripe-hosted identity verification session — front/back
 * document + selfie capture all happen on Stripe's side. We only ever
 * receive a verification outcome plus the limited `verified_outputs` we
 * request (name), never the raw document/selfie images.
 */
export async function createIdentityVerificationSession(businessId: string, returnUrl: string) {
  return stripe.identity.verificationSessions.create({
    type: "document",
    options: { document: { require_matching_selfie: true } },
    metadata: { businessId },
    return_url: returnUrl,
  });
}

export async function retrieveIdentityVerificationSession(id: string) {
  return stripe.identity.verificationSessions.retrieve(id, { expand: ["verified_outputs"] });
}
