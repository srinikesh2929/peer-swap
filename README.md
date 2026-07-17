# Peer Skill-Swap Board — Setup Guide

Plain HTML/CSS/JS, no build step, no backend server to write. Three pages:
`index.html` (sign up), `browse.html` (find + request mentors), `dashboard.html`
(accept/decline requests, rate completed sessions).

## Time budget (fits in ~3–3.5h)

| Step | Time |
|---|---|
| Supabase project + run schema | 15 min |
| EmailJS account + template | 15 min |
| Fill in `app.js` CONFIG | 2 min |
| Rename college, test the full flow with 2 browser profiles | 40–60 min |
| Tweak copy / colors if you want | 20–30 min |
| Deploy to Cloudflare Pages / Netlify | 10 min |
| Buffer | 30–45 min |

---

## 1. Supabase (free) — your shared database

1. Go to supabase.com → New project (free tier).
2. Open the **SQL Editor** and run this once:

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role text not null check (role in ('teach','learn','both')),
  skills_teach text[] default '{}',
  skills_learn text[] default '{}',
  free_time text[] default '{}',
  vacancy int default 3,
  video_url text,
  rating_avg numeric default 0,
  rating_count int default 0,
  created_at timestamptz default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid references profiles(id) on delete cascade,
  learner_id uuid references profiles(id) on delete cascade,
  skill text not null,
  message text,
  status text default 'pending' check (status in ('pending','accepted','declined','completed')),
  created_at timestamptz default now()
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid references profiles(id) on delete cascade,
  learner_id uuid references profiles(id) on delete cascade,
  request_id uuid references requests(id) on delete set null,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- Class-project scope: allow the anon key to read/write directly.
-- (For anything beyond a class project, replace these with real
-- per-user policies backed by Supabase Auth.)
alter table profiles enable row level security;
alter table requests enable row level security;
alter table ratings enable row level security;

create policy "anon full access profiles" on profiles for all using (true) with check (true);
create policy "anon full access requests" on requests for all using (true) with check (true);
create policy "anon full access ratings" on ratings for all using (true) with check (true);
```

3. Go to **Project Settings → API** and copy:
   - `Project URL` → `CONFIG.SUPABASE_URL` in `app.js`
   - `anon public` key → `CONFIG.SUPABASE_ANON_KEY` in `app.js`

**Security note:** the "anon full access" policies mean anyone with your public
URL can read/write the tables directly — fine for a class demo, not for
production. If you want it locked to your campus, the fastest upgrade is
Supabase Auth with an email-domain check (e.g. only `@college.edu` addresses
can sign in) — ask me if you want that added.

---

## 2. EmailJS (free, 200 emails/month) — mentor notifications

1. Go to emailjs.com → sign up → **Email Services** → connect your Gmail (or any inbox).
2. **Email Templates** → new template. Use these variables (match the names used in `app.js`):
   - Subject: `New skill-swap request: {{skill}}`
   - Body:
     ```
     Hi {{mentor_name}},

     {{learner_name}} ({{learner_email}}) wants to learn {{skill}} from you
     on the {{college_name}} Skill-Swap Board.

     Their free time: {{free_time}}

     Reply to this email or check your dashboard to accept or decline.
     ```
   - Set the template's "To email" field to `{{to_email}}`.
3. Copy your **Public Key** (Account page), **Service ID**, and **Template ID**
   into `CONFIG` in `app.js`.

---

## 3. Sample class videos

Upload to YouTube as **Unlisted** (not Private — Private links won't embed).
Paste the link in the "Sample class video" field during sign-up. No cost, no
storage limits to worry about.

---

## 4. Deploy

Easiest free option — no git required:
1. Go to **app.netlify.com/drop**
2. Drag the whole project folder in.
3. You get a live URL instantly. Share it with your class.

(Cloudflare Pages or GitHub Pages work the same way if you'd rather use those.)

---

## How matching works

- On sign-up, each student picks free-time slots (Weekday Mornings/Afternoons/
  Evenings, Weekends) and lists skills to teach/learn.
- `browse.html` fetches all mentors and flags a card **★ Recommended** when
  the mentor teaches a skill you want to learn **and** you share a free-time
  slot — pure client-side filtering against the shared Supabase table, no
  server needed.
- **Vacancy** is enforced live: a mentor's "spots open" = `vacancy` minus the
  count of their `requests` rows with `status = 'accepted'`. Once full, the
  Request button disables itself.
- Sending a request inserts a row in `requests` (starts `pending`) and fires
  an EmailJS email to the mentor in the same click — mentors accept/decline
  from `dashboard.html`.
- After a mentor marks a session `completed`, the learner can leave a 1–5
  star rating, which recalculates the mentor's average right on the profile.

## Known corners cut for the time budget (mention these if asked in a demo/viva)

- Identity is a cookie pointing at a Supabase row, not real auth — a student
  could clear cookies and re-register. Fine for a prototype; Supabase Auth
  with a college-email restriction is the natural next step.
- No pagination — fine for a class-sized mentor list, would need it at scale.
- Rating average is recalculated client-side rather than via a DB trigger;
  a Postgres trigger would be the more "correct" version if you have spare time.
