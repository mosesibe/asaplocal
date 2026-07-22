import { z } from "zod";

export const jobRequestSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(8).max(120),
  description: z.string().min(20).max(2000),
  photos: z.array(z.string().url()).max(10).default([]),
  budgetMinPence: z.number().int().positive().optional(),
  budgetMaxPence: z.number().int().positive().optional(),
  preferredDate: z.coerce.date().optional(),
  flexibleDate: z.boolean().default(true),
  addressLine: z.string().max(200).optional(),
  city: z.string().min(2).max(80),
  postcode: z.string().max(12).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
}).refine((d) => !d.budgetMinPence || !d.budgetMaxPence || d.budgetMinPence <= d.budgetMaxPence, {
  message: "budgetMinPence must be <= budgetMaxPence",
  path: ["budgetMaxPence"],
});

export const quoteSchema = z.object({
  jobRequestId: z.string().uuid(),
  amountPence: z.number().int().positive().max(10_000_000),
  message: z.string().max(2000).optional(),
  validUntil: z.coerce.date().optional(),
});

export const bookingSchema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  jobRequestId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  scheduledDate: z.coerce.date(),
  totalAmountPence: z.number().int().positive(),
  depositAmountPence: z.number().int().nonnegative().optional(),
  addressLine: z.string().min(4).max(200),
  city: z.string().min(2).max(80),
  postcode: z.string().max(12).optional(),
  notes: z.string().max(1000).optional(),
});

export const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(6).default([]),
});

export const refundRequestSchema = z.object({
  leadAccessId: z.string().uuid(),
  reason: z.enum(["OUT_OF_SERVICE_AREA", "DUPLICATE_LEAD", "SPAM_OR_FAKE", "UNRESPONSIVE_CUSTOMER", "WRONG_CATEGORY", "OTHER"]),
  details: z.string().max(1000).optional(),
});

export const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(4000),
  attachments: z.array(z.string().url()).max(5).default([]),
});

export const dispatcherJobActionSchema = z.object({
  jobRequestId: z.string().uuid(),
  actionType: z.enum(["JOB_UPDATE", "JOB_DELETE", "JOB_ASSIGN_PROVIDER", "JOB_STATUS_OVERRIDE"]),
  payload: z.record(z.unknown()),
});

// Sanitizes free text against basic XSS vectors before persisting; pair with
// output-encoding on render (React escapes by default) — this is defence in
// depth for any HTML-rendering surfaces (emails, PDFs).
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>?/gm, "").trim();
}
