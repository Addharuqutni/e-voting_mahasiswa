# Product Requirement Document (PRD)
## Sistem E-Voting Pemilihan Raya Mahasiswa (PEMIRA)

---

### 1. Executive Summary
Sistem E-Voting Pemira adalah aplikasi web pemilihan umum berbasis suara elektronik untuk pemilihan ketua dan wakil ketua organisasi mahasiswa. Platform ini dirancang untuk menggantikan pemungutan suara fisik dengan menjamin prinsip **LUBER JURDIL** (Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil) serta mencegah manipulasi data dan double-voting.

---

### 2. User Roles & Personas

| Role | Tanggung Jawab | Hak Akses |
|---|---|---|
| **Voter (Mahasiswa)** | Menggunakan hak suara | Login, membaca profil paslon & CV, memilih 1 paslon, melihat status vote |
| **Admin (KPU Pemira)** | Mengelola jalannya pemilu | Kelola DPT (Import CSV), kelola data paslon, toggle jadwal pemungutan suara, audit log, rekapitulasi hasil |
| **Saksi / Observer** | Mengawasi transparansi | Melihat rekapitulasi suara (hanya saat window voting ditutup) |

---

### 3. Core Technical Architecture & Principles

#### 3.1 Asas Kerahasiaan Suara (Secret Ballot)
- Relasi database antara `User` (pemilih) dan `Vote` (kertas suara) sengaja diputus.
- Tabel `User` hanya mencatat `hasVoted: Boolean` dan `votedAt: Timestamp`.
- Tabel `Vote` hanya mencatat `candidateId` dan `createdAt: Timestamp`.
- Tidak ada foreign key atau trace token yang menghubungkan identitas pemilih ke pilihan kandidat.

#### 3.2 Integritas Transaksi (Atomic Transaction)
- Mutasi voting wajib berjalan di dalam transaksi atomik database (`SERIALIZABLE` / row-level lock).
- Memastikan tidak ada celah double-tab race condition untuk mengirim suara lebih dari satu kali.

---

### 3.3 Tech Stack (Rekomendasi Final)

Prinsip pemilihan: dependency minimal, attack surface kecil, dan jaminan integritas suara ditegakkan oleh database constraint, bukan oleh kode aplikasi.

| Layer | Pilihan | Alasan |
|---|---|---|
| Runtime | Node.js 24 LTS | TypeScript type-stripping aktif by default (Stability 2), tidak perlu bundler/tsc |
| HTTP Server |  | Cukup untuk 5 route; tanpa framework, tanpa build step |
| Database | SQLite (WAL mode) via  | Zero DB server, transaksi  sinkron, cocok untuk DPT skala fakultas |
| Schema Guard | , , ,  table | Anti double-vote ditegakkan di level DB, bukan flag aplikasi |
| Auth / Session | HMAC-SHA256 signed cookie () | Stateless, tanpa tabel session,  |
| Password Hashing |  (N=16384, salt 16B, keylen 64) | Built-in, diakui aman (memory-hard), tanpa dependency tambahan |
| Frontend | Static HTML + CSS + vanilla JS | Ballot card sederhana; tanpa React/hydration overhead |
| Testing |  +  | Built-in test runner (Stability 2), zero framework |
| Deployment | Single VPS / container + reverse proxy (Caddy/Nginx) untuk TLS | Satu proses, satu file DB, backup via  |

**Total dependency produksi: 1 ().**

#### Catatan Pemilihan  vs Dokumentasi resmi Node.js v24 menandai modul  sebagai **Stability 1.2 (Release Candidate)** — belum direkomendasikan untuk produksi karena API masih bisa berubah tanpa semver guarantee. Data suara tidak boleh bergantung pada API yang belum stabil, sehingga driver eksternal dipilih.  tetap dipakai di unit test agar CI berjalan tanpa dependency native.

#### Alternatif yang Ditolak

| Alternatif | Alasan Ditolak |
|---|---|
| Next.js + Prisma + PostgreSQL + NextAuth | 4 layer + DB server + ORM + session store untuk beban puncak < 1.000 voter; overkill dan memperbesar attack surface |
| Google Forms | Tidak menjamin secret ballot, tidak ada kontrol jadwal, tidak bisa audit DPT |
| Firebase / Supabase | Data pemilih keluar dari kendali kampus; pricing dan vendor lock-in |
| Blockchain / smart contract | Kompleksitas operasional jauh melebihi kebutuhan audit satu organisasi mahasiswa |

