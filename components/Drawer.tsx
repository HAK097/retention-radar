"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GUARANTEE_DAYS, type Score, daysLeft, inWindow, latestBySide } from "@/lib/scoring";
import { type CheckIn, MILESTONES, type Milestone, type Placement, type Side } from "@/lib/types";
import LogForm from "./LogForm";
import { BandIcon, DemoBadge, Gauge, HumanLabel, RiskBadge, Sparkline, TagChip, TrendArrow, useAnimatedNumber } from "./ui";

function bandOfRisk(r: number) {
  return r >= 55 ? "high" : r >= 30 ? "watch" : "healthy";
}

function ReplyCard({ ci, side, milestone, placement }: { ci?: CheckIn; side: Side; milestone: Milestone; placement: Placement }) {
  const who = side === "candidate" ? placement.candidate.split(" ")[0] : placement.client;
  if (!ci) {
    const upcoming = milestone > placement.daysIn;
    return (
      <div className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
        <div className="text-xs font-medium uppercase tracking-wider">{who}</div>
        <p className="mt-1">{upcoming ? `Due on day ${milestone}.` : "Awaiting reply."}</p>
      </div>
    );
  }
  const b = bandOfRisk(ci.analysis.risk);
  return (
    <div data-band={b} className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{who}</span>
        <span className="flex items-center gap-1.5">
          {ci.logged && (ci.mode === "demo" ? <DemoBadge /> : <span className="text-[11px] text-muted">Logged</span>)}
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--c)_13%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--c)]">
            <BandIcon band={b} size={12} />
            <span className="num">{ci.analysis.risk}</span>
          </span>
        </span>
      </div>
      {ci.text === null ? (
        <p className="mt-2 text-sm italic text-muted">No reply after two follow-ups (day {ci.day}).</p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed">“{ci.text}”</p>
      )}
      <p className="mt-2 text-xs text-muted">
        {ci.text === null
          ? "Silence is itself a signal."
          : ci.delay && ci.delay > 3
            ? `Replied day ${ci.day}, ${ci.delay} days late.`
            : `Replied day ${ci.day}, on time.`}
      </p>
      {ci.analysis.signals.length > 0 && (
        <ul className="mt-2.5 space-y-2">
          {ci.analysis.signals.map((s, i) => (
            <li key={i} className="space-y-1">
              <TagChip tag={s.tag} />
              <blockquote className="border-l-2 border-line pl-2 text-xs text-muted">“{s.evidence_quote}”</blockquote>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2.5 text-[11px] text-muted">
        <span className="num">Confidence {Math.round(ci.analysis.confidence * 100)}%</span> · {ci.analysis.summary}
      </p>
    </div>
  );
}

export default function Drawer({
  placement,
  score,
  series,
  scrollToForm,
  onClose,
  onLogged,
}: {
  placement: Placement;
  score: Score;
  series: number[];
  scrollToForm: boolean;
  onClose: () => void;
  onLogged: (placementId: string, c: CheckIn, next_action: string, draft: string) => void;
}) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setShown(false);
    window.setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    // Esc must work even if focus has fallen back to the page (e.g. after a button disables itself).
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onEsc);
    if (scrollToForm) {
      window.setTimeout(() => document.getElementById("log-checkin")?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    }
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [scrollToForm, close]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !panel.current) return;
    const f = panel.current.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),textarea,select,input,[tabindex]:not([tabindex="-1"])',
    );
    if (!f.length) return;
    const first = f[0];
    const lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      first.focus();
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(placement.draft_message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: user can still select the text */
    }
  }

  const left = daysLeft(placement);
  const pct = Math.min(100, (placement.daysIn / GUARANTEE_DAYS) * 100);
  const lastCand = latestBySide(placement, "candidate");
  const lastClient = latestBySide(placement, "client");
  const summary = [lastCand?.analysis.summary, lastClient?.analysis.summary].filter(Boolean).join(" ");
  const finalAnimated = useAnimatedNumber(score.score);

  return (
    <div className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
      <div
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
        onClick={close}
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[680px] flex-col overflow-y-auto border-l border-line bg-bg shadow-2xl transition-transform duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] ${shown ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-bg/95 px-4 py-4 backdrop-blur sm:px-6">
          <div>
            <h2 id="drawer-title" className="font-serif text-3xl leading-tight">
              {placement.candidate}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {placement.role} · {placement.client} · {placement.sector}
            </p>
          </div>
          <button
            ref={closeBtn}
            onClick={close}
            aria-label="Close details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="space-y-5 px-4 py-5 sm:px-6">
          {/* score hero */}
          <section data-band={score.band} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-5">
              <Gauge score={score.score} band={score.band} size={112} stroke={8} big />
              <div className="min-w-[160px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge band={score.band} />
                  <TrendArrow delta={score.trendDelta} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {inWindow(placement) ? (
                    <>
                      Day <span className="num text-fg">{placement.daysIn}</span> of {GUARANTEE_DAYS}.{" "}
                      <span className="num text-fg">{left}</span> days left in the free-replacement window.
                    </>
                  ) : (
                    "Guarantee window has closed."
                  )}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                  <div className="h-full rounded-full bg-[var(--c)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <Sparkline points={series} band={score.band} width={110} height={44} />
            </div>
          </section>

          <p className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
            Flags for consultant outreach only, not an employment decision. Everything below is a prompt for a human conversation.
          </p>

          {/* AI summary */}
          <section aria-labelledby="sum-h">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 id="sum-h" className="font-serif text-2xl">
                Summary
              </h3>
              <HumanLabel />
            </div>
            <p className="text-sm leading-relaxed">{summary || "No replies yet."}</p>
          </section>

          {/* why this score */}
          <section aria-labelledby="why-h" className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 id="why-h" className="font-serif text-2xl">
                Why this score
              </h3>
              <span className="text-[11px] text-muted">Calculated in code, not by the AI</span>
            </div>
            <ul className="space-y-3">
              {score.terms.map((t) => (
                <li key={t.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>
                      {t.label} <span className="text-xs text-muted">× {Math.round(t.weight * 100)}%</span>
                    </span>
                    <span className="num font-medium">+{t.points.toFixed(1)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                    <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${Math.min(100, t.value)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{t.note}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
              <span className="text-muted">
                × <span className="num">{score.windowFactor.toFixed(2)}</span> position in guarantee window (day {placement.daysIn})
              </span>
              <span className="num font-serif text-2xl" data-band={score.band}>
                = <span className="text-[var(--c)]">{Math.round(finalAnimated)}</span>
              </span>
            </div>
          </section>

          {/* next action + draft */}
          <section aria-labelledby="act-h" className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 id="act-h" className="font-serif text-2xl">
                Recommended next action
              </h3>
              <HumanLabel />
            </div>
            <p className="text-sm leading-relaxed">{placement.next_action}</p>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">Draft message, edit before sending</span>
                <button
                  onClick={copy}
                  className="rounded-full border border-line px-3 py-1 text-xs font-medium transition-colors hover:border-accent"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-[color-mix(in_srgb,var(--accent)_16%,var(--raised))] px-3.5 py-2.5 text-sm leading-relaxed" aria-live="polite">
                {placement.draft_message}
              </div>
            </div>
          </section>

          {/* timeline */}
          <section aria-labelledby="tl-h">
            <h3 id="tl-h" className="mb-3 font-serif text-2xl">
              Check-in timeline
            </h3>
            <div className="space-y-5">
              {MILESTONES.map((m) => {
                const pick = (side: Side) => {
                  const arr = placement.checkins.filter((c) => c.side === side && c.milestone === m);
                  return arr[arr.length - 1];
                };
                return (
                  <div key={m}>
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
                      <span className="num rounded-md bg-raised px-2 py-0.5 text-fg">Day {m}</span>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ReplyCard ci={pick("candidate")} side="candidate" milestone={m} placement={placement} />
                      <ReplyCard ci={pick("client")} side="client" milestone={m} placement={placement} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <LogForm placement={placement} onLogged={(c, a, d) => onLogged(placement.id, c, a, d)} />

          <p className="pb-4 text-center text-[11px] text-muted">Concept demo, fictional data.</p>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        Risk score {score.score} out of 100
      </span>
    </div>
  );
}
