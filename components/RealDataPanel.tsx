"use client";

import { useState } from "react";

const ITEMS = [
  {
    h: "Privacy and consent",
    p: "Candidates and clients opt in to check-ins in writing, know their replies are analysed, and can opt out. Only the minimum text is stored, with a retention limit.",
  },
  {
    h: "UAE data protection",
    p: "Processing must follow UAE Federal Decree-Law No. 45 of 2021 (PDPL) and any DIFC or ADGM rules that apply. That means a lawful basis, a clear notice, and a decision on where data is hosted. Legal review comes before any live data.",
  },
  {
    h: "Human oversight",
    p: "Scores only prioritise consultant outreach. Nothing is decided about a candidate by the tool, every AI output is labelled, and each flag has its evidence quote so a person can check it.",
  },
  {
    h: "Integrations",
    p: "ATS for placements and fee data; WPForms for check-in forms; Calendly for booking the call; WhatsApp Business API for sending and receiving replies, with templates approved by Meta.",
  },
  {
    h: "Measuring it",
    p: "Back-test on past placements: did early flags precede the exits? Then track replacement rate inside 180 days, time from flag to call, and consultant time saved.",
  },
];

export default function RealDataPanel() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-line bg-surface">
      <h2>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="real-data"
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
        >
          <span className="font-serif text-2xl">What changes with real data</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden
            className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h2>
      {open && (
        <div id="real-data" className="rise grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2 sm:px-5">
          {ITEMS.map((i) => (
            <div key={i.h}>
              <h3 className="text-sm font-semibold">{i.h}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{i.p}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