---

#### 3.3 Tech Stack (Revisi - Menggantikan Next.js / Prisma / PostgreSQL)

Prinsip: satu dependency, tanpa build step, tanpa DB server, tanpa ORM, tanpa session store.

| Layer | Pilihan | Alasan |
|---|---|---|
| Runtime | Node.js 24 LTS | TypeScript type-stripping native (Stability 2), `node:test` bawaan |
| HTTP Server | `node:http` | 5 endpoint tidak butuh Express/Fastify |
| Database | SQLite + `better-sqlite3` | Satu file, transaksi sinkron `BEGIN IMMEDIATE`, nol server |
| Auth | HMAC-signed cookie (`node:crypto`) | Stateless, tanpa tabel session |
| Password | `scryptSync` + `timingSafeEqual` | Stdlib; menggantikan bcrypt/argon2id |
| Frontend | HTML statis + CSS + JS minimal | Tanpa React/Next, tanpa build step |
| Test | `node:test` + `node:assert` | Runnable check untuk transaksi vote |

**Total: 1 dependency (`better-sqlite3`), 0 build step.**

**Keputusan driver SQLite.** `node:sqlite` masih Stability 1.2 (Release Candidate) di Node v24 dan docs resmi menyatakan belum direkomendasikan untuk production. Data suara tidak boleh bergantung pada API yang masih bisa breaking, sehingga `better-sqlite3` (v12, stabil) dipakai. Alternatif 0-dependency tetap tersedia bila tim menerima risiko tersebut; seluruh SQL identik, hanya import driver yang berubah.

**Konfigurasi SQLite wajib.** `journal_mode = WAL`, `synchronous = FULL` (default WAL `NORMAL` punya risiko kehilangan commit saat crash), `foreign_keys = ON`, `busy_timeout = 5000`.

**Yang dibuang dari rancangan awal.** Next.js App Router, Prisma ORM, PostgreSQL, dan NextAuth adalah 4 layer tambahan yang tidak menambah jaminan integritas di atas `CHECK`, `FOREIGN KEY`, dan `BEGIN IMMEDIATE`.

---

### 4. System Specifications & User Flow

```
[ Voter ] -> Login (NIM / Email Kampus)
               |
               v
        [ Cek Status ]
        |-- hasVoted == true  --> Redirect: Halaman "Suara Sudah Digunakan"
        |-- hasVoted == false --> Masuk: Halaman Bilik Suara (/milih)
                                    |
                                    v
                             Pilih Paslon -> Modal Konfirmasi (2-Step)
                                    |
                                    v
                             Submit Vote (Atomic Lock)
                                    |
                                    v
                             Halaman Sukses & Auto Logout
```

---

### 5. Detailed Feature Requirements

#### 5.1 Autentikasi & Akun
- **FR-AUTH-01**: Login voter menggunakan Email Institusi Kampus / NIM dan Password/Token unik.
- **FR-AUTH-02**: Session management berbasis JWT (stateless) atau server session dengan durasi pendek (30-60 menit).
- **FR-AUTH-03**: Single Active Session per user guna menghindari akun dipakai bersamaan di device berbeda.

#### 5.2 Bilik Suara (Ballot Page)
- **FR-VOTE-01**: Tampilan banner identitas pemilihan, logo himpunan/universitas, dan info voter.
- **FR-VOTE-02**: Grid kartu paslon yang menampilkan:
  - Nomor urut
  - Foto resmi paslon
  - Nama lengkap Ketua & Wakil Ketua
  - Blok Visi & Misi
  - Handle media sosial (Instagram)
  - Tombol **Lihat CV** (membuka modal PDF viewer)
  - Tombol aksi **PILIH**
- **FR-VOTE-03**: Modal konfirmasi sebelum submit suara: *"Apakah Anda yakin memilih Paslon No. X [Nama Paslon]?"*.
- **FR-VOTE-04**: Handling voting ditutup: Voter tidak dapat mengirim suara di luar jadwal `isVotingOpen == true`.

#### 5.3 Panel Administrasi (Admin KPU)
- **FR-ADM-01**: Manajemen DPT (Daftar Pemilih Tetap):
  - Import massal via file CSV (NIM, Nama, Email, Password/Token).
  - Search, filter, dan monitoring status pemilih (`Belum Memilih` vs `Sudah Memilih`).
