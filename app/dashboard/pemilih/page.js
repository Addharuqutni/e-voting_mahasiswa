import VoterTable from "@/components/VoterTable";
import ActionForm from "@/components/ActionForm";
import Field from "@/components/Field";
import { importVotersCsv } from "@/app/actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function PemilihPage({ searchParams }) {
  const params = await searchParams;
  const search = String(params?.q ?? "").trim();
  const page = Math.max(1, Number(params?.page) || 1);

  const where = {
    role: "VOTER",
    ...(search
      ? { OR: [{ name: { contains: search } }, { nim: { contains: search } }, { email: { contains: search } }] }
      : {}),
  };

  const [total, voters] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalAll = await prisma.user.count({ where: { role: "VOTER" } });
  const voted = await prisma.user.count({ where: { role: "VOTER", hasVoted: true } });

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Pemilih</h1>
          <p>Kelola daftar pemilih tetap dan status penggunaan hak suara.</p>
        </div>
      </header>

      <section className="data-card" aria-labelledby="pemilih-table-title">
        <div className="data-card-head">
          <h2 id="pemilih-table-title">Daftar data pemilih</h2>
          <span className="count-chip">{totalAll} pemilih · {voted} sudah memilih</span>
        </div>
        <div className="data-card-body">
          <VoterTable users={voters} total={total} page={page} search={search} />
        </div>
      </section>

      <section className="panel-card" aria-labelledby="csv-title">
        <h2 id="csv-title">Impor DPT dari CSV</h2>
        <p className="panel-hint">Satu pemilih per baris dengan format NIM, Nama, Email, Password. Baris dengan NIM atau email yang sudah ada akan dilewati.</p>
        <ActionForm action={importVotersCsv} submit="Impor CSV" submitClass="btn-pilih">
          <Field label="File CSV" htmlFor="csvFile">
            <input id="csvFile" name="file" type="file" accept=".csv,text/csv" className="form-control" required />
          </Field>
        </ActionForm>
      </section>
    </>
  );
}
