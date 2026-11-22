import type { Analysis, Side, Signal, Tag } from "./types";

export interface Ctx {
  candidate: string;
  client: string;
  role: string;
}

interface Rule {
  tag: Tag;
  weight: number;
  re: RegExp;
}

// Deterministic, transparent keyword rules. Used whenever the AI call is
// unavailable, so the app works with no key, no network and no cost.
const RULES: Rule[] = [
  {
    tag: "pay_concern",
    weight: 17,
    re: /\b(salary|allowance|commission|bonus|package|visa|labou?r card|counter[- ]?offer|recruiter|headhunter|curious about the market|own pocket|not (yet )?(paid|confirmed|sorted)|still waiting|not sorted|not clear how)\b/i,
  },
  {
    tag: "manager_friction",
    weight: 18,
    re: /\b(reporting line|new (vp|boss|manager|head)|micromanag\w*|toxic|blam\w*|unsupported|restructur\w*|politics|clash\w*|friction|disagree\w*|HR admin is a bit behind)\b/i,
  },
  {
    tag: "role_mismatch",
    weight: 16,
    re: /\b(not what i expected|less [\w\s]{1,30} than (we )?discussed|more [\w\s]{1,20} than (the job description|expected|agreed)|job description|mismatch|different from the interview|not what was promised|bored|underutili[sz]ed|overqualified|no growth)\b/i,
  },
  {
    tag: "workload",
    weight: 14,
    re: /\b(late nights?|till \d+\s?(pm)?|until \d+\s?(pm)?|overtime|long hours|hours are long|split shifts?|double shifts?|burn\w*|exhaust\w*|tired|overwhelm\w*|stress\w*|weekends?)\b/i,
  },
  {
    tag: "slow_vague",
    weight: 10,
    re: /(no issues to report|we are monitoring|will be reviewed|a bit quiet|less engaged|disengag\w*|nothing to report|no comment)/i,
  },
  {
    tag: "positive",
    weight: -12,
    re: /\b(great|love|loving|happy|enjoy\w*|excellent|exceed\w*|brilliant|smooth|welcom\w*|strong (fit|hire)|top performer|delighted|thrilled|pleased|helpful|settling in (well|nicely)|promot\w*|picks things up fast)\b/i,
  },
];

const BARE_REPLY = /^\s*(fine|ok|okay|good|all good|no issues|no concerns|yes|sure)[.!\s]*$/i;

function sentenceAround(text: string, index: number): string {
  const start = Math.max(
    text.lastIndexOf(".", index - 1),
    text.lastIndexOf("!", index - 1),
    text.lastIndexOf("?", index - 1),
    text.lastIndexOf("\n", index - 1),
  );
  let end = text.slice(index).search(/[.!?\n]/);
  end = end === -1 ? text.length : index + end + 1;
  return text.slice(start + 1, end).trim().slice(0, 140);
}

const FIRST = (n: string) => n.split(" ")[0];

const ACTION: Record<Tag, string> = {
  pay_concern:
    "Call within 48 hours. Confirm the package, allowance and visa paperwork are in writing, and chase the client's HR if anything is outstanding.",
  manager_friction:
    "Call the candidate this week to hear how reporting lines changed, then speak to the client's hiring manager with the candidate's consent.",
  role_mismatch:
    "Compare the day-to-day role with the job description discussed at interview, then raise any gap with the client before it hardens.",
  workload:
    "Check hours and rota with both sides; ask the client what relief or recognition is possible.",
  slow_vague:
    "Follow up by phone rather than message; a short or vague reply often hides a concern worth hearing out loud.",
  silence:
    "Try a different channel (call or WhatsApp) today; two missed replies in a row is worth a personal touch.",
  positive: "No outreach needed. Keep the next check-in on the calendar.",
};

function draft(side: Side, top: Tag | null, ctx: Ctx, risk: number): string {
  const name = FIRST(ctx.candidate);
  if (side === "candidate") {
    if (risk < 30) {
      return `Hi ${name}, thanks for the update, really glad it's going well at ${ctx.client}. Shout if anything changes, and we'll speak again at the next check-in.`;
    }
    const topic =
      top === "pay_concern"
        ? "your package and paperwork"
        : top === "workload"
          ? "how the workload is feeling"
          : top === "role_mismatch"
            ? "how the role compares with what we discussed"
            : top === "manager_friction"
              ? "how things are with the team"
              : "how things are going";
    return `Hi ${name}, thanks for the reply. I'd like to hear a bit more about ${topic}. Do you have 10 minutes for a quick call this week? Happy to help sort anything out with ${ctx.client}.`;
  }
  if (risk < 30) {
    return `Hi, thanks for the update on ${name}. Glad it's going well. We'll check in again at the next milestone.`;
  }
  return `Hi, thanks for the update on ${name}. Could we have a quick call this week to make sure the ${ctx.role} role is working well for everyone? Happy to help with anything that would make it easier.`;
}

export function fallbackAnalyze(text: string, side: Side, ctx: Ctx): Analysis {
  const input = text.trim();
  if (input.length < 3) {
    return {
      risk: 65,
      sentiment: -0.2,
      signals: [],
      confidence: 0.35,
      summary: "No usable reply text was provided, so silence is treated as a mild warning.",
      next_action: ACTION.silence,
      draft_message: draft(side, "silence", ctx, 65),
    };
  }

  const signals: Signal[] = [];
  let risk = 25;
  let positives = 0;
  let strongest: { tag: Tag; weight: number } | null = null;
  const used = new Set<Tag>();

  for (const r of RULES) {
    const m = r.re.exec(input);
    if (!m || used.has(r.tag)) continue;
    used.add(r.tag);
    const quote = sentenceAround(input, m.index);
    if (quote.length >= 3 && input.includes(quote)) signals.push({ tag: r.tag, evidence_quote: quote });
    if (r.tag === "positive") {
      positives = (input.match(new RegExp(r.re.source, "gi")) ?? []).length;
      risk -= Math.min(2, positives) * 12;
    } else {
      risk += r.weight;
      if (!strongest || r.weight > strongest.weight) strongest = { tag: r.tag, weight: r.weight };
    }
  }

  if (BARE_REPLY.test(input) || input.length < 20) {
    if (!used.has("slow_vague")) signals.push({ tag: "slow_vague", evidence_quote: input.slice(0, 140) });
    risk += 12;
    if (!strongest) strongest = { tag: "slow_vague", weight: 10 };
  }

  risk = Math.round(Math.min(95, Math.max(3, risk)));
  const negCount = signals.filter((s) => s.tag !== "positive").length;
  const topTag = strongest?.tag ?? null;
  const who = side === "candidate" ? "Candidate" : "Client";

  const summary =
    negCount === 0
      ? positives
        ? `${who} reply is warm and shows no risk cues.`
        : `${who} reply is neutral, with no clear risk cues.`
      : `${who} reply flags ${signals
          .filter((s) => s.tag !== "positive")
          .map((s) => s.tag.replace("_", " "))
          .join(", ")}. Worth a human conversation.`;

  return {
    risk,
    sentiment: Math.round(Math.max(-1, Math.min(1, (50 - risk) / 50)) * 100) / 100,
    signals,
    confidence: Math.round(Math.min(0.7, input.length < 40 ? 0.4 : 0.45 + 0.07 * signals.length) * 100) / 100,
    summary,
    next_action: risk < 30 ? ACTION.positive : ACTION[topTag ?? "slow_vague"],
    draft_message: draft(side, topTag, ctx, risk),
  };
}