- **FR-ADM-02**: Manajemen Kandidat:
  - Input & update paslon (nomor urut, nama, foto, visi, misi, link CV, sosmed).
- **FR-ADM-03**: Kontrol Periode Pemilihan:
  - Master switch `isVotingOpen` (buka / tutup pemilihan manual atau by timestamp).
- **FR-ADM-04**: Rekapitulasi & Hasil:
  - Visualisasi grafik perolehan suara.
  - Perhitungan persentase partisipasi pemilih (turnout rate).
  - Fitur export laporan resmi (PDF / Excel).

---

### 6. Data Model (Entity-Relationship)

```
+--------------------+           +--------------------+
|       User         |           |     Candidate      |
+--------------------+           +--------------------+
| id (PK)            |           | id (PK)            |
| nim (Unique)       |           | orderNumber (Unique|
| name               |           | leaderName         |
| email (Unique)     |           | viceName           |
| passwordHash       |           | vision             |
| role (VOTER/ADMIN) |           | mission            |
| hasVoted (Boolean) |           | photoUrl           |
| votedAt (DateTime) |           | cvUrl              |
+--------------------+           | instagram          |
                                 +--------------------+
                                           | 1
                                           |
                                           | N
                                 +--------------------+
                                 |       Vote         |
                                 +--------------------+
                                 | id (PK)            |
                                 | candidateId (FK)   |
                                 | createdAt          |
                                 +--------------------+

+--------------------+
|   SystemSetting    |
+--------------------+
| id (PK)            |
| isVotingOpen (Bool)|
| startTime          |
| endTime            |
+--------------------+
```

---

### 7. Tech Stack & Arsitektur Deployment

#### 7.1 Ringkasan Stack

| Layer | Pilihan | Justifikasi |
|---|---|---|
| Runtime | Node.js 24 LTS | Dukungan native untuk TypeScript type-stripping (Stability 2), HTTP server, crypto, dan test runner dalam satu binary |
| HTTP server | `node:http` | Tidak butuh framework untuk 5 endpoint; permukaan serangan minimal dan tidak ada middleware pihak ketiga |
| Database | SQLite (file `pemira.db`) | ACID, single-writer lock alami; beban Pemira (ribuan voter dalam jam yang sama) jauh di bawah kapasitas SQLite |
| Driver DB | `better-sqlite3` (satu-satunya dependency) | API sinkron + `transaction.immediate()` memetakan langsung ke `BEGIN IMMEDIATE`; lebih matang untuk transaksi kritis dibanding `node:sqlite` yang masih **Stability 1.2 (Release Candidate)** |
| Hash & Session | `node:crypto` (`scryptSync`, `timingSafeEqual`, `createHmac`, `randomBytes`) | Satu modul menutup hashing password dan cookie session bertanda tangan HMAC; tidak perlu library JWT |
| UI | HTML + CSS statis yang di-render server | Tanpa build step, tanpa bundler, tanpa hydration; halaman ballot pada dasarnya form teks |
| Test | `node:test` + `node:assert/strict` | Test runner bawaan Node, tidak ada Jest/Vitest |

Total dependency produksi: **1** (`better-sqlite3`).

```bash
# Instalasi dependency
# Justifikasi: better-sqlite3 satu-satunya dependency karena node:sqlite masih Release Candidate,
# sementara transaksi suara tidak boleh bergantung pada API yang bisa berubah antar versi minor.
npm init -y && npm i better-sqlite3
```

#### 7.2 Keputusan Arsitektur & Alternatif yang Ditolak

| Keputusan | Alternatif | Alasan ditolak |
|---|---|---|
| `node:http` | Next.js / Express | Next.js + Prisma + PostgreSQL + NextAuth = 4 layer + DB server + session store untuk satu halaman login dan satu halaman ballot |
| SQLite | PostgreSQL | Tidak ada kebutuhan multi-node; WAL cukup untuk concurrency spikes. SQLite mempermudah backup: cukup salin file setelah checkpoint |
| `node:crypto` | bcrypt, argon2, jsonwebtoken | scrypt adalah KDF kuat yang tersedia di stdlib; menghindari 3 dependency dengan fungsi setara |
| Cookie HMAC stateless | NextAuth / session store | Cukup beberapa baris, tanpa tabel session server-side dan tanpa round-trip DB di setiap request |
| HTML/CSS render server | React SPA | Tidak ada state kompleks; modal CV dan konfirmasi cukup `<dialog>` native |

