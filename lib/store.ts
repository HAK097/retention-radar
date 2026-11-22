import type { Logged, Placement } from "./types";

const KEY = "rr-logged-v1";

export function loadLogged(): Logged[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Logged[]) : [];
  } catch {
    return [];
  }
}

export function saveLogged(items: Logged[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(-50)));
  } catch {
    /* storage unavailable: the demo still works for this session */
  }
}

export function applyLogged(base: Placement[], logged: Logged[]): Placement[] {
  if (logged.length === 0) return base;
  return base.map((p) => {
    const mine = logged.filter((l) => l.placementId === p.id);
    if (mine.length === 0) return p;
    const last = mine[mine.length - 1];
    return {
      ...p,
      checkins: [...p.checkins, ...mine.map((l) => l.checkin)],
      next_action: last.next_action,
      draft_message: last.draft_message,
    };
  });
}
