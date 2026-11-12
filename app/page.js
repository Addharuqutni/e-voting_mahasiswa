import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSessionUser } from "@/lib/guard";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "ADMIN" ? "/dashboard" : "/milih");

  return (
    <main className="login-page">
      <div className="login-bg" aria-hidden="true" />
      <section className="login-card" aria-labelledby="login-title">
        <img src="/assets/img/pemira-logo.webp?v=2" alt="Logo Pemilihan Raya" className="login-logo" width="186" height="222" fetchPriority="high" />
        <h1 id="login-title">Selamat Datang</h1>
        <p className="login-sub">Silakan masuk untuk melanjutkan</p>
        <LoginForm />
        <p className="login-foot">
          © {new Date().getFullYear()} - S1 Teknik Telekomunikasi supported by{" "}
          <a href="https://kodenara.id" target="_blank" rel="noopener noreferrer">Kodenara.id</a>
        </p>
      </section>
    </main>
  );
}
