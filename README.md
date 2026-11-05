# UD Asturiana

Website for UD Asturiana, a futsal club in Belgium: fixtures and results, standings, the squad and a contact form. I also designed the club's visual identity (logo, colours, art direction).

Live: **[udasturiana.be](https://udasturiana.be)**

## Features

- Home page with the next match, latest results and standings
- Matches, standings with charts, team and player pages
- Players managed by the club in a Strapi back office
- Contact form validated with Zod and sent with Resend
- Light and dark themes, responsive layout
- SEO: per-page metadata, sitemap, robots and JSON-LD

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand, React Hook Form, Zod, Recharts, Strapi, Resend

## Deployment

The site was first self-hosted on a VPS: a GitHub Actions workflow connects over SSH, builds with pnpm and restarts the app with PM2 behind Nginx. It now runs on Vercel.

## Run locally

```bash
pnpm install
pnpm dev
```

Set `NEXT_PUBLIC_STRAPI_API_URL`, `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env.local`.
