# Deployment & hardening — PEMIRA (VPS 2 vCPU / 2–8 GB, SQLite)

Semua yang dibutuhkan ada di dokumen ini; tidak ada folder `deploy/` terpisah.
Database: **SQLite** (`prisma/pemira.db`) — tanpa service, tanpa port, ±40 MB RAM.

## 0. Checklist sebelum deploy

```bash
npm ci
npm run db:push      # SQLite: prisma/pemira.db (wajib sebelum start)
npm run db:seed      # HANYA sekali saat setup — menghapus semua data & suara!
npm run build
npm test             # 7 test: integritas suara + bilik suara + status sesi
curl -fsS http://127.0.0.1:3000/api/health
```

Variabel lingkungan di server (file `.env`):

```
DATABASE_URL="file:./pemira.db"
AUTH_SECRET="<32 byte acak: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">"
MAX_ACTIVE_VOTERS=100
LOGIN_LIMIT_PER_IP=200          # longgar: banyak mahasiswa di satu IP (NAT kampus)
LOGIN_LIMIT_PER_ACCOUNT=8      # ketat per akun
```

## 1. Menjalankan aplikasi

**Opsi A — systemd (disarankan)**

```ini
# /etc/systemd/system/pemira.service
[Unit]
Description=PEMIRA (Next.js)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pemira
WorkingDirectory=/srv/pemira
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=NODE_OPTIONS=--max-old-space-size=512
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3000
Restart=always
RestartSec=3
KillSignal=SIGTERM
TimeoutStopSec=20
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

```bash
cp pemira.service /etc/systemd/system/     # file di atas
systemctl daemon-reload && systemctl enable --now pemira
curl -fsS http://127.0.0.1:3000/api/health
```

**Opsi B — standalone (RAM paling hemat)**

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cd .next/standalone && NODE_ENV=production PORT=3000 HOSTNAME=127.0.0.1 \
  NODE_OPTIONS=--max-old-space-size=512 node server.js
```

**Opsi C — pm2** (1 worker; SQLite menulis tunggal, jadi 1 worker sudah cukup)

```js
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: "pemira",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3000",
    cwd: "/srv/pemira",
    instances: 1,
    exec_mode: "cluster",
    env: { NODE_ENV: "production", PORT: "3000", NODE_OPTIONS: "--max-old-space-size=512" },
    max_memory_restart: "600M",
    kill_timeout: 10000,
  }],
};
```

```bash
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```

## 2. Reverse proxy (Nginx)

```nginx
limit_req_zone $binary_remote_addr zone=pemira_login:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=pemira_api:10m rate=30r/s;

upstream pemira_app { server 127.0.0.1:3000; keepalive 32; }

server {
    listen 80;
    server_name pemira.example.id;
    client_max_body_size 6m;              # foto/CV maks 5MB
    gzip on; gzip_vary on; gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location /api/auth/ {
        limit_req zone=pemira_login burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://pemira_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /api/ {
        limit_req zone=pemira_api burst=60 nodelay;
        limit_req_status 429;
        proxy_pass http://pemira_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /_next/static/ {
        proxy_pass http://pemira_app;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location / {
        proxy_pass http://pemira_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }
}
```

```bash
# certbot --nginx -d pemira.example.id && nginx -t && systemctl reload nginx
```

## 3. Backup (SQLite, tanpa downtime)

```bash
#!/usr/bin/env bash
# /usr/local/bin/pemira-backup.sh
set -euo pipefail
DEST="${1:-/var/backups/pemira}"
APP_DIR="${APP_DIR:-/srv/pemira}"
STAMP="$(date +%F-%H%M)"
mkdir -p "$DEST"
sqlite3 "$APP_DIR/prisma/pemira.db" ".backup '$DEST/pemira-$STAMP.db'"
sqlite3 "$DEST/pemira-$STAMP.db" "PRAGMA wal_checkpoint(TRUNCATE);" || true
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$APP_DIR" uploads
find "$DEST" -type f -mtime +14 -delete
```

```bash
chmod +x /usr/local/bin/pemira-backup.sh
# crontab -e  →  17 2 * * * /usr/local/bin/pemira-backup.sh
```

## 4. Antrean bilik suara

- `MAX_ACTIVE_VOTERS=100` = berapa pemilih boleh berada di bilik suara sekaligus; sisanya menunggu (FIFO, posisi + estimasi, refresh otomatis tiap 5 detik).
- Setiap giliran punya batas **5 menit** (`BOOTH_MINUTES` di `lib/session.js`). Lewat batas → `sessionTag` dicabut (sesi logout), slot dilepas, Ajax berikutnya otomatis naik ke bilik.
- State antrean tersimpan di tabel `User` (`queueJoinedAt`, `voteAdmittedAt`, `voteDeadline`) → restart VPS tidak menghapus antrean.
- Naikkan `MAX_ACTIVE_VOTERS` hanya kalau CPU masih lega.
- Setelah suara tercatat, sesi pemilih hidup **1 menit** agar konfirmasi sempat dibaca, lalu logout otomatis
  (`VOTE_GRACE_SECONDS` di `lib/session.js`). Batas ini ditegakkan di server, jadi aman walau tab ditutup.

## 5. Monitoring

- `GET /api/health` → `{ status, db, dbLatencyMs, uptimeSec, rssMb }` (503 bila DB mati).
- Pasang Uptime Kuma/Better Stack ke `/api/health` (interval 30 detik).
- `journalctl -u pemira -f` untuk log; rotasi lewat journald (`SystemMaxUse=200M`).
- Swap 1 GB advisable di VPS 2 GB (`fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`).

## 6. Database

SQLite dengan pengaturan otomatis di `lib/db.js`:

| Pragma | Nilai | Fungsi |
|---|---|---|
| `journal_mode` | WAL | pembaca tidak diblokir penulis |
| `synchronous` | FULL | suara terakhir tetap aman saat listrik padam |
| `foreign_keys` | ON | relasi Vote → Candidate ditegakkan di DB |
| `busy_timeout` | 5000 ms | tulis berbarisan menunggu, bukan gagal |
| `cache_size` | 64 MB | query lebih cepat di RAM |
| `mmap_size` | 256 MB | baca file tanpa copy |
| `journal_size_limit` | 64 MB | file WAL tidak membengkak |

Jalur tulis suara (`lib/booth.js`) **tidak** memakai transaksi interaktif: klaim `hasVoted` dilakukan satu
statement atomik (`UPDATE … WHERE hasVoted = 0`), lalu baris ballot disimpan terpisah → tidak ada
`SQLITE_BUSY` saat banyak pemilih memilih bersamaan (terukur 289 suara/detik, p95 101 ms).

Berkas penting: `prisma/pemira.db`, folder `uploads/`, dan `.env`.

## 7. Beban konkurensi (angka terukur, build produksi)

| Yang diukur | Kapasitas |
|---|---|
| Login (scrypt N=16384, async) | ~24–78 login/detik per core |
| Tulis suara (SQLite) | **289 suara/detik** |
| Render halaman SSR | 80–125 req/detik (8 thread lokal) ≈ 25–40 req/detik di 2 vCPU |
| Query DB | 180–316/detik |

Untuk <500 pemilih: 1 worker lebih dari cukup (500 orang / 1 jam = 0,14 suara/detik).

## 8. Aset, dependensi, dan header

- Aset statis dipangkas: `public/template` 19 MB → 824 KB (14 file yang dipakai). Logo dikompresi (WebP 8–37 KB), favicon `app/icon.png` 128px (19 KB).
- Font Nunito self-hosted (`public/fonts/nunito-latin.woff2`, 39 KB) + preload → tanpa request ke Google Fonts.
- CSS aplikasi satu berkas (`public/app.css`, ~56 KB). jQuery + Bootstrap (171 KB) hanya di halaman admin; halaman pemilih memakai `components/UserMenu.jsx` + `<dialog>` native. Chart.js `lazyOnload`, DataTables berantai (jQuery → Bootstrap → core → integrasi).
- `Cache-Control`: `/fonts` 1 tahun immutable, `/assets` & `/template` 7 hari + stale-while-revalidate.
- Header keamanan aktif: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`.
- `next` di-pin **15.5.29** (patched untuk advisory RSC/DoS & request smuggling). Advisory tersisa yang diterima: `postcss` (build-time), `sharp` (tidak dipakai — `images.unoptimized`), `prisma` CLI (devDependency).
- `output: "standalone"` → bundle produksi ±71 MB.

Hasil pengukuran (build produksi, 1440×900):

| Halaman | Requests | TTFB | FCP | DCL |
|---|---|---|---|---|
| `/` (login) | 23 → **16** | 35 → 19 ms | 164 → **112 ms** | 88 → 71 ms |
| `/milih` | 23 → **16** | 77 → **32 ms** | 256 → **136 ms** | 231 → 82 ms |
| `/hasil` | 29 → **22** | 33 → 31 ms | 152 → 136 ms | 82 → 81 ms |
| `/dashboard` | 23 → **16** | 39 → 42 ms | 120 → 152 ms | 84 → 97 ms |
| `/dashboard/pemilih` | 23 → **16** | 75 → **39 ms** | 188 → **136 ms** | 131 → 78 ms |

Sisa bobot terbesar: `sb-admin-2.min.css` (167 KB) + FontAwesome (58 KB) — render-blocking, tapi ter-cache 7 hari.

## 9. Skala ke depan

1. <10.000 pemilih: 1 VPS 2 vCPU + SQLite sudah cukup.
2. 2 instance: Nginx `upstream` 2 node + pindahkan rate limiter ke Redis (sekarang in-memory per proses).
3. Database terpisah: `prisma/schema.postgres.prisma` tersedia — `npx prisma generate --schema prisma/schema.postgres.prisma` + `prisma db push --schema prisma/schema.postgres.prisma`, lalu set `DATABASE_URL` ke Postgres (`?connection_limit=8&connect_timeout=10&pool_timeout=20&socket_timeout=30`) dan tune `postgresql.conf` (`shared_buffers=1GB`, `effective_cache_size=4GB`, `max_connections=100`).

## 10. Pengaman yang sudah terpasang di aplikasi

| Ancaman | Proteksi | Lokasi |
|---|---|---|
| Brute force login | 8 percobaan/akun per 5 menit, 200 percobaan/IP per 15 menit | `lib/rateLimit.js`, `app/actions.js` |
| Enumerasi akun | pesan error generik | `loginAction` |
| Crash tak tertangani | boundary halaman + global | `app/error.js`, `app/global-error.js` |
| App mati | systemd `Restart=always` + health probe | systemd unit di atas, `app/api/health/route.js` |
| Sesi tertinggal di bilik | `sessionTag` dicabut saat batas 5 menit habis | `lib/session.js`, `lib/booth.js` |
| Sesi pemilih yang sudah memilih | `sessionTag` dicabut 60 detik setelah `votedAt`; `/selesai` menampilkan hitung mundur lalu logout | `lib/session.js`, `lib/booth.js`, `components/VoteSessionTimer.jsx` |
| Slowloris / request menahan sumber daya | `limit_req` + timeout proxy | Nginx di atas |
| Tulis suara ganda | klaim atomik satu statement + kompensasi | `lib/booth.js` |
