# Cresvion Speech Link

Vite + React speech app. Auth and data: Supabase. Hosting: Vercel. Speech: Supabase Edge Functions + Gemini.

## Local

```bash
cp .env.example .env.local
# set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open `http://localhost:5173`.

Apply `supabase/schema.sql` once in the Supabase SQL Editor before signing up.

See `DEPLOY.md` for Vercel, Auth URLs, Storage bucket `speech-uploads`, and Edge Function secrets.
