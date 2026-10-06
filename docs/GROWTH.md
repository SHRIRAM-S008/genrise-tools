# GenRise Growth Playbook

The code side of the growth engine is in this repo (`/forms/*`, `/alternatives/*`,
tool prefills, analytics, newsletter backend). This doc covers what code can't do:
distribution, indexing ops, and the KPIs that tell you if it's working.

## Required environment variables

Set these in `.env.local` for dev and in the Vercel/hosting dashboard for prod:

| Var | Purpose | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_GA_ID` | GA4 pageviews + tool funnel events | analytics.google.com → Admin → Data streams |
| `SUPABASE_URL` | Newsletter signup storage | `https://dmtjuzekkkmsfutleevh.supabase.co` |
| `SUPABASE_ANON_KEY` | Newsletter insert (RLS: insert-only) | Supabase dashboard → API keys |
| `GOOGLE_SITE_VERIFICATION` | Search Console verification | Already wired in `layout.tsx` |
| `NEXT_PUBLIC_ADSENSE_ID` | Overrides the AdSense client | Optional — `ca-pub-7586690529424741` is baked into `layout.tsx` + `ad-slot.tsx` |
| `NEXT_PUBLIC_ADSENSE_SLOT` | Slot ID for the sidebar `AdSlot` units | AdSense dashboard → Ads → Ad units (after approval) |

The Supabase project `genrise-tools` (region ap-south-1) is already provisioned with
the `newsletter_signups` table. Ask Devin or check your Supabase dashboard for the anon key.

Without the env vars the site works identically — analytics, ads, and remote newsletter
storage simply stay off.

## Week 1 — Indexing ops

- [ ] Verify Search Console (set `GOOGLE_SITE_VERIFICATION`, submit `sitemap.xml`)
- [ ] Confirm Bing Webmaster is still verified (`BingSiteAuth.xml` already shipped)
- [ ] Check indexing coverage weekly: `site:tools.genrisetech.in` and GSC Pages report
- [ ] Watch GA4 funnel: `tool_view → file_dropped → result_download`. The drop-off
      between view and download is where UX work pays off.

## Distribution checklist (do once)

- [ ] **Product Hunt** — launch as "57 free tools, zero uploads". Ship on Tue/Wed.
      The on-device privacy angle is the headline; India application-form tools are the demo.
- [ ] **AlternativeTo** — list GenRise as an alternative to iLovePDF, TinyPNG, remove.bg
      (the `/alternatives/*` pages are the landing links)
- [ ] **SaaSHub, Toolify, TinyLaunch, Peerlist, DevHunt** — free tool directories
- [ ] **GitHub README** — the repo is public; make it a proper showcase (screenshots,
      the "no server" pitch). Stars → domain authority → rankings.

## The exam-season loop (recurring — this is the wedge)

Search volume for "photo size for X form" spikes hard during application windows.
The `/forms/*` pages are built to catch exactly this.

- [ ] Keep a calendar of application windows: SSC (CGL ~June, CHSL ~May, GD ~Nov),
      UPSC (Feb prelims), NEET (Feb–Mar), JEE (Nov/Jan sessions), IBPS (Jul–Sep),
      RRB (varies). Publish/refresh spec pages 4–6 weeks before windows open.
- [ ] During windows, answer questions where they happen: r/UPSC, r/SSC_JE,
      Quora ("What is the photo size for SSC CGL?"), exam Telegram groups,
      YouTube comments on exam-prep channels. Link the matching `/forms/*` page —
      it genuinely answers the question, which is what makes this not spam.
- [ ] Add a spec page whenever a new exam trends — it's a data entry in
      `src/lib/formSpecs.ts`, not a code change.

## Spec data accuracy (critical)

Every entry in `formSpecs.ts` has `verifiedFor`. Requirements change each cycle —
a wrong KB limit burns the audience this whole strategy is built on.

- [ ] Before each application window, re-verify specs against the current official
      notification and bump `verifiedFor`.
- [ ] Monitor `hello@genrisetech.in` — the pages invite corrections.
- [ ] The disclaimer box on every `/forms/*` page is intentional; keep it.

## Monetization sequence

1. **AdSense verification**: `ads.txt` has the real publisher line, the
   `google-adsense-account` meta tag is in every page's `<head>`, and the
   adsbygoogle loader ships site-wide. Auto ads can start as soon as the site
   is approved — no code change needed.
2. **Ad units**: `AdSlot` renders a real ad when a slot ID is set — either the
   `adSlot` prop or the `NEXT_PUBLIC_ADSENSE_SLOT` env var. Add inline units on
   `/forms/*` and `/alternatives/*` pages (below the spec table, never inside a
   tool's working area).
3. **Affiliate**: exam-prep affiliate programs (Testbook, Unacademy partners) on
   `/forms/*` pages are high-intent — swap into `AdSlot` or inline cards later.
4. **Newsletter**: signups now land in `newsletter_signups`. Export to
   Buttondown/Kit free tier for a weekly "new tools" digest; sponsorship slots are
   sellable once you pass ~5k subs.

## KPIs to watch

- GSC: impressions + CTR for `/forms/*` queries (expect lag of 4–8 weeks)
- GA4: `result_download` rate per tool, `newsletter_signup`, PWA installs
- RPM once ads are live — exam-season spikes will dwarf baseline
- Newsletter growth → owned audience that survives algorithm changes

## What not to do

- Don't chase head terms ("compress image") in copy — iLovePDF/TinyPNG own them.
  The winnable surface is long-tail and form-specific.
- Don't let `/forms/*` pages go thin — the spec table + steps + FAQ is the minimum
  that ranks. Copy-paste doorway pages get ignored or penalized.
- Don't add tracking that touches file contents/names — that breaks the one claim
  the whole brand stands on.
