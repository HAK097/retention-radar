"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { type Band, TAG_LABEL, type Tag } from "@/lib/types";

/* ---------- animated number ---------- */
export function useAnimatedNumber(target: number, duration = 600): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const shown = useRef(target);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from.current === target) {
      shown.current = target;
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const origin = shown.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = origin + (target - origin) * eased;
      shown.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function Counter({ value, prefix = "", className = "" }: { value: number; prefix?: string; className?: string }) {
  const v = useAnimatedNumber(value);
  return (
    <span className={`num ${className}`}>
      {prefix}
      {Math.round(v).toLocaleString("en-US")}
    </span>
  );
}

/* ---------- icons ---------- */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function BandIcon({ band, size = 14 }: { band: Band; size?: number }) {
  if (band === "healthy")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...stroke}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  if (band === "watch")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...stroke}>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M12 3.5L2.8 19.5h18.4L12 3.5z" />
      <path d="M12 10v4.5M12 17.4v.1" />
    </svg>
  );
}

export const BAND_LABEL: Record<Band, string> = { healthy: "Healthy", watch: "Watch", high: "High risk" };

export function RiskBadge({ band, className = "" }: { band: Band; className?: string }) {
  return (
    <span
      data-band={band}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--c)_40%,transparent)] bg-[color-mix(in_srgb,var(--c)_13%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--c)] ${className}`}
    >
      <BandIcon band={band} size={13} />
      {BAND_LABEL[band]}
    </span>
  );
}

export function TrendArrow({ delta }: { delta: number }) {
  const up = delta >= 6;
  const down = delta <= -6;
  const label = up ? "Getting worse" : down ? "Improving" : "Steady";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${up ? "text-[var(--high)]" : down ? "text-[var(--healthy)]" : "text-muted"}`}
      title={label}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden {...stroke}>
        {up ? <path d="M7 17L17 7M9 7h8v8" /> : down ? <path d="M7 7l10 10M17 9v8H9" /> : <path d="M5 12h14" />}
      </svg>
      <span className="sr-only">{label}</span>
      <span aria-hidden className="hidden sm:inline">
        {label}
      </span>
    </span>
  );
}

/* ---------- gauge ring ---------- */
export function Gauge({ score, band, size = 48, stroke: sw = 4, big = false }: { score: number; band: Band; size?: number; stroke?: number; big?: boolean }) {
  const v = useAnimatedNumber(score);
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.min(100, Math.max(0, v)) / 100);
  return (
    <div data-band={band} className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Risk score ${score} out of 100, ${BAND_LABEL[band]}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--c)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={off}
        />
      </svg>
      <span
        className={`num absolute inset-0 flex items-center justify-center font-serif text-[var(--c)] ${big ? "text-5xl" : "text-xl"}`}
      >
        {Math.round(v)}
      </span>
    </div>
  );
}

/* ---------- sparkline ---------- */
export function Sparkline({ points, band, width = 84, height = 28, label }: { points: number[]; band: Band; width?: number; height?: number; label?: string }) {
  const pts = points.length === 1 ? [points[0], points[0]] : points;
  const max = 100;
  const x = (i: number) => 2 + (i * (width - 4)) / (pts.length - 1);
  const y = (v: number) => height - 3 - (Math.min(max, Math.max(0, v)) / max) * (height - 6);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg
      data-band={band}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? `Risk trend: ${pts.join(", ")}`}
      className="shrink-0 overflow-visible"
    >
      <path d={d} fill="none" stroke="var(--c)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx={x(pts.length - 1)} cy={y(last)} r="2.6" fill="var(--c)" />
    </svg>
  );
}

/* ---------- tags ---------- */
export function TagChip({ tag }: { tag: Tag }) {
  const band: Band = tag === "positive" ? "healthy" : tag === "slow_vague" || tag === "workload" ? "watch" : "high";
  return (
    <span
      data-band={band}
      className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--c)_35%,transparent)] bg-[color-mix(in_srgb,var(--c)_11%,transparent)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--c)]"
    >
      <BandIcon band={band} size={11} />
      {TAG_LABEL[tag]}
    </span>
  );
}

/* ---------- small pieces ---------- */
export function DemoBadge({ title }: { title?: string }) {
  return (
    <span
      title={title ?? "Rule-based scorer running, no AI call made. Same output format."}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 text-[11px] font-medium text-muted"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--watch)]" aria-hidden />
      Demo mode
    </span>
  );
}

export function HumanLabel({ children = "AI-assisted. The consultant decides." }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden {...stroke}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5" />
      </svg>
      {children}
    </span>
  );
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (cb) => {
      const o = new MutationObserver(cb);
      o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => o.disconnect();
    },
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark" as const,
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("rr-theme", next);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-fg"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden {...stroke}>
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
        )}
      </svg>
    </button>
  );
}

export function RadarMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.7" />
      <path d="M16 16L26 9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2" fill="var(--accent)" />
      <circle cx="23.5" cy="20" r="2" fill="var(--high)" />
    </svg>
  );
}
