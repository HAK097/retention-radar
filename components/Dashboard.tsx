"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import seed from "@/lib/seed.json";
import { GUARANTEE_DAYS, type MilestoneState, daysLeft, inWindow, milestoneState, riskSeries, scorePlacement } from "@/lib/scoring";
import { applyLogged, loadLogged, saveLogged } from "@/lib/store";
import { type Band, type CheckIn, type Logged, MILESTONES, type Placement, type Sector } from "@/lib/types";
import Drawer from "./Drawer";
import RealDataPanel from "./RealDataPanel";
import { BAND_LABEL, Counter, Gauge, HumanLabel, RadarMark, RiskBadge, Sparkline, ThemeToggle, TrendArrow } from "./ui";

const BASE = seed as unknown as Placement[];
const SECTORS: Sector[] = ["Construction", "Finance", "Jewellery retail", "E-commerce", "Hospitality", "Tech"];

const STATE_META: Record<MilestoneState, { icon: string; label: string; cls: string }> = {
  done: { icon: "✓", label: "replied", cls: "text-[var(--healthy)] border-[color-mix(in_srgb,var(--healthy)_35%,transparent)]" },
  partial: { icon: "◐", label: "one reply", cls: "text-[var(--watch)] border-[color-mix(in_srgb,var(--watch)_40%,transparent)]" },
  silent: { icon: "✕", label: "silent", cls: "text-[var(--high)] border-[color-mix(in_srgb,var(--high)_40%,transparent)]" },
  due: { icon: "…", label: "awaiting", cls: "text-muted border-line" },
  upcoming: { icon: "○", label: "upcoming", cls: "text-muted border-line opacity-70" },
};

interface Row {
  p: Placement;
  s: ReturnType<typeof scorePlacement>;
  series: number[];
}

