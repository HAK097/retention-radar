import {
  type Band,
  type CheckIn,
  type Milestone,
  MILESTONES,
  type Placement,
  type Side,
} from "./types";

export const GUARANTEE_DAYS = 180;

/** Weights of the transparent placement-risk blend. */
export const WEIGHTS = { candidate: 0.4, client: 0.25, silence: 0.15, trend: 0.2 };

export interface Term {
  key: "candidate" | "client" | "silence" | "trend";
  label: string;
  /** 0-100 input to the blend. */
  value: number;
  /** Effective weight (after re-weighting if a side has no reply yet). */
  weight: number;
  points: number;
  note: string;
}

export interface Score {
  score: number;
  band: Band;
  terms: Term[];
  windowFactor: number;
  rawBeforeWindow: number;
  trendDelta: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export function bandOf(score: number): Band {
  if (score >= 55) return "high";
  if (score >= 30) return "watch";
  return "healthy";
}

export function windowFactor(daysIn: number): number {
  if (daysIn <= 120) return 1;
  if (daysIn <= GUARANTEE_DAYS) return 1 - (0.15 * (daysIn - 120)) / 60;
  return 0.5;
}

export const daysLeft = (p: Pick<Placement, "daysIn">) => GUARANTEE_DAYS - p.daysIn;
export const inWindow = (p: Pick<Placement, "daysIn">) => daysLeft(p) >= 0;

function ordered(cis: CheckIn[]): CheckIn[] {
  return cis
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.day - b.c.day || a.i - b.i)
    .map((x) => x.c);
}

function sideSeries(cis: CheckIn[], side: Side) {
  return ordered(cis).filter((c) => c.side === side);
}

export type SlotState = "replied" | "slow" | "silent" | "pending" | "upcoming";

export function slotState(
  cis: CheckIn[],
  daysIn: number,
  side: Side,
  m: Milestone,
): SlotState {
  if (m > daysIn) return "upcoming";
  const matches = cis.filter((c) => c.side === side && c.milestone === m);
  const last = matches[matches.length - 1];
  if (!last) return daysIn > m + 7 ? "silent" : "pending";
  if (last.text === null) return "silent";
  if ((last.delay ?? 0) > 3) return "slow";
  return "replied";
}

export function computeScore(cis: CheckIn[], daysIn: number): Score {
  const cand = sideSeries(cis, "candidate");
  const client = sideSeries(cis, "client");
  const lastCand = cand[cand.length - 1];
  const lastClient = client[client.length - 1];

  let wCand = WEIGHTS.candidate;
  let wClient = WEIGHTS.client;
  if (!lastCand && lastClient) {
    wClient += wCand;
    wCand = 0;
  } else if (lastCand && !lastClient) {
    wCand += wClient;
    wClient = 0;
  }

  const candRisk = lastCand?.analysis.risk ?? 0;
  const clientRisk = lastClient?.analysis.risk ?? 0;

  // Silence / slow replies across every expected slot.
  let expected = 0;
  let penaltySum = 0;
  let badSlots = 0;
  for (const m of MILESTONES) {
    for (const side of ["candidate", "client"] as Side[]) {
      const st = slotState(cis, daysIn, side, m);
      if (st === "upcoming") continue;
      expected++;
      if (st === "silent") {
        penaltySum += 100;
        badSlots++;
      } else if (st === "slow") {
        penaltySum += 50;
        badSlots++;
      }
    }
  }
  const silenceValue = expected ? clamp((penaltySum / expected) * 2) : 0;

  // Trend: how much worse the latest reply is than the one before, per side.
  const deltas: number[] = [];
  for (const s of [cand, client]) {
    if (s.length >= 2) deltas.push(s[s.length - 1].analysis.risk - s[s.length - 2].analysis.risk);
  }
  const trendDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const trendValue = clamp(trendDelta * 2);

  const terms: Term[] = [
    {
      key: "candidate",
      label: "Latest candidate reply",
      value: candRisk,
      weight: wCand,
      points: wCand * candRisk,
      note: lastCand ? `Day ${lastCand.milestone} reply scored ${candRisk}` : "No candidate reply yet",
    },
    {
      key: "client",
      label: "Latest client reply",
      value: clientRisk,
      weight: wClient,
      points: wClient * clientRisk,
      note: lastClient ? `Day ${lastClient.milestone} reply scored ${clientRisk}` : "No client reply yet",
    },
    {
      key: "silence",
      label: "Silence & slow replies",
      value: silenceValue,
      weight: WEIGHTS.silence,
      points: WEIGHTS.silence * silenceValue,
      note: expected
        ? `${badSlots} of ${expected} expected replies slow (over 3 days) or missing`
        : "No check-ins due yet",
    },
    {
      key: "trend",
      label: "Trend (getting worse?)",
      value: trendValue,
      weight: WEIGHTS.trend,
      points: WEIGHTS.trend * trendValue,
      note:
        trendDelta > 0.5
          ? `Replies are ${Math.round(trendDelta)} points riskier than last time`
          : trendDelta < -0.5
            ? `Replies improved by ${Math.round(-trendDelta)} points`
            : "No change since last reply",
    },
  ];

  const raw = clamp(terms.reduce((a, t) => a + t.points, 0));
  const wf = windowFactor(daysIn);
  const score = Math.round(raw * wf);
  return { score, band: bandOf(score), terms, windowFactor: wf, rawBeforeWindow: raw, trendDelta };
}

export function scorePlacement(p: Placement): Score {
  return computeScore(p.checkins, p.daysIn);
}

/** Risk after each reply, for sparklines. Ends with the current score. */
export function riskSeries(p: Placement): number[] {
  const sorted = ordered(p.checkins);
  const pts: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const upTo = sorted.slice(0, i + 1);
    pts.push(computeScore(upTo, Math.min(sorted[i].day, p.daysIn)).score);
  }
  const current = scorePlacement(p).score;
  if (pts.length === 0 || pts[pts.length - 1] !== current) pts.push(current);
  return pts;
}

export type MilestoneState = "done" | "partial" | "silent" | "upcoming" | "due";

export function milestoneState(p: Placement, m: Milestone): MilestoneState {
  const a = slotState(p.checkins, p.daysIn, "candidate", m);
  const b = slotState(p.checkins, p.daysIn, "client", m);
  if (a === "upcoming") return "upcoming";
  if (a === "silent" || b === "silent") return "silent";
  const ok = (s: string) => s === "replied" || s === "slow";
  if (ok(a) && ok(b)) return "done";
  if (ok(a) || ok(b)) return "partial";
  return "due";
}

export function latestBySide(p: Placement, side: Side): CheckIn | undefined {
  const s = sideSeries(p.checkins, side);
  return s[s.length - 1];
}
