"use client";

import { useState } from "react";
import { fallbackAnalyze } from "@/lib/fallback";
import type { Analysis, CheckIn, Milestone, Placement, Side } from "@/lib/types";
import { DemoBadge, HumanLabel, TagChip } from "./ui";

const MAX = 800;

const SAMPLES: { label: string; side: Side; text: string }[] = [
  {
    label: "Sample: quietly unhappy",
    side: "candidate",
    text: "All fine here. Honestly the hours are long, I'm in till 10pm most nights, and a recruiter from another firm called me about a role with a better package. Not sure yet.",
  },
  {
    label: "Sample: happy",
    side: "candidate",
    text: "Really enjoying it. The team is great, my manager is supportive and I got my Emirates ID this week. Thanks for checking in!",
  },
];

export default function LogForm({
  placement,
  onLogged,
}: {
  placement: Placement;
  onLogged: (c: CheckIn, next_action: string, draft_message: string) => void;
}) {
  const [text, setText] = useState("");
  const [side, setSide] = useState<Side>("candidate");
  const [milestone, setMilestone] = useState<Milestone>(
    placement.daysIn >= 90 ? 90 : placement.daysIn >= 60 ? 60 : 30,
  );
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ mode: "live" | "demo"; analysis: Analysis; before: number } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim().slice(0, MAX);
    if (body.length < 3 || busy) return;
    setBusy(true);
    const ctx = { candidate: placement.candidate, client: placement.client, role: placement.role };
    let mode: "live" | "demo" = "demo";
    let analysis: Analysis;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, side, milestone, ...ctx }),
      });
      const json = await res.json();
      if (!json?.analysis?.summary) throw new Error("bad shape");
      analysis = json.analysis as Analysis;
      mode = json.mode === "live" ? "live" : "demo";
    } catch {
      analysis = fallbackAnalyze(body, side, ctx);
    }
    // Small beat so the loading state reads as "thinking" even in demo mode.
    await new Promise((r) => setTimeout(r, 450));
    const checkin: CheckIn = {
      id: `L${Date.now()}`,
      side,
      milestone,
      day: placement.daysIn,
      delay: 0,
      text: body,
      analysis: {
        risk: analysis.risk,
        sentiment: analysis.sentiment,
        signals: analysis.signals,
        confidence: analysis.confidence,
        summary: analysis.summary,
      },
      logged: true,
      mode,
    };
    setLast({ mode, analysis, before: 0 });
    onLogged(checkin, analysis.next_action, analysis.draft_message);
    setText("");
    setBusy(false);
  }

  return (
    <section id="log-checkin" aria-labelledby="log-h" className="scroll-mt-24 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h3 id="log-h" className="font-serif text-2xl">
        Log a check-in
      </h3>
      <p className="mt-1 text-sm text-muted">
        Paste a reply from {placement.candidate.split(" ")[0]} or {placement.client}. The risk score updates live.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <fieldset className="flex rounded-lg border border-line p-0.5 text-sm">
            <legend className="sr-only">Who replied</legend>
            {(["candidate", "client"] as Side[]).map((s) => (
              <label key={s} className="cursor-pointer">
                <input type="radio" name="side" value={s} checked={side === s} onChange={() => setSide(s)} className="peer sr-only" />
                <span className="block rounded-md px-3 py-1.5 capitalize text-muted transition-colors peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                  {s}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-muted">
            Check-in
            <select
              value={milestone}
              onChange={(e) => setMilestone(Number(e.target.value) as Milestone)}
              className="rounded-lg border border-line bg-raised px-2.5 py-1.5 text-fg"
            >
              <option value={30}>Day 30</option>
              <option value={60}>Day 60</option>
              <option value={90}>Day 90</option>
            </select>
          </label>
        </div>

        <div>
          <label htmlFor="reply" className="sr-only">
            Reply text
          </label>
          <textarea
            id="reply"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            rows={4}
            placeholder="Paste the WhatsApp or email reply here…"
            className="w-full resize-y rounded-lg border border-line bg-raised p-3 text-sm text-fg placeholder:text-muted"
          />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  type="button"
                  key={s.label}
                  onClick={() => {
                    setText(s.text);
                    setSide(s.side);
                  }}
                  className="rounded-full border border-line px-2.5 py-1 transition-colors hover:border-accent hover:text-fg"
                >
                  {s.label}
                </button>
              ))}
            </span>
            <span className="num">
              {text.length}/{MAX}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || text.trim().length < 3}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink transition-opacity disabled:opacity-50"
        >
          {busy ? "Analysing…" : "Analyse reply"}
        </button>
      </form>

      {busy && (
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
        </div>
      )}

      {!busy && last && (
        <div className="rise mt-4 rounded-lg border border-line bg-raised p-3 text-sm" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">Reply scored {last.analysis.risk}/100. Placement score updated.</span>
            {last.mode === "demo" ? <DemoBadge /> : <HumanLabel>AI output</HumanLabel>}
          </div>
          <p className="mt-1.5 text-muted">{last.analysis.summary}</p>
          {last.analysis.signals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {last.analysis.signals.map((s, i) => (
                <TagChip key={i} tag={s.tag} />
              ))}
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted">
        Logged replies are saved in this browser only. Nothing is sent anywhere except the scorer.
      </p>
    </section>
  );
}
