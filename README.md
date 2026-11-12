# PEMIRA — E-Voting (Next.js + Prisma + SQLite + NextAuth)

Port of [ArdeaHN/e-voting_website_laravel](https://github.com/ArdeaHN/e-voting_website_laravel).
Same features (admin panel: dashboard, DPT, paslon, admin accounts, countdown/jadwal; voter: ballot + result)
minus the insecure parts of the source.

## Run

```bash
npm install
cp .env.example .env      # DATABASE_URL + AUTH_SECRET
npm run db:push           # creates prisma/pemira.db from prisma/schema.prisma (SQLite)
npm run db:seed           # 2 admins, 12 voters, 3 paslon, voting open today 08:00–17:00
npm run dev               # http://localhost:3000
npm test                  # vote-integrity checks
```

Seeded logins: `admin1@gmail.com / adminkesatu`, voters `22101001@student.ac.id … / password`.

Database: **SQLite** (`prisma/pemira.db`) is the default — no service to install, no port, ~15–40 MB RAM,
enough for a few thousand voters on one small VPS. `lib/db.js` sets `journal_mode=WAL`,
`synchronous=FULL`, and `foreign_keys=ON` at startup, so a vote is never lost on a power cut and
readers are never blocked by a writer.

The PostgreSQL variant is kept in `prisma/schema.postgres.prisma`
(`npx prisma generate --schema prisma/schema.postgres.prisma` +
`prisma db push --schema prisma/schema.postgres.prisma`) if you later want a managed database.

Note: if `DATABASE_URL` is exported in your shell it overrides `.env` — Prisma and Next.js both prefer
the process environment. Keep them in sync, or unset the shell variable.

## What was fixed vs. the Laravel original

| Laravel | Here |
|---|---|
| `users.choice` = candidate id → voter is linkable to their choice | `Vote` table has **no** user column (secret ballot); `User.hasVoted/votedAt` only |
| `candidate.total_voter` counter, updated by an observer (race-prone, drifts) | `Vote` rows, counted with `groupBy` |
| `POST /milihyuk` — no schedule check, no unique constraint, vote overwritable | `castVoteAction`: open-window check + `UPDATE … WHERE hasVoted=false` claim inside a transaction |
| Password `Hash::make` (bcrypt) | `scrypt` + `timingSafeEqual` (`lib/password.js`) |
| Session cookie, no single-session rule | JWT 60 min + `sessionTag` per login → new login revokes old session |
| Role guard by session key | `requireUser()` reads the user row on every request |
| Vote bursts with many voters logging in at once | DB-backed queue (`lib/queue.js`): max `MAX_ACTIVE_VOTERS` inside the booth, FIFO waiting room, 5-minute turn, forced logout when it expires |
| CSV import for DPT | `Import CSV` on `/dashboard/pemilih` (`NIM,Nama,Email,Password`) |
| candidate resume served from `storage/` | CV behind session (`/api/cv/[id]`), files in `uploads/cv/` |

UI is the original repo's SB Admin 2 theme, copied from `public/template` and `public/assets`
(Bootstrap 4, jQuery, Chart.js v2, DataTables, FontAwesome) — no Tailwind, no CSS rewrite.
Simplication kept: no PDF/Excel export, CSV only.

## Deploy cepat (VPS)

```bash
npm ci && npm run db:push && npm run build
npm start                          # atau jalankan .next/standalone/server.js
curl -fsS http://127.0.0.1:3000/api/health
```

Detail (systemd, Nginx, tuning Postgres/SQLite, backup, monitoring, header keamanan, versi
dependensi) ada di `DEPLOY.md`.

### Test (dev)

```bash
npm test                  # 7 test integritas suara + antrean (WAJIB ada di repo)
```

Folder `test/` berisi `vote.test.mjs` (satu suara per pemilih, kerahasiaan ballot, hashing) dan
`queue.test.mjs` (antrean, batas 5 menit, logout paksa) — keduanya wajib ada, bukan artifact.

## Design system

Semua token & kontrol bersama ada di `public/pemira-ui.css` (dipakai halaman pemilih) dan
`public/admin-ui.css` (khusus admin); keduanya memakai variabel yang sama dari `:root`.

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--ui-brand` | #3b5bdb | aksen, tombol utama, link |
| `--ui-ink` / `--ui-ink-soft` | #1b2333 / #59637a | teks utama & sekunder |
| `--ui-line` / `--ui-surface-2` | #e4e7ef / #f8fafd | border & permukaan tabel |
| `--ui-radius` / `--ui-radius-sm` | 16px / 10px | kartu & kontrol |
| `--ui-control-h` | 44px | tinggi tombol, input, tombol ikon (38px di desktop, 44px di layar sentuh) |
| `--ui-danger` / `--ui-success` / `--ui-warning` | #b91c1c / #0f7a52 / #8a5a00 | status & aksi berbahaya |

Aturan yang dijaga: kontras teks ≥4.5:1, fokus keyboard selalu terlihat (cincin 3px brand),
target sentuh ≥44px di `pointer: coarse`, tanpa emoji sebagai ikon (FontAwesome), tanpa scrollbar
horizontal di 375–1440px, dan `prefers-reduced-motion` mematikan animasi.

## Routes

| Path | Who |
|---|---|
| `/` | login + public paslon list |
| `/milih` | voter ballot (2-step confirm) + antrean bilik suara (maks `MAX_ACTIVE_VOTERS` pemilih, batas 5 menit) |
| `/selesai` | post-vote page (session is signed out by the vote action) |
| `/keluar` | cancel queue / leave the booth without voting |
| `/waktu-habis` | the 5-minute turn expired, session was closed |
| `/hasil` | recap, locked until voting closes and `announceAt` passes |
| `/dashboard{,/pemilih,/kandidat,/jadwal,/admin}` | admin KPU |