function MilestoneChips({ p }: { p: Placement }) {
  return (
    <ul className="flex gap-1.5" aria-label="Check-in status">
      {MILESTONES.map((m) => {
        const st = milestoneState(p, m);
        const meta = STATE_META[st];
        return (
          <li
            key={m}
            title={`Day ${m}: ${meta.label}`}
            className={`num inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
          >
            <span aria-hidden>{meta.icon}</span>
            {m}d<span className="sr-only">, {meta.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function initials(n: string) {
  return n
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
}

function PlacementRow({ row, onOpen, index }: { row: Row; onOpen: (id: string, el: HTMLElement) => void; index: number }) {
  const { p, s, series } = row;
  const left = daysLeft(p);
  return (
    <li className="rise" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
      <button
        data-band={s.band}
        onClick={(e) => onOpen(p.id, e.currentTarget)}
        className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-all duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--c)_55%,var(--line))] hover:bg-raised md:grid-cols-[auto_minmax(0,1.5fr)_auto_auto_auto_auto_auto_auto] md:gap-x-4 lg:gap-x-5"
        aria-label={`${p.candidate}, ${p.role} at ${p.client}. Risk ${s.score}, ${BAND_LABEL[s.band]}. Open details.`}
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-raised text-sm font-medium text-muted ring-1 ring-line">
          {initials(p.candidate)}
          {s.band === "high" && <span className="pulse absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[var(--c)]" style={{ ["--c" as string]: "var(--high)" }} aria-hidden />}
        </span>

        <span className="min-w-0">
          <span className="block truncate font-medium">{p.candidate}</span>
          <span className="block truncate text-sm text-muted">
            {p.role} · {p.client}
          </span>
          <span className="mt-0.5 block text-xs text-muted md:hidden">{p.sector}</span>
        </span>

        <span className="flex items-center gap-2 md:hidden">
          <Gauge score={s.score} band={s.band} size={46} />
        </span>

        <span className="col-span-3 flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-1 md:contents">
          <span className="hidden text-xs text-muted md:block">{p.sector}</span>
          <MilestoneChips p={p} />
          <span className="num text-xs text-muted md:w-24">
            {inWindow(p) ? (
              <>
                <span className="text-fg">{left}</span> days left
              </>
            ) : (
              "Window closed"
            )}
          </span>
          <span className="ml-auto md:ml-0">
            <Sparkline points={series} band={s.band} />
          </span>
          <span className="flex items-center gap-2 md:w-28 md:flex-col md:items-start md:gap-1">
            <RiskBadge band={s.band} />
            <TrendArrow delta={s.trendDelta} />
          </span>
          <span className="hidden md:block">
            <Gauge score={s.score} band={s.band} size={46} />
          </span>
        </span>
      </button>
    </li>
  );
}

function SkeletonRows() {
  return (
    <ul className="space-y-2.5" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="skeleton h-[68px]" />
      ))}
    </ul>
  );
}

function Kpi({ label, value, sub, prefix, tone }: { label: string; value: number; sub: string; prefix?: string; tone?: Band }) {
  return (
    <div data-band={tone} className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 font-serif text-4xl ${tone ? "text-[var(--c)]" : ""}`}>
        <Counter value={value} prefix={prefix} />
      </div>
      <div className="mt-0.5 text-xs text-muted">{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const [logged, setLogged] = useState<Logged[]>([]);
  const [ready, setReady] = useState(false);
  const [sector, setSector] = useState<Sector | "all">("all");
  const [level, setLevel] = useState<Band | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [scrollForm, setScrollForm] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setLogged(loadLogged());
      setReady(true);
    }, 350);
    return () => window.clearTimeout(t);
  }, []);

  const placements = useMemo(() => applyLogged(BASE, logged), [logged]);
  const rows: Row[] = useMemo(
    () =>
      placements
        .map((p) => ({ p, s: scorePlacement(p), series: riskSeries(p) }))
        .sort((a, b) => b.s.score - a.s.score),
    [placements],
  );

  const filtered = rows.filter((r) => (sector === "all" || r.p.sector === sector) && (level === "all" || r.s.band === level));

  const kpi = useMemo(() => {
    const inside = rows.filter((r) => inWindow(r.p));
    const high = inside.filter((r) => r.s.band === "high");
    const watch = inside.filter((r) => r.s.band === "watch");
    return {
      active: rows.length,
      inside: inside.length,
      high: high.length,
      watch: watch.length,
      fee: high.reduce((a, r) => a + r.p.feeAED, 0),
    };
  }, [rows]);

  const top = rows.find((r) => inWindow(r.p));
  const open = rows.find((r) => r.p.id === openId);

  const openDetails = useCallback((id: string, el?: HTMLElement | null, form = false) => {
    returnFocus.current = el ?? (document.activeElement as HTMLElement | null);
    setScrollForm(form);
    setOpenId(id);
  }, []);

  const closeDetails = useCallback(() => {
    setOpenId(null);
    window.setTimeout(() => returnFocus.current?.focus?.(), 0);
  }, []);

  const onLogged = useCallback((placementId: string, checkin: CheckIn, next_action: string, draft_message: string) => {
    setLogged((prev) => {
      const next = [...prev, { placementId, checkin, next_action, draft_message }];
      saveLogged(next);
      return next;
    });
  }, []);

  function resetDemo() {
    setLogged([]);
    saveLogged([]);
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-10 sm:px-6">
      {/* header */}
      <header className="flex items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-2.5">
          <RadarMark />
          <span className="font-serif text-2xl">Retention Radar</span>
          <span className="hidden rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted sm:inline">Concept demo</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => top && openDetails(top.p.id, null, true)}
            className="hidden h-9 items-center rounded-full border border-line bg-surface px-4 text-sm transition-colors hover:border-accent sm:inline-flex"
          >
            Log a check-in
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* hero */}
      <section className="grid grid-cols-1 gap-5 pb-6 pt-2 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
        <div className="flex min-w-0 flex-col justify-center">
          <h1 className="font-serif text-[2.6rem] leading-[1.05] sm:text-6xl">
            Know who is quietly leaving, <em className="text-accent not-italic">before</em> the guarantee is called on.
          </h1>
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted">
            Retention Radar reads 30, 60 and 90-day check-in replies from candidates and clients, scores every placement for early-exit
            risk, and tells the consultant who to call first and what to say.
          </p>
          <div className="mt-4">
            <HumanLabel>AI assists. The consultant decides.</HumanLabel>
          </div>
        </div>

        {top ? (
          <article data-band={top.s.band} className="rise rounded-2xl border border-[color-mix(in_srgb,var(--c)_45%,var(--line))] bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--c)]">Call first</span>
              <RiskBadge band={top.s.band} />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <Gauge score={top.s.score} band={top.s.band} size={84} stroke={6} big />
              <div className="min-w-0">
                <div className="font-serif text-3xl leading-tight">{top.p.candidate}</div>
                <div className="truncate text-sm text-muted">
                  {top.p.role} · {top.p.client}
                </div>
                <div className="num mt-0.5 text-xs text-muted">{daysLeft(top.p)} days left in guarantee</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed">{top.p.next_action}</p>
            <button
              onClick={(e) => openDetails(top.p.id, e.currentTarget)}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink transition-transform hover:-translate-y-px"
            >
              Open brief and draft message
              <span aria-hidden>→</span>
            </button>
          </article>
        ) : (
          <div className="skeleton min-h-[260px]" />
        )}
      </section>

      {/* KPIs */}
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Active placements" value={kpi.active} sub="across 6 sectors" />
        <Kpi label="Inside guarantee window" value={kpi.inside} sub={`${GUARANTEE_DAYS}-day free replacement`} />
        <Kpi label="At risk" value={kpi.high} sub={`${kpi.watch} more on watch`} tone="high" />
        <Kpi label="Fee at risk (illustrative)" value={kpi.fee} prefix="AED " sub="15% of annual pay, high-risk only" tone="watch" />
      </section>

      {/* list */}
      <section aria-labelledby="list-h" className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="list-h" className="font-serif text-3xl">
              Who to call, in order
            </h2>
            <p className="text-sm text-muted">Sorted by risk. Select a placement for the evidence and a draft message.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="f-sector">
              Filter by sector
            </label>
            <select
              id="f-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value as Sector | "all")}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="all">All sectors</option>
              {SECTORS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="f-level">
              Filter by risk level
            </label>
            <select
              id="f-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as Band | "all")}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="all">All risk levels</option>
              <option value="high">High risk</option>
              <option value="watch">Watch</option>
              <option value="healthy">Healthy</option>
            </select>
          </div>
        </div>

        {!ready ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="font-serif text-2xl">Nothing matches these filters</p>
            <p className="mt-1 text-sm text-muted">That is good news if you filtered for high risk in one sector.</p>
            <button
              onClick={() => {
                setSector("all");
                setLevel("all");
              }}
              className="mt-4 rounded-full border border-line px-4 py-2 text-sm hover:border-accent"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((r, i) => (
              <PlacementRow key={r.p.id} row={r} index={i} onOpen={(id, el) => openDetails(id, el)} />
            ))}
          </ul>
        )}

        {logged.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            {logged.length} check-in{logged.length > 1 ? "s" : ""} logged in this browser.{" "}
            <button onClick={resetDemo} className="underline underline-offset-2 hover:text-fg">
              Reset demo data
            </button>
          </p>
        )}
      </section>

      <div className="mt-8 space-y-3">
        <RealDataPanel />
      </div>

      <footer className="mt-8 border-t border-line pt-5 text-center text-xs text-muted">
        <p>Concept demo, fictional data. Built for Prime HR Advisory.</p>
        <p className="mt-1">Flags for consultant outreach only, not an employment decision.</p>
      </footer>

      {open && (
        <Drawer
          key={open.p.id}
          placement={open.p}
          score={open.s}
          series={open.series}
          scrollToForm={scrollForm}
          onClose={closeDetails}
          onLogged={onLogged}
        />
      )}
    </div>
  );
}
