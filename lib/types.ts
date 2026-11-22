export type Side = "candidate" | "client";
export type Milestone = 30 | 60 | 90;
export const MILESTONES: Milestone[] = [30, 60, 90];

export type Tag =
  | "pay_concern"
  | "manager_friction"
  | "role_mismatch"
  | "workload"
  | "slow_vague"
  | "silence"
  | "positive";

export const TAGS: Tag[] = [
  "pay_concern",
  "manager_friction",
  "role_mismatch",
  "workload",
  "slow_vague",
  "silence",
  "positive",
];

export const TAG_LABEL: Record<Tag, string> = {
  pay_concern: "Pay & benefits",
  manager_friction: "Manager friction",
  role_mismatch: "Role mismatch",
  workload: "Workload",
  slow_vague: "Slow or vague reply",
  silence: "Silence",
  positive: "Positive",
};

export type Sector =
  | "Construction"
  | "Finance"
  | "Jewellery retail"
  | "E-commerce"
  | "Hospitality"
  | "Tech";

export interface Signal {
  tag: Tag;
  evidence_quote: string;
}

/** What /api/analyze returns. */
export interface Analysis {
  risk: number;
  sentiment: number;
  signals: Signal[];
  confidence: number;
  summary: string;
  next_action: string;
  draft_message: string;
}

export interface CheckInAnalysis {
  risk: number;
  sentiment: number;
  signals: Signal[];
  confidence: number;
  summary: string;
}

export interface CheckIn {
  id: string;
  side: Side;
  milestone: Milestone;
  /** Day of the placement on which the reply arrived (or the chase was abandoned). */
  day: number;
  /** Days after the milestone due date. */
  delay: number | null;
  /** null = no reply received. */
  text: string | null;
  analysis: CheckInAnalysis;
  logged?: boolean;
  mode?: "live" | "demo";
}

export interface Placement {
  id: string;
  candidate: string;
  role: string;
  client: string;
  sector: Sector;
  salaryAED: number;
  feeAED: number;
  daysIn: number;
  checkins: CheckIn[];
  next_action: string;
  draft_message: string;
}

export type Band = "healthy" | "watch" | "high";

export interface Logged {
  placementId: string;
  checkin: CheckIn;
  next_action: string;
  draft_message: string;
}
