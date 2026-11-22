# Retention Radar: demo script

All data is fictional. Concept built for Prime HR Advisory.

## 2-minute walkthrough

**0:00 – The problem (15s).** "You promise 30/60/90-day check-ins and a 6-month free replacement. A placement that quits inside that window costs you the fee and a consultant's time. The signal is usually in the check-in replies, but nobody has time to read every one closely."

**0:15 – First screen (20s).** Point at the headline and the KPI row. "12 active placements, 11 inside the guarantee, 3 at risk, and an illustrative AED figure at risk. That figure is a simple 15%-of-annual-pay estimate, labelled illustrative."

**0:35 – Call first (25s).** "The top card tells the consultant who to ring today. Layla Mansour: enthusiastic at day 30, a reporting-line change at day 60, then silence at day 90. Nothing dramatic in any single message, but the pattern is clear."

**1:00 – Open the brief (30s).** Click the card. Show: the evidence quotes next to each tag, the confidence, and "Why this score". "The score is calculated in code, not by the AI. Every term is visible, so a consultant can disagree with it." Scroll to the recommended action and the WhatsApp-style draft. Click Copy. "The consultant edits it and sends it. The tool never contacts anyone."

**1:30 – Log a check-in (20s).** Scroll to the form, click "Sample: quietly unhappy", Analyse. Watch the score animate. "Pasting a new reply re-scores the placement live. The small Demo mode badge shows this is the rule-based scorer; with a Gemini key it uses a live model, and falls back to this if anything fails."

**1:50 – Close (10s).** Open "What changes with real data". "Consent, UAE PDPL, and integrating with your ATS, WPForms, Calendly and WhatsApp Business API."

## 5 talking points

1. **Ties to your guarantee.** The 6-month free replacement is a real cost. Flagging the 3 placements out of 12 that need a call this week turns a reactive promise into proactive retention, and protects fee revenue.
2. **Human in the loop.** Every AI output is labelled, every flag has an evidence quote a person can check, and the tool only prioritises outreach. It makes no decision about a candidate.
3. **Data privacy.** Real use needs written opt-in from candidates and clients, minimal text storage with a retention limit, and review against UAE PDPL (Federal Decree-Law 45 of 2021) before any live data.
4. **Integration plan.** Phase 1: paste-in replies (what you see). Phase 2: pull replies from WPForms and WhatsApp Business API, book calls through Calendly, read placements from your ATS. Consultants stay in tools they already use.
5. **Measuring success.** Back-test on past placements (did early flags precede exits?), then track replacement rate inside 180 days, time from flag to call, and consultant hours saved. Success is fewer replacements, not more flags.

## 3 likely interviewer questions

**Q1. How accurate is it? Couldn't it just cry wolf?**
A. It's a prioritisation aid, not a prediction engine, and I haven't claimed an accuracy number: the data here is fictional. The honest next step is a back-test on your past placements to see how many early exits it would have flagged and how many false alarms it would have raised, then tune the thresholds with your consultants. Showing the evidence quote and score breakdown means a false alarm costs one phone call, not a decision.

**Q2. Isn't it risky to run candidate messages through AI?**
A. Yes if done carelessly, which is why it's designed around consent and minimisation: opt-in up front, no protected traits in the analysis, text limits, and a human reviewing every output. In production I'd run a PDPL review and choose hosting and a model provider deliberately. In this demo, nothing leaves the browser except the reply text sent to the scorer, and the default scorer is rule-based.

**Q3. Why not just have consultants read the replies?**
A. They should, and still do. The tool doesn't replace that; it tells them which ten replies to read first, and spots patterns across replies that are easy to miss, like replies getting shorter, slower, or going quiet. Consultant time is the scarce resource.
