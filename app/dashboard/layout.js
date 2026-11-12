import AdminLayout from "@/components/AdminLayout";
import { requireUser } from "@/lib/guard";

export default async function DashboardLayout({ children }) {
  await requireUser("ADMIN");
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