#### 7.3 Diagram Deployment

```
                    HTTPS
[ Browser ] --------------------> [ Nginx / Caddy ]  (TLS, rate-limit /api/*, static cache)
                                          |
                                          v
                                   [ node:http app ]  (Node 24, port 3000)
                                          |
                                +---------+---------+
                                |                   |
                        [ pemira.db (WAL) ]   [ storage/cv/*.pdf ]
```

- Satu proses Node, satu file DB. Restart proses aman karena state hanya di disk.
- TLS terminasi di reverse proxy; cookie memakai flag `Secure` dan `SameSite=Strict`.
- Backup: `sqlite3 pemira.db "VACUUM INTO 'backup-$(date +%F).db'"` secara berkala dan sebelum penutupan voting.

#### 7.4 Struktur Repositori

```
pemira/
├── PRD.md
├── schema.sql            # STRICT tables, CHECK constraint, WAL pragma
├── vote.test.mjs         # self-check transaksi voting (node:test)
├── server/
│   ├── db.ts             # koneksi + pragma + transaksi castVote
│   ├── auth.ts           # scrypt hash, HMAC cookie, guard
│   └── routes.ts         # login, ballot, vote, selesai, admin
├── views/                # template HTML (login, bilik-suara, selesai, admin)
├── public/               # CSS, logo, foto paslon
└── storage/cv/           # PDF CV kandidat
```

#### 7.5 Catatan Keamanan Operasional

- `SESSION_SECRET` (32 byte hex) wajib dari environment variable, bukan hardcoded; proses gagal start bila kosong.
- Enable `PRAGMA synchronous = FULL` untuk tabel suara; default WAL `NORMAL` punya potensi kehilangan tulisan terakhir saat mati listrik.
- Endpoint `/api/vote` menolak request dengan `Origin` tidak cocok dengan `BASE_URL` (CSRF defense terpisah dari cookie).
- File CV dibuka lewat endpoint yang memvalidasi session; jangan mengekspos path `storage/` langsung ke web root.

#### 7.6 Status Verifikasi

| Item | Status |
|---|---|
| Transaksi voting (`BEGIN IMMEDIATE` + one-vote-per-user + rollback) | Terverifikasi lokal lewat `vote.test.mjs` (1 pass) |
| API `node:sqlite` / `better-sqlite3` / `node:crypto` | Diverifikasi terhadap dokumentasi Node v24 dan better-sqlite3 via Context7 |
| Server HTTP, UI ballot, panel admin | Belum diimplementasikan |

---

### 7. Rancangan Tech Stack

#### 7.1 Ringkasan Keputusan

| Layer | Pilihan | Alasan | Alternatif yang Ditolak |
|---|---|---|---|
| Runtime | **Node.js 24 LTS** (v24.13.1 terverifikasi di mesin dev) | Stdlib sudah memuat http, crypto, sqlite, test runner, dan type-stripping TS bawaan | Node 20 (tanpa type-stripping stabil), Deno/Bun (ekosistem deployment kampus lebih rumit) |
| HTTP | **`node:http`** | Nol framework, nol build step; kebutuhan hanya 6 endpoint | Express/Fastify (tambah layer tanpa manfaat nyata di skala DPT fakultas), Next.js (SSR + bundler untuk halaman statis) |
| Database | **SQLite + `better-sqlite3`** | Satu file, backup = copy file, sinkron + `BEGIN IMMEDIATE` tanpa race condition | PostgreSQL (butuh DB server, koneksi pool, ops terpisah), `node:sqlite` (lihat 7.4) |
| Password | **`scrypt` via `node:crypto`** | KDF memory-hard, parameter sama-sama kuat dengan argon2id, sudah built-in | `bcrypt`/`argon2id` (dependensi native tambahan) |
| Session | **HMAC-signed cookie** (`createHmac` + `timingSafeEqual`) | Stateless, cukup 30 menit, tidak butuh session store | NextAuth/database session (tabel + cleanup job) |
| Frontend | **HTML + CSS server-rendered, JS minimal** | Halaman hanya butuh kartu paslon, modal konfirmasi, dan form | React/Next.js (hidrasi + bundling untuk dua layar), Tailwind (tambahan toolchain untuk CSS < 200 baris) |
| Testing | **`node:test`** | Built-in, tanpa framework | Jest/Vitest |
| Reverse proxy & TLS | **Caddy** | Sertifikat otomatis, ~5 baris config | Nginx + certbot |

