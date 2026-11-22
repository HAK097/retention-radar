# Retention Radar (concept demo)

Reads 30/60/90-day check-in replies from candidates and clients, scores each placement for early-exit risk inside a 180-day replacement guarantee, and tells the consultant who to call first and what to say. **AI assists; the consultant decides.**

All data is fictional. Not affiliated with, or a product of, any real firm. Built for Prime HR Advisory as an interview concept.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
```

No key is needed. Without `GEMINI_API_KEY` (or if the call fails, times out, or returns invalid JSON) the app uses a deterministic rule-based scorer and shows a small "Demo mode" badge. It never shows an error to the viewer.

To enable live analysis (optional, Gemini free tier): copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.

## How it works

- `lib/scoring.ts`: placement risk is computed **in code**: 40% latest candidate reply, 25% latest client reply, 15% silence and slow replies, 20% worsening trend, then scaled by position in the guarantee window. The drawer shows every term.
- `app/api/analyze/route.ts`: optional Gemini call with strict JSON, validated with zod. Evidence quotes that are not exact substrings of the input are dropped. 800-character cap, 10 live calls per IP per hour (in-memory), then quietly demo mode.
- `lib/fallback.ts`: keyword/rule scorer used for demo mode.
- `lib/seed.json`: 12 fictional placements (generated, with every evidence quote verified as an exact substring). Newly logged check-ins live in `localStorage` only.
- No database, no analytics. `noindex` meta and `robots.txt` disallow.

## Checks

```bash
npm run lint && npx tsc --noEmit && npm run build
```

## Deploy (free)

Vercel Hobby plan, no card needed: `npx vercel --prod`. No environment variables are required.
