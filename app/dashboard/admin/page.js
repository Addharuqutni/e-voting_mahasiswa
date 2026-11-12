import AdminTable from "@/components/AdminTable";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { name: "asc" } });

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Admin</h1>
          <p>Kelola akun penyelenggara yang dapat mengakses panel ini.</p>
        </div>
        <span className="count-chip">{admins.length} akun</span>
      </header>

      <section className="data-card" aria-labelledby="admin-table-title">
        <div className="data-card-head">
          <h2 id="admin-table-title">Daftar data admin</h2>
        </div>
        <div className="data-card-body">
          <AdminTable admins={admins} />
        </div>
      </section>
    </>
  );
}
