import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password.js";

const prisma = new PrismaClient();
const hash = (p) => hashPassword(p);

const voters = [
  ["22101001", "Anisa Putri"], ["22101002", "Bagus Saputra"], ["22101003", "Citra Lestari"],
  ["22101004", "Dimas Aryo"], ["22101005", "Eka Wulandari"], ["22101006", "Fajar Nugroho"],
  ["22101007", "Gita Permata"], ["22101008", "Hendra Wijaya"], ["22101009", "Intan Maharani"],
  ["22101010", "Joko Susilo"], ["22101011", "Kirana Dewi"], ["22101012", "Lukman Hakim"],
];

const candidates = [
  { electionNumber: 1, leaderName: "Arya Pradana", viceName: "Nadia Kusuma", instagram: "aryanadia.pemira",
    vision: "Himpunan yang terbuka, responsif, dan berpihak pada kebutuhan mahasiswa.",
    mission: "Transparansi laporan keuangan dan program kerja setiap bulan.\nLayanan advokasi akademik dengan respons maksimal 2x24 jam.\nPusat pengembangan karier dan informasi beasiswa terpadu." },
  { electionNumber: 2, leaderName: "Bagas Wirawan", viceName: "Salsabila Rahma", instagram: "bagassalsa",
    vision: "Kemandirian ekonomi mahasiswa lewat kolaborasi lintas departemen.",
    mission: "Inkubator usaha mahasiswa dengan pendampingan alumni.\nPelatihan literasi finansial dan digital tiap semester.\nKolaborasi riset dan kompetisi antar fakultas." },
  { electionNumber: 3, leaderName: "Rizky Hidayat", viceName: "Talita Anjani", instagram: "rizky.talita",
    vision: "Budaya organisasi yang inklusif, suportif, dan bebas perundungan.",
    mission: "Satuan tugas anti-perundungan dengan kanal laporan anonim.\nRuang kreatif dan komunitas minat bakat di tiap departemen.\nProgram mentoring kakak-adik angkatan." },
];

const now = new Date();
const start = new Date(now); start.setHours(8, 0, 0, 0);
const end = new Date(now); end.setHours(17, 0, 0, 0);

// Reset penuh supaya seeder idempoten: tidak ada sisa suara/sesi/jadwal dari percobaan.
// Urutan penting: Vote -> Candidate -> User -> SystemSetting (Vote punya FK ke Candidate).
await prisma.$transaction([
  prisma.vote.deleteMany(),
  prisma.candidate.deleteMany(),
  prisma.user.deleteMany(),
  prisma.systemSetting.deleteMany(),
  prisma.user.createMany({
    data: [
      { name: "Admin 1", email: "admin1@gmail.com", passwordHash: await hash("adminkesatu"), role: "ADMIN" },
      { name: "Admin 2", email: "admin2@gmail.com", passwordHash: await hash("adminkedua"), role: "ADMIN" },
      ...await Promise.all(voters.map(async ([nim, name]) => ({
        nim, name, email: `${nim}@student.ac.id`, passwordHash: await hash("password"), role: "VOTER",
      }))),
    ],
  }),
  prisma.candidate.createMany({ data: candidates }),
  prisma.systemSetting.create({
    data: { id: 1, isVotingOpen: true, startTime: start, endTime: end, announceAt: end },
  }),
]);

// SQLite autoincrement ikut direset supaya ID mulai dari 1 lagi.
// TRUNCATE checkpoint WAL dulu, kalau tidak halaman lama mengembalikan counter.
await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence");
await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");

console.log("seeded: 2 admin, 12 voters, 3 candidates, 0 votes, jadwal hari ini 08:00–17:00");
await prisma.$disconnect();
