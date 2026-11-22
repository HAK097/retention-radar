import { z } from "zod";
import { type Analysis, TAGS, type Tag } from "./types";

const tagSchema = z.enum(TAGS as [Tag, ...Tag[]]);

export const analysisSchema = z.object({
  risk: z.number(),
  sentiment: z.number(),
  signals: z.array(z.object({ tag: tagSchema, evidence_quote: z.string() })),
  confidence: z.number(),
  summary: z.string().min(1),
  next_action: z.string().min(1),
  draft_message: z.string().min(1),
});

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Validate model output, clamp numbers, and drop evidence quotes that are not exact substrings of the input. */
export function sanitizeAnalysis(raw: unknown, input: string): Analysis | null {
  const parsed = analysisSchema.safeParse(raw);
  if (!parsed.success) return null;
  const a = parsed.data;
  const seen = new Set<string>();
  const signals = a.signals.filter((s) => {
    const q = s.evidence_quote;
    if (q.trim().length < 3 || !input.includes(q)) return false;
    const key = `${s.tag}|${q}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    risk: Math.round(clamp(a.risk, 0, 100)),
    sentiment: Math.round(clamp(a.sentiment, -1, 1) * 100) / 100,
    confidence: Math.round(clamp(a.confidence, 0, 1) * 100) / 100,
    signals,
    summary: a.summary.slice(0, 400),
    next_action: a.next_action.slice(0, 400),
    draft_message: a.draft_message.slice(0, 700),
  };
}
