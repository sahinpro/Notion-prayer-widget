# Prayer Time Widget

A Notion-embeddable prayer times widget built with React, Vite, and Tailwind.

## Features

- Live prayer times via [Aladhan API](https://aladhan.com/prayer-times-api)
- Next prayer countdown with progress bar
- Location settings (country, city, madhab)
- Copy embed URL for Notion (`/embed` → paste URL)
- URL params: `?country=Bangladesh&city=Dhaka&madhab=Standard`

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Vercel auto-detects Vite — no extra config needed
4. Deploy

**Build settings** (also in `vercel.json`):

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 20+ |

After deploy, open your site and click **Embed** to copy the URL for Notion.

## Project structure

- `src/PrayerTimesWidget.jsx` — main widget
- `src/components/ui/` — shadcn-style UI components
- `design-system/MASTER.md` — typography and color tokens
