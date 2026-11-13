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
    vision: "Mewujudkan HMTT sebagai himpunan yang terbuka, responsif, dan berpihak pada kebutuhan mahasiswa Teknik Telekomunikasi — dengan tata kelola yang transparan, layanan akademik yang cepat, dan ruang tumbuh yang setara bagi seluruh angkatan.",
    mission: "Menerbitkan laporan keuangan dan capaian program kerja setiap bulan melalui kanal resmi himpunan, lengkap dengan rincian anggaran dan realisasinya.\nMenyediakan layanan advokasi akademik dengan jaminan respons maksimal 2x24 jam, termasuk pendampingan sengketa nilai dan pengurusan cuti.\nMembangun pusat informasi karier dan beasiswa yang terpadu, memperbarui peluang magang dan beasiswa setiap minggu.\nMenggelar forum terbuka setiap semester agar mahasiswa dapat menyampaikan masukan langsung kepada pengurus tanpa perantara.\nMenghadirkan program pendampingan akademik kakak-adik angkatan untuk mata kuliah dengan tingkat kelulusan rendah.\nBekerja sama dengan laboratorium dan dosen untuk membuka akses praktikum tambahan bagi mahasiswa yang membutuhkan." },
  { electionNumber: 2, leaderName: "Bagas Wirawan", viceName: "Salsabila Rahma", instagram: "bagassalsa",
    vision: "Mendorong kemandirian ekonomi mahasiswa Teknik Telekomunikasi melalui kolaborasi lintas departemen, penguatan usaha berbasis keahlian, dan akses modal yang sehat bagi seluruh angkatan.",
    mission: "Membuka inkubator usaha mahasiswa dengan pendampingan alumni dan mitra industri selama satu semester penuh.\nMenyelenggarakan pelatihan literasi finansial dan pemasaran digital setiap semester, terbuka untuk seluruh angkatan.\nMemfasilitasi kolaborasi riset dan kompetisi antar fakultas dengan pendanaan awal bagi tim yang lolos seleksi.\nMembangun katalog jasa dan produk mahasiswa sebagai kanal promosi resmi himpunan.\nMenegosiasikan harga khusus perangkat dan langganan perangkat lunak bagi mahasiswa melalui kerja sama vendor.\nMengadakan bursa kerja dan temu mitra setiap tahun untuk mempertemukan mahasiswa dengan perusahaan telekomunikasi." },
  { electionNumber: 3, leaderName: "Rizky Hidayat", viceName: "Talita Anjani", instagram: "rizky.talita",
    vision: "Membangun budaya organisasi yang inklusif, suportif, dan bebas perundungan, serta memastikan setiap mahasiswa merasa aman dan dihargai di lingkungan himpunan.",
    mission: "Membentuk satuan tugas anti-perundungan dengan kanal pelaporan anonim dan prosedur penanganan yang jelas.\nMenyediakan ruang kreatif dan komunitas minat bakat di setiap departemen, lengkap dengan jadwal penggunaan yang adil.\nMenjalankan program mentoring kakak-adik angkatan dengan kurikulum adaptasi kampus yang terstruktur.\nMengadakan sesi konseling rutin bersama psikolog kampus setiap dua minggu sekali, tanpa biaya.\nMenyusun kode etik organisasi bersama seluruh pengurus dan mensosialisasikannya di awal kepengurusan.\nMemastikan setiap kegiatan himpunan dapat diakses mahasiswa dengan kebutuhan khusus, termasuk akomodasi lokasi dan materi." },
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