Total dependensi runtime: **1** (`better-sqlite3`). Nol build step, nol ORM, nol session store, nol DB server.

#### 7.2 Justifikasi Dependensi

Satu-satunya justifikasi dependency wajib: **`better-sqlite3`** — driver SQLite sinkron yang transaksinya stabil, karena `node:sqlite` di docs Node v24.13.1 masih berstatus *Stability 1.2 - Release Candidate* (docs sendiri menyatakan eksperimental tidak direkomendasikan untuk produksi), sedangkan transaksi suara tidak boleh bergantung pada API yang bisa breaking.

```bash
npm i better-sqlite3
```

#### 7.3 Keamanan per Lapisan

- **Autentikasi**: password disimpan sebagai `saltHex:scryptHex`; verifikasi dengan `timingSafeEqual` (constant-time).
- **Session**: cookie `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800` berisi payload `nim.exp` + HMAC-SHA256. `SESSION_SECRET` wajib 32 byte hex dan akan fail-fast jika salah.
- **CSRF**: `SameSite=Strict` **dan** validasi header `Origin` terhadap `BASE_URL` pada endpoint mutasi (defense in depth).
- **XSS**: seluruh output HTML di-escape; tidak ada `innerHTML` dari data kandidat.
- **SQL Injection**: hanya prepared statement, tanpa string concatenation.
- **Integritas suara**: jaminan one-vote-one-account berada di constraint database (`has_voted ... CHECK (has_voted IN (0,1))`, `UPDATE ... WHERE has_voted = 0` + cek `changes === 1`), bukan flag di aplikasi.
- **Kerahasiaan suara**: tabel `votes` tidak menyimpan `user_id`, tidak ada FK ke `users`, sehingga relasi pemilih -> pilihan tidak dapat direkonstruksi.

#### 7.4 Catatan `node:sqlite` (jalur nol-dependensi)

Alternatif yang lebih ringan lagi: buang `better-sqlite3`, pakai `node:sqlite` sehingga total dependency = 0. Konsekuensinya API berstatus Release Candidate dan ada peringatan eksperimental saat runtime. SQL dan semantik transaksinya identik, jadi migrasi bolak-balik hanya mengganti import driver. Keputusan final diserahkan ke Bos sebelum implementasi.

#### 7.5 Model Eksekusi & Kapasitas

- **Single instance, single writer**: SQLite WAL + `synchronous = FULL` (default better-sqlite3 adalah `NORMAL` yang berisiko kehilangan data saat power loss) + `BEGIN IMMEDIATE` sehingga penulisan diserialisasi oleh database, bukan oleh kode aplikasi.
- **Beban realistis**: DPT fakultas (ribuan pemilih) selesai dalam beberapa detik saat jam sibuk; SQLite menangani ribuan transaksi suara per detik pada satu node.
- **Deployment**: satu VPS, Caddy sebagai reverse proxy, `sqlite3 .backup` terjadwal tiap 5 menit selama window voting, sistemd service dengan `Restart=always`.
- **Batas arsitektur**: hanya satu proses server (bukan cluster). Jika perlu > 1 instance atau load balancer, wajib migrasi ke PostgreSQL.

#### 7.6 Status Verifikasi

- **Sudah diuji**: transaksi voting (`BEGIN IMMEDIATE`, tolak double-vote, rollback tanpa orphan ballot, `PRAGMA integrity_check`) lulus 1/1 pada Node v24.13.1 lewat `node --test`.
- **Belum diuji**: server HTTP, UI, hash/session, dan beban konkurensi nyata.
- **Cara verifikasi**: `node --test vote.test.mjs` pada repo yang sama.

---

### 8. Non-Functional Requirements (NFR)

- **Security**:
  - Proteksi terhadap CSRF, XSS, dan SQL Injection.
  - Rate limiting pada endpoint login dan voting (in-memory per NIM; pindah ke reverse proxy saat multi-instance).
  - Password wajib di-hash dengan `crypto.scrypt` (built-in Node.js), salt unik minimal 16 byte per user, perbandingan via `crypto.timingSafeEqual`.
- **Reliability & Concurrency**:
  - Mampu menangani beban puncak saat jam sibuk pemilihan (concurrency spikes).
  - Transaksi database wajib ACID compliant (SQLite `BEGIN IMMEDIATE` + `journal_mode=WAL` + `synchronous=FULL`).
