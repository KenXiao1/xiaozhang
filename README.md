# Sunlit Chat

A private two-person chat app with sunlit-inspired visuals.

Built with Preact + Vite + Supabase. Supports Markdown, math (KaTeX), text annotations, and AI-generated message labeling.

## Features

- Real-time messaging via Supabase Realtime
- Markdown + LaTeX math rendering
- Text selection annotations with notes
- AI-generated message labeling
- Stream view (WeChat-style) and thread view (Gmail-style)
- Day/night toggle with sunlit light animation

## Stack

- Frontend: Preact + Vite
- Backend: Netlify Functions (JWT auth)
- Database: Supabase (PostgreSQL + Realtime)

## Setup

1. Create a Supabase project and run `supabase-schema.sql`
2. Copy `.env.example` to `.env` and fill in values
3. Generate password hashes: `echo -n "password" | sha256sum`
4. Set environment variables in Netlify dashboard
5. Deploy via Netlify (connect GitHub repo)

## Local dev

```bash
npm install
npm run dev
```

## Visual style

Light/shadow background adapted from [sunlit](https://www.sunlit.place/) by Chloe Yan.
