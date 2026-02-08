# Super Bowl Squares

Lightweight Super Bowl squares app with persistent storage (Cloudflare Pages + D1).

## Features
- 10x10 grid with randomized Super Bowl axes (digits 0-9 on each side)
- Real-time locking using atomic updates
- Initials limited to 1-10 characters
- Auto-refresh every few seconds

## Deploy (Cloudflare Pages + D1)
1. Create a D1 database in the Cloudflare dashboard (or via `wrangler d1 create`).
2. In `wrangler.toml`, set `database_id` to your D1 database ID.
3. In your Cloudflare Pages project, add a D1 binding named `DB` to that database.
4. Deploy the repo. The app auto-creates tables on first request.

## Local dev (optional)
You can use Wrangler to run Pages locally if desired. Configure a D1 binding named `DB`.
