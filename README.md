# Super Bowl Squares

Lightweight Super Bowl squares app with persistent storage (Cloudflare Pages + D1).

## Features
- 10x10 grid with initials (no numbers shown initially)
- Real-time locking using atomic updates
- Admin-only button to generate randomized numbers once all 100 squares are claimed
- Patriots on the X axis, Seahawks on the Y axis after generation

## Deploy (Cloudflare Pages + D1)
1. Create a D1 database in the Cloudflare dashboard (or via `wrangler d1 create`).
2. In `wrangler.toml`, set `database_id` to your D1 database ID.
3. In your Cloudflare Pages project, add a D1 binding named `DB` to that database.
4. Add an environment variable named `ADMIN_KEY` (your admin code).
5. Deploy the repo. The app auto-creates tables on first request.

## Admin flow
- Users claim squares with initials.
- Once all 100 squares are claimed, the admin enters the admin code and clicks **Generate numbers**.
- The app saves randomized digits for each axis and shows Patriots (X) and Seahawks (Y).

## Local dev (optional)
You can use Wrangler to run Pages locally if desired. Configure a D1 binding named `DB` and set `ADMIN_KEY`.
