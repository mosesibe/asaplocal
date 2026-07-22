/**
 * OpenAI-backed features. Every function degrades gracefully (returns a
 * safe fallback) if OPENAI_API_KEY isn't configured, so local dev and CI
 * never hard-fail on AI calls.
 */
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const MODEL = "gpt-4o-mini";

async function chatJSON<T>(system: string, user: string, fallback: T): Promise<T> {
  if (!openai) return fallback;
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = completion.choices[0]?.message?.content;
    return text ? (JSON.parse(text) as T) : fallback;
  } catch (err) {
    console.error("[ai] chatJSON failed", err);
    return fallback;
  }
}

/** Suggests a category for a raw customer job description ("my boiler is leaking" → Plumbers). */
export async function categoriseJobRequest(description: string, categories: { id: string; name: string }[]) {
  return chatJSON<{ categoryId: string | null; categoryName: string | null; confidence: number }>(
    `You classify home-service job requests into one of the given categories. Respond as JSON: {"categoryName": string, "confidence": number between 0 and 1}. Only choose from the provided category names, or null if none fit.`,
    `Categories: ${categories.map((c) => c.name).join(", ")}\n\nJob description: "${description}"`,
    { categoryId: null, categoryName: null, confidence: 0 }
  ).then((r) => {
    const match = categories.find((c) => c.name.toLowerCase() === r.categoryName?.toLowerCase());
    return { categoryId: match?.id ?? null, categoryName: match?.name ?? null, confidence: r.confidence };
  });
}

/** Drafts a quote message + suggested price band for a provider responding to a lead. */
export async function generateQuoteTemplate(opts: {
  businessName: string;
  serviceCategory: string;
  jobDescription: string;
  budgetMinPence?: number | null;
  budgetMaxPence?: number | null;
}) {
  return chatJSON<{ message: string; suggestedAmountPence: number | null }>(
    `You write concise, professional quote messages (under 120 words) for UK local-service tradespeople replying to a customer job request. Respond as JSON: {"message": string, "suggestedAmountPence": number|null}. Prices in GBP pence. Be specific about next steps (site visit, availability) but do not invent guarantees.`,
    `Business: ${opts.businessName}\nCategory: ${opts.serviceCategory}\nCustomer budget: ${
      opts.budgetMinPence ? `£${opts.budgetMinPence / 100}` : "?"
    }–${opts.budgetMaxPence ? `£${opts.budgetMaxPence / 100}` : "?"}\nJob: "${opts.jobDescription}"`,
    { message: "Thanks for your request — happy to help. Could you share a few more details or a good time for a quick call?", suggestedAmountPence: null }
  );
}

/** Turns a customer's freeform description into a category match + a clean, postable title/description. */
export async function suggestJobFromDescription(description: string, categories: { id: string; name: string }[]) {
  const fallbackTitle = description.trim().slice(0, 60);
  const result = await chatJSON<{ categoryName: string | null; title: string; description: string; confidence: number }>(
    `You help customers turn a rough description of a home-service job into a clear job post for local tradespeople. Respond as JSON: {"categoryName": string|null, "title": string, "description": string, "confidence": number between 0 and 1}. "categoryName" must be one of the given categories, or null if none fit. "title" must be 8-120 characters, a short clear summary. "description" must be 20-2000 characters, expanding on the customer's input with any obviously implied details, in plain professional language — do not invent specifics the customer didn't mention (materials, exact cause, etc).`,
    `Categories: ${categories.map((c) => c.name).join(", ")}\n\nCustomer's description: "${description}"`,
    { categoryName: null, title: fallbackTitle, description: description.trim(), confidence: 0 }
  );
  const match = categories.find((c) => c.name.toLowerCase() === result.categoryName?.toLowerCase());
  return {
    categoryId: match?.id ?? null,
    categoryName: match?.name ?? null,
    title: result.title || fallbackTitle,
    description: result.description || description.trim(),
    confidence: result.confidence,
  };
}

/** Flags reviews that look fake, coordinated, or abusive for human moderation. */
export async function moderateReview(comment: string, rating: number) {
  return chatJSON<{ flagged: boolean; reason: string | null; category: "SPAM" | "PROFANITY" | "COMPETITOR_ATTACK" | "FAKE" | "NONE" }>(
    `You moderate customer reviews on a local-services marketplace. Flag reviews that are spam, contain profanity/hate speech, look like a competitor attack, or seem fabricated (generic, incentivized, or bot-like). Respond as JSON: {"flagged": boolean, "reason": string|null, "category": "SPAM"|"PROFANITY"|"COMPETITOR_ATTACK"|"FAKE"|"NONE"}.`,
    `Rating: ${rating}/5\nReview: "${comment}"`,
    { flagged: false, reason: null, category: "NONE" }
  );
}

/** Suggests a reply for a provider working a new lead in the chat/lead inbox. */
export async function suggestLeadReply(opts: { jobDescription: string; customerMessage?: string; businessName: string }) {
  return chatJSON<{ reply: string }>(
    `You are a helpful assistant drafting a short, friendly first-response message (under 80 words) from a UK tradesperson to a prospective customer on a job lead. Ask 1-2 clarifying questions and propose next steps. Respond as JSON: {"reply": string}.`,
    `Business: ${opts.businessName}\nJob: "${opts.jobDescription}"\nCustomer's latest message: "${opts.customerMessage ?? "(none yet)"}"`,
    { reply: "Hi, thanks for reaching out! Could you share a bit more detail and your availability for a quick visit?" }
  ).then((r) => r.reply);
}
