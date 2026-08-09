/**
 * DeepSeek-backed features (OpenAI-compatible API). Every function degrades
 * gracefully (returns a safe fallback) if DEEPSEEK_API_KEY isn't configured,
 * so local dev and CI never hard-fail on AI calls.
 */
import OpenAI from "openai";

const openai = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" })
  : null;
const MODEL = "deepseek-chat";

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

/** Like chatJSON, but carries a full multi-turn conversation instead of a single user message. */
async function chatJSONMultiTurn<T>(system: string, messages: { role: "user" | "assistant"; content: string }[], fallback: T): Promise<T> {
  if (!openai) return fallback;
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, ...messages],
    });
    const text = completion.choices[0]?.message?.content;
    return text ? (JSON.parse(text) as T) : fallback;
  } catch (err) {
    console.error("[ai] chatJSONMultiTurn failed", err);
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

/**
 * Estimates how long a service typically takes on site, shown to providers as
 * guidance on their services page. Returns null rather than a guess when AI
 * isn't configured, so the UI can simply omit the hint.
 */
export async function suggestServiceDuration(serviceTitle: string, categoryName: string) {
  return chatJSON<{ durationMins: number | null }>(
    `You estimate how long a UK home-service job typically takes on site, for a single average job. Respond as JSON: {"durationMins": number}. Give one realistic figure in minutes between 15 and 1440. Do not explain.`,
    `Category: ${categoryName}\nService: "${serviceTitle}"`,
    { durationMins: null }
  ).then((r) => {
    if (typeof r.durationMins !== "number" || !Number.isFinite(r.durationMins)) return { durationMins: null };
    return { durationMins: Math.min(1440, Math.max(15, Math.round(r.durationMins))) };
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

const AI_BUDDY_SYSTEM_PROMPT = `You are "AI Buddy", a friendly, safety-conscious DIY assistant for a UK home-services marketplace. A customer describes a problem with their home; your job is to figure out whether it's safe for an ordinary homeowner to fix themselves, and if so, help them do it.

Rules:
- If the problem involves gas (boilers, gas appliances, gas smells), mains/high-voltage electrical work (rewiring, consumer units, anything not a simple like-for-like socket/bulb swap), structural work, roofing, working at height, or anything else a UK homeowner legally or safely should not attempt themselves — set needsPro=true, do NOT give a step-by-step plan, and explain briefly why it needs a licensed professional (e.g. Gas Safe engineer for gas work).
- Otherwise, if it's a genuinely simple, safe DIY task (unblocking a drain, tightening a fitting, minor touch-ups, assembling furniture, etc.), set needsPro=false and give a short, clear plan.
- Keep "reply" conversational and warm, 1-3 sentences — the toolkit/steps (when present) carry the detail, don't repeat them in reply.
- Only populate "toolkit" and "steps" on a message where you're actually giving a concrete plan (typically your first substantive reply on a solvable problem). On follow-up messages (answering a clarifying question, confirming something worked), leave them null unless you're revising the plan.
- If the customer's message doesn't have enough detail to assess safely, ask one clarifying question (needsPro=false, toolkit/steps null).
- Never invent specifics the customer didn't mention.

Respond as JSON: {"reply": string, "needsPro": boolean, "toolkit": string[]|null, "steps": string[]|null}.`;

const AI_BUDDY_FALLBACK = { reply: "Something went wrong — please try again in a moment.", needsPro: false, toolkit: null, steps: null };

export interface AiBuddyMessage {
  role: "user" | "assistant";
  content: string;
}

/** Multi-turn DIY-vs-needs-a-pro triage chat for the customer homepage. */
/** The model often prefixes steps ("1. Do this"), but every surface renders
 *  them in an ordered list — strip its numbering so it isn't doubled up. */
function stripLeadingNumber(step: string): string {
  return step.replace(/^\s*\d+\s*[.)\]]\s*/, "").trim();
}

export async function askAiBuddy(messages: AiBuddyMessage[]) {
  const result = await chatJSONMultiTurn<{ reply: string; needsPro: boolean; toolkit: string[] | null; steps: string[] | null }>(
    AI_BUDDY_SYSTEM_PROMPT,
    messages,
    AI_BUDDY_FALLBACK
  );
  return {
    ...result,
    steps: result.steps ? result.steps.map(stripLeadingNumber).filter(Boolean) : result.steps,
  };
}

/** Suggests a reply for a provider working a new lead in the chat/lead inbox. */
export async function suggestLeadReply(opts: { jobDescription: string; customerMessage?: string; businessName: string }) {
  return chatJSON<{ reply: string }>(
    `You are a helpful assistant drafting a short, friendly first-response message (under 80 words) from a UK tradesperson to a prospective customer on a job lead. Ask 1-2 clarifying questions and propose next steps. Respond as JSON: {"reply": string}.`,
    `Business: ${opts.businessName}\nJob: "${opts.jobDescription}"\nCustomer's latest message: "${opts.customerMessage ?? "(none yet)"}"`,
    { reply: "Hi, thanks for reaching out! Could you share a bit more detail and your availability for a quick visit?" }
  ).then((r) => r.reply);
}
