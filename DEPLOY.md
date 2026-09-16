# Deploy Cresvion Speech Link (Vercel + Supabase)

SPA: Vite + React Router. Build: `npm run build` (Vite). Output: `dist`.

## CODE (before first deploy)

- [ ] No `@base44` packages
- [ ] No `base44Client` / `base44.entities` / `base44.auth` / `media.base44`
- [ ] One `src/api/supabaseClient.js`
- [ ] Façades exist for profiles, api_keys, usage_records, app_settings, announcements
- [ ] AuthContext shape: `user.id`, `user.email`, `user.role`, `logout`, `refreshUser`
- [ ] Uploads use bucket `speech-uploads` (optional; dashboard can send base64)
- [ ] `supabase/schema.sql` matches façades
- [ ] `vercel.json` SPA rewrites
- [ ] `.env.example` only; no secrets in git
- [ ] Lockfile does not pin Base44

## GITHUB

- [ ] Empty repo, source only, no `node_modules`
- [ ] `main` contains `package.json`, `index.html`, `src/`, `supabase/schema.sql`, `vercel.json`

## SUPABASE

- [ ] Run `supabase/schema.sql` **ONCE** in the SQL Editor
- [ ] If you must re-run: reset the project or drop objects — do not blindly replay `CREATE TABLE`
- [ ] Auth URL allow-list: production Vercel URL + `http://localhost:5173`
- [ ] Providers: Email + Google (same as the original app)
- [ ] OAuth callback: `https://<project>.supabase.co/auth/v1/callback`
- [ ] Create public Storage bucket `speech-uploads`
- [ ] Storage policies: public read; authenticated upload under `{user_id}/...` (see comments in schema.sql)
- [ ] Realtime not required (no subscribe call sites)
- [ ] Copy Project URL + anon key into Vercel as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Service role key never in Vite
- [ ] Deploy Edge Functions: `stt`, `tts`, `pipeline`, `provider-status`
- [ ] Function secrets: `GEMINI_API_KEY` (required). Optional: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AUTH_TOKEN`
- [ ] Confirm `profiles` row on first signup (`handle_new_user`)
- [ ] Promote an admin: `update public.profiles set role = 'admin' where email = '...';`
- [ ] Old Base44 rows are not imported by schema.sql

## VERCEL

- [ ] Import the GitHub repo
- [ ] Framework: Vite; build `vite build`; output `dist`
- [ ] Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Redeploy after adding env (Vite inlines at build time)
- [ ] Add the production domain to the Supabase Auth allow-list

## SMOKE TEST

- [ ] Register / login / logout / refresh stays logged in
- [ ] Password reset returns to the Vercel URL (`/reset-password`)
- [ ] Google OAuth if enabled
- [ ] Dashboard loads quotas
- [ ] Create / revoke an API key (raw key shown once)
- [ ] STT / TTS / pipeline work when Gemini is configured
- [ ] User A cannot edit user B’s profile/keys
- [ ] Deep links do not 404
- [ ] Language switcher EN/ES stays in sync with Settings

## OPTIONAL

- [ ] Scheduled function or pg_cron for `purgeUsageRecords` (`0 2 * * *` Europe/Paris)
- [ ] Data import from an old Base44 export (separate from schema.sql)