- **Accessibility & Responsiveness**:
  - Tampilan wajib responsif (Mobile-first & Desktop).
  - Kontras warna memadai dan tata letak jelas untuk meminimalisir kesalahan klik.

---

### 9. Out of Scope (Tahap Awal)
- Pemilihan multipartai bertingkat (hanya single ballot ketua-wakil).
- Integrasi biometrik/face recognition (cukup kredensial email/NIM).
- Integrasi blockchain publik (cukup ACID database dengan split table audit).


---

### 9. Tech Stack Design

#### 9.1 Keputusan Stack (Final)

| Layer | Pilihan | Alasan |
|---|---|---|
| Runtime | **Node.js 24 LTS** | Type-stripping stabil (Stability 2), tersedia di mesin target |
| HTTP Server | **`node:http`** | Tanpa framework; 4 route (`/login`, `/milih`, `/api/vote`, `/admin`) tidak butuh router |
| Database | **SQLite** (file, WAL mode) | Single-writer, ACID, tanpa server. Beban Pemira = ratusan voter, bukan ratusan ribu |
| DB Driver | **`better-sqlite3`** (satu-satunya dependency) | `node:sqlite` masih Stability 1.2 / Release Candidate per docs Node v24; transaksi suara tidak boleh bergantung pada API yang bisa berubah |
| Auth | **HMAC-signed cookie** (`node:crypto`) | Session stateless, tanpa session store / tanpa NextAuth |
| Password | **`crypto.scryptSync`** + `timingSafeEqual` | Stdlib; setara bcrypt secara desain (memory-hard), nol dependency |
| Frontend | **HTML + CSS statis**, vanilla JS minimal | 2 halaman + panel admin; tidak ada build step |
| Testing | **`node:test`** + `node:assert` | Built-in, Stability 2 |

**Total dependency produksi: 1 (`better-sqlite3`). Build step: 0. Server DB: 0.**

#### 9.2 Alasan Stack Ini Ringan

- Seluruh kebutuhan Pemira (login, satu ballot, satu insert suara, rekap) tercakup stdlib Node.
- SQLite memberi jaminan **ACID** dan **`BEGIN IMMEDIATE`** (single-writer lock) — memenuhi kebutuhan anti-double-vote tanpa orkestrasi DB.
- Tidak ada ORM (Prisma) → tidak ada lapisan yang bisa menghasilkan query salah, tidak ada migration runtime, tidak ada schema drift.
- Tidak ada framework UI → tidak ada hydration, bundler, atau `node_modules` 300MB untuk dua halaman.

#### 9.3 Alasan Stack Ini Secure

- **Anti double-vote di level database**: `UPDATE ... WHERE has_voted = 0` + cek `changes === 1` di dalam `BEGIN IMMEDIATE`. Bukan flag di aplikasi.
- **Secret ballot secara struktural**: tabel `votes` tidak punya kolom `user_id`, sehingga tidak mungkin di-join balik ke pemilih.
- **Password**: scrypt + `timingSafeEqual` (constant-time).
- **Session**: cookie `HttpOnly; Secure; SameSite=Strict`, payload ditandatangani HMAC-SHA256, divalidasi constant-time.
- **CSRF**: kombinasi `SameSite=Strict` + validasi header `Origin`.
- **SQL Injection**: 100% prepared statement.
- **Permukaan serangan minimal**: 1 dependency (native, teraudit luas), 0 ORM, 0 framework. Tidak ada `node_modules` transitif untuk dipatch tiap minggu.

#### 9.4 Stack yang Ditolak (dan Kenapa)

| Alternatif | Alasan Ditolak |
|---|---|
| Next.js + Prisma + PostgreSQL + NextAuth | 4 lapisan + DB server + session store untuk beban <1.000 voter. Overkill berat |
| `node:sqlite` saja (0 dependency) | Paling ringan, tapi Stability 1.2 → risiko breaking change di tengah periode pemilihan. Layak hanya jika Pemira bersifat internal & sekali pakai |
| Google Forms / Google Sheets | Paling murah, tapi tidak bisa menjamin satu suara per NIM, tidak auditabel, hasil bisa diedit admin. Tidak memenuhi asas LUBER JURDIL |
| Express / Fastify | Router + middleware untuk 4 route; stdlib sudah cukup |

#### 9.5 Deployment

