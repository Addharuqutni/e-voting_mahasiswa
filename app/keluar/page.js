import { redirect } from "next/navigation";
import VoterLayout from "@/components/VoterLayout";
import StatusPanel from "@/components/StatusPanel";
import { getSessionUser } from "@/lib/guard";
import { leave } from "@/lib/booth.js";
import { logoutAction } from "@/app/actions";

export const dynamic = "force-dynamic";

// Membatalkan antrean / keluar dari bilik tanpa menandai suara.
export default async function KeluarPage({ searchParams }) {
  const params = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/");
  await leave(user.id);
  if (params?.done === "1") redirect("/");

  return (
    <VoterLayout>
      <StatusPanel
        icon="fas fa-door-open"
        title="Anda keluar dari antrean"
        actions={
          <>
            <a className="btn-pilih" href="/milih">Antre lagi</a>
            <form action={logoutAction}><button type="submit" className="btn-outline">Keluar akun</button></form>
          </>
        }
      >
        <p className="panel-sub">Pemilihan Raya Mahasiswa Teknik Telekomunikasi</p>
        <p>Posisi antrean dan slot bilik suara Anda sudah dilepas. Suara Anda belum tercatat.</p>
      </StatusPanel>
    </VoterLayout>
  );
}
