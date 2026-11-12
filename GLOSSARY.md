# PEMIRA

Bahasa bersama untuk sistem e-voting Pemilihan Raya Mahasiswa Teknik Telekomunikasi.

## Language

**Pemilih**:
Mahasiswa yang tercatat dalam daftar pemilih tetap dan berhak mengirim satu suara.
_Avoid_: user, voter, account

**Paslon**:
Pasangan calon ketua dan wakil ketua yang terdaftar dalam pemilihan.
_Avoid_: candidate, kandidat

**Bilik suara**:
Giliran terbatas yang diberikan kepada Pemilih untuk mengirim suara, dengan jumlah slot bersamaan dan batas waktu.
_Avoid_: session, antrean, queue

**Antrean**:
Urutan Pemilih yang menunggu mendapatkan Bilik suara.
_Avoid_: queue, waiting list

**Suara**:
Satu baris pilihan yang tercatat tanpa pengenal Pemilih.
_Avoid_: vote, ballot

**Status sesi**:
Keadaan satu login Pemilih: belum masuk, menunggu, berada di Bilik suara, sudah memilih, atau berakhir.
_Avoid_: session state, auth state

**Jadwal**:
Rentang waktu pemungutan suara dan waktu pengumuman hasil.
_Avoid_: setting, schedule
