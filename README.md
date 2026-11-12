# PEMIRA — E-Voting

Sistem e-voting Pemilihan Raya Mahasiswa Teknik Telekomunikasi: bilik suara berantre,
surat suara rahasia, panel admin KPU, dan rekap hasil. Berbasis Next.js, Prisma, SQLite, NextAuth.

Port of [ArdeaHN/e-voting_website_laravel](https://github.com/ArdeaHN/e-voting_website_laravel)
tanpa bagian yang tidak aman dari sumbernya.

## Screenshots

| Login | Bilik suara |
|---|---|
| ![Halaman login](shots/01-login.png) | ![Bilik suara](shots/02-bilik-suara.png) |

| Dashboard admin | Kelola kandidat |
|---|---|
| ![Dashboard admin](shots/03-dashboard.png) | ![Daftar kandidat](shots/04-kandidat.png) |

| Tambah kandidat | Daftar pemilih |
|---|---|
| ![Form tambah kandidat](shots/05-tambah-kandidat.png) | ![Daftar pemilih](shots/06-pemilih.png) |

Tangkapan layar 1440×900 dari UI saat ini, tersimpan di `shots/`.

## Fitur inti

- **Surat suara rahasia**: tabel `Vote` tidak punya kolom identitas pemilih; `hasVoted` dicek atomik.
- **Antrean bilik suara**: FIFO, maks `MAX_ACTIVE_VOTERS` pemilih bersamaan, giliran 5 menit.
- **Sesi terkunci**: satu login aktif per akun (`sessionTag`), pemilih logout otomatis 60 detik setelah memilih.
- **Panel admin**: dashboard, DPT + impor CSV, paslon + visi/misi/CV, akun admin, jadwal & pengumuman.
- **Rekap hasil**: terkunci sampai pemungutan ditutup dan `announceAt` lewat.
- **Siap VPS kecil**: SQLite WAL, tanpa service database terpisah.

## Stack

`Next.js 15` · `Prisma 6` · `SQLite (WAL)` · `NextAuth (JWT)` · `SB Admin 2 / Bootstrap 4`

## Quick start

```bash
npm install
cp .env.example .env      # DATABASE_URL + AUTH_SECRET
npm run db:push           # creates prisma/pemira.db from prisma/schema.prisma (SQLite)
npm run db:seed           # RESET penuh: 2 admin, 12 pemilih, 3 paslon, 0 suara, jadwal hari ini 08:00–17:00
npm run dev               # http://localhost:3000
npm test                  # vote-integrity checks
```

Seeded logins: `admin1@gmail.com / adminkesatu`, voters `22101001@student.ac.id … / password`.

`db:seed` **menghapus semua** user, paslon, suara, sesi, dan jadwal lalu mengisi ulang dari awal
(termasuk reset autoincrement). Jangan jalankan di database produksi berisi suara sah.

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
| `POST /milihyuk` — no schedule check, no unique constraint, vote overwritable | `castVoteAction`: open-window check + atomic `UPDATE … WHERE hasVoted=false` claim (`lib/vote.js`) |
| Password `Hash::make` (bcrypt) | `scrypt` + `timingSafeEqual` (`lib/password.js`) |
| Session cookie, no single-session rule | JWT 60 min + `sessionTag` per login → new login revokes old session |
| Role guard by session key | `requireUser()` reads the user row on every request |
| Vote bursts with many voters logging in at once | DB-backed queue (`lib/queue.js`): max `MAX_ACTIVE_VOTERS` inside the booth, FIFO waiting room, 5-minute turn, forced logout when it expires |
| CSV import for DPT | `Import CSV` on `/dashboard/pemilih` (`NIM,Nama,Email,Password`) |
| candidate resume served from `storage/` | CV behind session (`/api/cv/[id]`), files in `uploads/cv/` |

UI memakai SB Admin 2 dari `public/template` + `public/assets` (Bootstrap 4, jQuery, Chart.js v2,
DataTables, FontAwesome) — tanpa Tailwind. Seluruh override desain ada di **satu** berkas
`public/app.css`. Vendor JS (DataTables) hanya dimuat di halaman admin; halaman pemilih memakai
komponen React + `<dialog>` native. Simplifikasi yang dipertahankan: tidak ada ekspor PDF/Excel, cukup CSV.

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

Semua token & kontrol bersama ada di satu berkas `public/app.css` (`:root`), dipakai halaman
pemilih maupun admin.

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
| `/` | login |
| `/milih` | voter ballot (2-step confirm) + antrean bilik suara (maks `MAX_ACTIVE_VOTERS` pemilih, batas 5 menit) |
| `/selesai` | konfirmasi suara tercatat; sesi pemilih logout otomatis 60 detik setelah `votedAt` (`lib/guard.js`) |
| `/keluar` | cancel queue / leave the booth without voting |
| `/waktu-habis` | the 5-minute turn expired, session was closed |
| `/hasil` | recap, locked until voting closes and `announceAt` passes |
| `/dashboard{,/pemilih,/kandidat,/jadwal,/admin}` | admin KPU |

Tautan eksternal di topbar pemilih: [Instagram HMTT](https://www.instagram.com/hmtt_telupwt/)
dan [BTE Telkom University Purwokerto](https://bte-pwt.telkomuniversity.ac.id/).

## Kontribusi & lisensi

Repo ini private untuk keperluan PEMIRA; belum ada lisensi publik ditetapkan. Untuk perubahan:
buat branch dari `main`, jalankan `npm test` (7 test integritas wajib lulus), lalu buka PR.
Jangan jalankan `npm run db:seed` pada database berisi suara sah.

