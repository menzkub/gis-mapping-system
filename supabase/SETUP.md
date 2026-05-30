# PEA Meter & TR Search — Supabase Setup

## 1. Create a Supabase project

1. Go to https://supabase.com and create a free account
2. Click **New project** → choose a region close to Thailand (Singapore `ap-southeast-1`)
3. Wait ~2 minutes for the project to provision

## 2. Get your API keys

Dashboard → **Settings → API**

Copy:
- **Project URL** → looks like `https://abcxyz.supabase.co`
- **anon / public key** → long JWT string

## 3. Run the schema

Dashboard → **SQL Editor** → paste contents of `schema.sql` → **Run**

This creates tables: `profiles`, `meters`, `transformers`, `audit_log`, plus RLS policies and triggers.

## 4. Run the seed data

Dashboard → **SQL Editor** → paste contents of `seed.sql` → **Run**

This inserts 2,500 meter rows and 1,357 transformer rows.

Verify: `SELECT count(*) FROM meters;` → 2500  
`SELECT count(*) FROM transformers;` → 1357

## 5. Configure the app

Open `project/config.js` and replace the placeholder values:

```js
const SUPABASE_URL  = "https://YOUR_PROJECT_ID.supabase.co";  // ← your URL
const SUPABASE_ANON = "YOUR_ANON_KEY";                         // ← your anon key
```

## 6. Disable email confirmation (for internal tool)

Dashboard → **Authentication → Email** → turn off **Enable email confirmations**

This lets users sign up without clicking a confirmation link.

## 7. Create the first admin user

1. Open the app in a browser
2. Click **สมัครสมาชิก** and sign up with your email and password
3. Go to Supabase Dashboard → **Table Editor → profiles**
4. Find your row and set `role = 'admin'` and `status = 'active'`
5. Reload the app and log in

All future users who sign up will appear as `status = 'pending'`.  
As admin, go to **Admin → ผู้ใช้งาน** to approve them.

## 8. Deploy (optional)

The app is a static HTML file — host it anywhere:

- **Netlify / Vercel**: drag-and-drop the `project/` folder
- **GitHub Pages**: push to a repo and enable Pages
- **Local network**: run `python3 -m http.server 8080` inside `project/`

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | Tables, RLS policies, triggers — run once |
| `seed.sql` | 3,857 rows of meter/transformer data — run once |
| `seed.py` | Script that generated `seed.sql` from the CSVs |
| `../project/config.js` | Supabase client + row mappers — **edit URL and key here** |