- **Host**: VPS kecil (1 vCPU / 1 GB RAM) atau platform free-tier yang mendukung long-running process (bukan serverless — SQLite butuh persistent disk).
- **Proses**: `node server.ts` di balik reverse proxy (Caddy/Nginx) untuk TLS otomatis dan rate-limit per IP.
- **File DB**: `pemira.db` pada disk persisten + backup snapshot (`sqlite3 .backup`) tiap 15 menit selama periode pemungutan.
- **Env wajib**: `SESSION_SECRET` (32 byte hex) dan `BASE_URL` (dipakai untuk validasi `Origin`).

---

### 9. Deployment & Operasional

- **Topologi**: satu proses Node di belakang reverse proxy TLS (Caddy/Nginx). SQLite tidak butuh container DB.
- **Backup**: salin file `.db` + `-wal` secara periodik, atau `VACUUM INTO 'backup.db'` (aman saat live).
- **Rate limiting**: in-memory per NIM pada endpoint login dan vote.
  - Batasan: hanya valid untuk satu instance proses. Multi-instance butuh store bersama (Redis) atau rate limit di reverse proxy.
- **Risiko yang diterima**: seekor proses tunggal = single point of failure; downtime singkat berarti pause pemungutan suara, bukan kehilangan suara.

---

### 9. Recommended Tech Stack

**Constraint**: satu fakultas, DPT ribuan, beban puncak hanya di jam voting. Prinsip: jumlah komponen minimum; semua jaminan integritas (one-vote, secret ballot) ditegakkan di database, bukan di kode aplikasi.

#### 9.1 Stack Final

| Layer | Pilihan | Alasan |
|---|---|---|
| Runtime | Node.js 24 LTS | `node:test`, `node:crypto`, dan type-stripping TypeScript sudah built-in |
| HTTP server | `node:http` + router ~30 baris | Satu proses, tanpa framework; `express` hanya jika tim butuh ekosistem middleware |
| Database | SQLite (WAL) via `better-sqlite3` | Serverless, ACID; `BEGIN IMMEDIATE` memberi lock single-writer yang menjamin one-vote |
| Password hashing | `crypto.scryptSync` (stdlib) | Memory-hard KDF, 0 dependency |
| Session | HMAC-SHA256 signed cookie (`HttpOnly; Secure; SameSite=Strict`) | Stateless, tanpa session store |
| CSRF | Origin header check + `SameSite=Strict` | 2 baris, tanpa token store |
| Frontend | HTML + CSS statis, JS vanilla minimal | 0 build step; UI referensi (login card, ballot card) tidak butuh framework |
| Testing | `node:test` + `node:assert/strict` | Built-in |
| TLS / Reverse proxy | Caddy (auto HTTPS/Let's Encrypt) | 1 baris Caddyfile |
| Hosting | 1 VPS 2 vCPU / 2 GB | Cukup untuk ribuan voter; tidak perlu orchestration |

**Total dependency produksi: 1 (`better-sqlite3`).**

#### 9.2 Alternatif yang Ditolak

| Ditolak | Alasan |
|---|---|
| Next.js + Prisma + PostgreSQL + NextAuth | 4 layer + DB server + migration tooling untuk aplikasi dengan 3 endpoint (`login`, `vote`, `hasil`). Overkill. |
| `node:sqlite` (stdlib) | Stability 1.2 / Release Candidate di Node 24 — belum direkomendasikan untuk produksi; integritas suara tidak boleh bergantung pada API yang masih bisa berubah |
| MongoDB / Firebase | Tidak ada transaksi yang setara `BEGIN IMMEDIATE` untuk jaminan one-vote; vendor lock-in |
| Redis session store | Session HMAC stateless sudah memadai; menambah 1 service untuk 0 kebutuhan |

#### 9.3 Catatan Terhadap Section 7 (NFR)

- NFR menyebut `bcrypt`/`argon2id`; implementasi aktual memakai `scrypt` (`N=16384, r=8, p=1, maxmem=64MB`, salt 16 byte acak per user). Kelas keamanan setara, tanpa dependency tambahan — tabel di 9.1 yang berlaku.
- `PRAGMA synchronous = FULL` wajib; default WAL `NORMAL` berisiko kehilangan commit terakhir saat power loss.

#### 9.4 Verifikasi

Transaksi `BEGIN IMMEDIATE` + constraint `has_voted` + rollback saat double-vote sudah diuji lewat `node --test vote.test.mjs` → 1 pass / 0 fail (Node v24.13.1).
