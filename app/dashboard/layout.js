import AdminLayout from "@/components/AdminLayout";
import AdminVendorScripts from "@/components/AdminVendorScripts";
import { requireUser } from "@/lib/guard";

export default async function DashboardLayout({ children }) {
  await requireUser("ADMIN");
  return (
    <AdminLayout>
      <AdminVendorScripts />
      {children}
    </AdminLayout>
  );
}
